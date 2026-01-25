import { AuditLogEvent } from 'discord.js';

async function fetchAuditLog(guild, type, targetId = null, limit = 5) {
    for (let i = 0; i < 3; i++) {
        try {
            const logs = await guild.fetchAuditLogs({ limit, type });
            if (logs?.entries?.size > 0) {
                for (const entry of logs.entries.values()) {
                    if (Date.now() - entry.createdTimestamp > 5000) continue;
                    if (targetId && entry.target?.id !== targetId) continue;
                    return entry;
                }
            }
            await new Promise(r => setTimeout(r, 100 * (i + 1)));
        } catch (e) {
            if (i === 2) return null;
        }
    }
    return null;
}

function isWhitelisted(client, guild, userId, guildData) {
    if (guild.ownerId === userId) return true;
    if (userId === client.user.id) return true;
    if (client.config?.owners && Array.isArray(client.config.owners) && client.config.owners.includes(userId)) return true;
    if (Array.isArray(guildData?.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(userId)) return true;
    if (Array.isArray(guildData?.antinuke?.whitelist) && guildData.antinuke.whitelist.includes(userId)) return true;
    if (Array.isArray(guildData?.antinuke?.admins)) {
        const isImmune = guildData.antinuke.admins.some(admin =>
            (typeof admin === 'string' ? false : admin.id === userId && admin.immune === true)
        );
        if (isImmune) return true;
    }
    return false;
}

async function sendLog(client, guildData, guild, executor, action, details, punishment) {
    const logChannelId = guildData?.antinuke?.logChannel;
    if (!logChannelId) return;

    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;

    try {
        const { EmbedBuilder } = await import('discord.js');
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🛡️ Antinuke Action')
            .addFields(
                { name: 'Executor', value: `<@${executor.id}> (${executor.tag})`, inline: true },
                { name: 'Action Detected', value: action, inline: true },
                { name: 'Punishment', value: punishment, inline: true },
                { name: 'Details', value: details || 'No additional details' }
            )
            .setTimestamp()
            .setFooter({ text: `User ID: ${executor.id}` });

        await channel.send({ embeds: [embed] });
    } catch (e) {}
}

async function executePunishment(client, guild, executorId, punishment, reason, guildData) {
    const member = await guild.members.fetch(executorId).catch(() => null);

    try {
        switch (punishment) {
            case 'ban':
                await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
                return { action: 'Banned', success: true };

            case 'kick':
                if (member) await member.kick(reason);
                return { action: 'Kicked', success: !!member };

            case 'timeout':
                if (member) await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
                return { action: 'Timed out (28 days)', success: !!member };

            default:
                await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
                return { action: 'Banned (default)', success: true };
        }
    } catch (e) {
        console.error(`[Antinuke Protocol Hold] Punishment failed:`, e.message);
        return { action: punishment, success: false, error: e.message };
    }
}

export default function registerRawEvent(client) {

    client.on('raw', async (packet) => {

        if (packet.t === 'GUILD_MEMBER_UPDATE') {
            try {
                const guildId = packet.d.guild_id;
                const userId = packet.d.user.id;

                const guild = client.guilds.cache.get(guildId);
                if (!guild) return;

                const guildData = await client.db.findOne({ guildId });
                if (!guildData?.antinuke?.enabled) return;

                const isInProtocol = guildData?.antinuke?.protocol?.some(p => p.id === userId);
                if (!isInProtocol) return;

                const oldTimeout = packet.d.communication_disabled_until;
                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) return;

                if (oldTimeout && !member.communicationDisabledUntil) {

                    const auditEntry = await fetchAuditLog(guild, AuditLogEvent.MemberUpdate, userId);
                    if (auditEntry) {
                        const executor = auditEntry.executor;
                        if (executor && !isWhitelisted(client, guild, executor.id, guildData)) {

                            const reason = `[Antinuke Protocol Hold] Attempted to remove timeout from protocol user: ${member.user.tag}`;
                            const result = await executePunishment(client, guild, executor.id,
                                guildData.antinuke.defaultPunishment || 'kick', reason, guildData);
                            await sendLog(client, guildData, guild, executor,
                                'Protocol Hold Violation', `Tried to remove timeout from ${member.user.tag}`, result.action);

                            const timeoutDuration = 28 * 24 * 60 * 60 * 1000;
                            await member.timeout(timeoutDuration, '[Antinuke] Protocol protection re-applied').catch(() => {});
                        }
                    }
                }
            } catch (e) {}
        }
    });
}
