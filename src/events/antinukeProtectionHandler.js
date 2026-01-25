import { Events, AuditLogEvent, EmbedBuilder } from 'discord.js';
import { sendAntinukeLog } from '../utils/antinukeLogger.js';

const MODULE_MAP = {
    channelCreate: 'channel',
    channelDelete: 'channel',
    roleCreate: 'role',
    roleDelete: 'role',
    roleUpdate: 'permissions',
    memberBan: 'ban',
    memberKick: 'kick',
    webhookCreate: 'webhook',
    webhookDelete: 'webhook',
    botAdd: 'botadd',
    guildUpdate: 'vanity',
    emojiCreate: 'emoji',
    emojiDelete: 'emoji',
    memberPrune: 'prune',
    memberRoleUpdate: 'permissions'
};

const DANGEROUS_PERMISSIONS = [
    'Administrator', 'BanMembers', 'KickMembers', 'ManageGuild',
    'ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageEmojisAndStickers',
    'MentionEveryone', 'ModerateMembers'
];

const strikes = new Map();

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

function isModuleEnabled(guildData, eventType) {
    const module = MODULE_MAP[eventType];
    if (!module) return false;
    return guildData?.antinuke?.modules?.[module]?.enabled === true;
}

function getModuleConfig(guildData, eventType) {
    const module = MODULE_MAP[eventType];
    const defaultConfig = {
        threshold: guildData?.antinuke?.defaultThreshold || 3,
        punishment: guildData?.antinuke?.defaultPunishment || 'ban',
        window: guildData?.antinuke?.defaultWindow || 60
    };
    return guildData?.antinuke?.modules?.[module] || defaultConfig;
}

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

async function protocolUser(client, guild, member, reason, guildData) {
    try {
        const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id && r.editable);
        const removedRoles = rolesToRemove.map(r => r.id);

        const timeoutDuration = (guildData.antinuke.defaultPunishment === 'timeout'
            ? guildData.antinuke.timeoutDuration || 28 * 24 * 60 * 60 * 1000
            : 28 * 24 * 60 * 60 * 1000);

        await member.roles.remove(rolesToRemove, reason);

        await member.timeout(timeoutDuration, reason);

        if (!guildData.antinuke.protocol) guildData.antinuke.protocol = [];

        const existing = guildData.antinuke.protocol.find(p => p.id === member.id);
        if (existing) {
            existing.roles = [...new Set([...existing.roles, ...removedRoles])];
        } else {
            guildData.antinuke.protocol.push({
                id: member.id,
                roles: removedRoles,
                by: client.user.id,
                at: Date.now(),
                reason
            });
        }

        await client.db.updateOne(
            { guildId: guild.id },
            { $set: { antinuke: guildData.antinuke } },
            { upsert: true }
        );

        await sendAntinukeLog(client, guildData, guild, {
            eventType: 'protocol',
            executor: { id: client.user.id, tag: client.user.tag },
            target: `${member.user.tag}\n(ID: ${member.id})`,
            reason,
            success: true
        });

        return { success: true, rolesRemoved: removedRoles.length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function executePunishment(client, guild, executorId, punishment, reason, guildData) {
    const member = await guild.members.fetch(executorId).catch(() => null);

    try {
        switch (punishment) {
            case 'ban':
                await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
                await sendAntinukeLog(client, guildData, guild, {
                    eventType: 'ban',
                    executor: { id: executorId, tag: member?.user?.tag || 'Unknown User' },
                    target: 'N/A',
                    details: reason,
                    punishment: 'Ban',
                    punished: true,
                    success: true
                });
                return { action: 'Banned', success: true };

            case 'kick':
                if (member) {
                    await member.kick(reason);
                    await sendAntinukeLog(client, guildData, guild, {
                        eventType: 'kick',
                        executor: { id: executorId, tag: member.user.tag },
                        target: 'N/A',
                        details: reason,
                        punishment: 'Kick',
                        punished: true,
                        success: true
                    });
                }
                return { action: 'Kicked', success: !!member };

            case 'strip':
                if (member) {
                    const roles = member.roles.cache.filter(r => r.id !== guild.id && r.editable);
                    await member.roles.remove(roles, reason);
                    await sendAntinukeLog(client, guildData, guild, {
                        eventType: 'permissions',
                        executor: { id: executorId, tag: member.user.tag },
                        target: 'All roles',
                        details: `${reason}\n\nRoles removed: ${roles.size}`,
                        punishment: 'Strip Roles',
                        punished: true,
                        success: true
                    });
                }
                return { action: 'Stripped roles', success: !!member };

            case 'timeout':
                if (member) {
                    await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
                    await sendAntinukeLog(client, guildData, guild, {
                        eventType: 'permissions',
                        executor: { id: executorId, tag: member.user.tag },
                        target: 'N/A',
                        details: reason,
                        punishment: 'Timeout (28 days)',
                        punished: true,
                        success: true
                    });
                }
                return { action: 'Timed out (28 days)', success: !!member };

            case 'protocol':
                if (member) {
                    const result = await protocolUser(client, guild, member, reason, guildData);
                    return { action: 'Protocol Applied', success: result.success };
                }
                return { action: 'Protocol failed', success: false };

            default:
                await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
                await sendAntinukeLog(client, guildData, guild, {
                    eventType: 'ban',
                    executor: { id: executorId, tag: member?.user?.tag || 'Unknown User' },
                    target: 'N/A',
                    details: reason,
                    punishment: 'Ban (default)',
                    punished: true,
                    success: true
                });
                return { action: 'Banned (default)', success: true };
        }
    } catch (e) {
        console.error(`[Antinuke] Punishment failed:`, e.message);
        return { action: punishment, success: false, error: e.message };
    }
}

async function handleStrike(client, guild, executorId, executorTag, eventType, guildData, details = '') {
    const config = getModuleConfig(guildData, eventType);
    const module = MODULE_MAP[eventType];

    const guildKey = guild.id;
    if (!strikes.has(guildKey)) strikes.set(guildKey, new Map());
    const guildStrikes = strikes.get(guildKey);
    if (!guildStrikes.has(executorId)) guildStrikes.set(executorId, {});
    const userStrikes = guildStrikes.get(executorId);

    const now = Date.now();
    if (!userStrikes[module]) {
        userStrikes[module] = { count: 0, timestamps: [] };
    }

    const windowMs = (config.window || 60) * 1000;
    userStrikes[module].timestamps = userStrikes[module].timestamps.filter(t => now - t < windowMs);
    userStrikes[module].timestamps.push(now);
    userStrikes[module].count = userStrikes[module].timestamps.length;

    const count = userStrikes[module].count;

    console.log(`[Antinuke] Strike ${count}/${config.threshold} for ${executorTag} (${module})`);

    if (count < config.threshold) {
        await sendAntinukeLog(client, guildData, guild, {
            eventType: 'strike',
            executor: { id: executorId, tag: executorTag },
            action: module.toUpperCase(),
            details,
            strikes: count,
            threshold: config.threshold
        });
    }

    if (count >= config.threshold) {
        console.log(`[Antinuke] Threshold reached - executing ${config.punishment} on ${executorTag}`);

        const reason = `[Antinuke] ${module} protection triggered (${count}/${config.threshold} actions in ${config.window}s)`;
        const result = await executePunishment(client, guild, executorId, config.punishment, reason, guildData);

        userStrikes[module] = { count: 0, timestamps: [] };

        return { punished: true, ...result };
    }

    return { punished: false, strikes: count, threshold: config.threshold };
}

async function processEvent(client, guild, auditLogType, eventType, targetId = null, extraDetails = '') {
    const guildData = await client.db.findOne({ guildId: guild.id });

    if (!guildData?.antinuke?.enabled) return;
    if (!isModuleEnabled(guildData, eventType)) return;

    try {
        const auditEntry = await fetchAuditLog(guild, auditLogType, targetId);
        if (!auditEntry) return;

        const executor = auditEntry.executor;
        if (!executor) return;

        if (isWhitelisted(client, guild, executor.id, guildData)) return;

        const details = extraDetails || `Target: ${auditEntry.target?.name || auditEntry.target?.id || 'Unknown'}`;
        await handleStrike(client, guild, executor.id, executor.tag || executor.username, eventType, guildData, details);
    } catch (error) {
        console.error(`[Antinuke] Error in ${eventType} handler:`, error.message);
    }
}

export default (client) => {
    client.on(Events.ChannelDelete, async (channel) => {
        if (!channel.guild) return;
        await processEvent(client, channel.guild, AuditLogEvent.ChannelDelete, 'channelDelete',
            channel.id, `Channel: #${channel.name}`, 'Delete');
    });

    client.on(Events.ChannelCreate, async (channel) => {
        if (!channel.guild) return;
        await processEvent(client, channel.guild, AuditLogEvent.ChannelCreate, 'channelCreate',
            channel.id, `Channel: #${channel.name}`, 'Create');
    });

    client.on(Events.GuildRoleDelete, async (role) => {
        await processEvent(client, role.guild, AuditLogEvent.RoleDelete, 'roleDelete',
            role.id, `Role: @${role.name}\nMembers: ${role.members.size}`);
    });

    client.on(Events.GuildRoleCreate, async (role) => {
        await processEvent(client, role.guild, AuditLogEvent.RoleCreate, 'roleCreate',
            role.id, `Role: @${role.name}\nColor: ${role.hexColor}\nPosition: ${role.position}`);
    });

    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
        const oldPerms = oldRole.permissions;
        const newPerms = newRole.permissions;

        const addedDangerous = DANGEROUS_PERMISSIONS.filter(p =>
            !oldPerms.has(p) && newPerms.has(p)
        );

        if (addedDangerous.length === 0) return;

        await processEvent(client, newRole.guild, AuditLogEvent.RoleUpdate, 'roleUpdate',
            newRole.id, `Role: @${newRole.name}\nDangerous permissions added:\n• ${addedDangerous.join('\n• ')}\n\nMembers affected: ${newRole.members.size}`);
    });

    client.on(Events.GuildBanAdd, async (ban) => {
        await processEvent(client, ban.guild, AuditLogEvent.MemberBanAdd, 'memberBan',
            ban.user.id, `User: ${ban.user.tag} (${ban.user.id})\nReason: ${ban.reason || 'No reason provided'}`);
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        const guildData = await client.db.findOne({ guildId: member.guild.id });
        if (!guildData?.antinuke?.enabled) return;
        if (!isModuleEnabled(guildData, 'memberKick')) return;

        try {
            const auditEntry = await fetchAuditLog(member.guild, AuditLogEvent.MemberKick, member.id);
            if (!auditEntry) return;

            const executor = auditEntry.executor;
            if (!executor) return;
            if (isWhitelisted(client, member.guild, executor.id, guildData)) return;

            await handleStrike(client, member.guild, executor.id, executor.tag || executor.username,
                'memberKick', guildData, `User: ${member.user.tag} (${member.id})\nJoined: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
        } catch (e) {
            console.error('[Antinuke] Error in kick handler:', e.message);
        }
    });

    client.on(Events.WebhooksUpdate, async (channel) => {
        const guildData = await client.db.findOne({ guildId: channel.guild.id });
        if (!guildData?.antinuke?.enabled) return;
        if (!isModuleEnabled(guildData, 'webhookCreate')) return;

        try {
            const [createEntry, deleteEntry] = await Promise.all([
                fetchAuditLog(channel.guild, AuditLogEvent.WebhookCreate),
                fetchAuditLog(channel.guild, AuditLogEvent.WebhookDelete)
            ]);

            const auditEntry = createEntry || deleteEntry;
            if (!auditEntry) return;

            const executor = auditEntry.executor;
            if (!executor) return;
            if (isWhitelisted(client, channel.guild, executor.id, guildData)) return;

            const eventType = createEntry ? 'webhookCreate' : 'webhookDelete';
            await handleStrike(client, channel.guild, executor.id, executor.tag || executor.username,
                eventType, guildData, `Channel: #${channel.name}\nWebhook: ${auditEntry.target?.name || 'Unknown'}`);
        } catch (e) {
            console.error('[Antinuke] Error in webhook handler:', e.message);
        }
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        if (!member.user.bot) return;

        const guildData = await client.db.findOne({ guildId: member.guild.id });
        if (!guildData?.antinuke?.enabled) return;

        try {
            const auditEntry = await fetchAuditLog(member.guild, AuditLogEvent.BotAdd, member.id);
            if (!auditEntry) return;

            const executor = auditEntry.executor;
            if (!executor) return;

            const isWhitelistedUser = isWhitelisted(client, member.guild, executor.id, guildData);
            const strictBotVerification = guildData.antinuke?.strictBotVerification !== false;
            const isBotVerified = member.user.flags?.has('VerifiedBot') || false;

            if (strictBotVerification && !isBotVerified) {
                try {
                    await member.kick('[Antinuke] Unverified bot blocked by strict verification');
                    console.log(`[Antinuke] Kicked unverified bot: ${member.user.tag} (added by ${executor.tag})`);

                    await sendAntinukeLog(client, guildData, member.guild, {
                        eventType: 'botadd',
                        executor: { id: executor.id, tag: executor.tag || executor.username },
                        target: `${member.user.tag} (${member.id})`,
                        details: `❌ Unverified bot blocked\n\n⚠️ Strict verification is enabled\nAdded by: ${executor.tag}${isWhitelistedUser ? ' (Whitelisted)' : ''}\n\n✅ Bot was automatically removed`,
                        action: 'UNVERIFIED_BOT_BLOCKED',
                        strikes: 0,
                        threshold: 0
                    });

                    if (!isWhitelistedUser && isModuleEnabled(guildData, 'botAdd')) {
                        await handleStrike(client, member.guild, executor.id, executor.tag || executor.username,
                            'botAdd', guildData, `Unverified bot: ${member.user.tag} (${member.id})`);
                    }
                } catch (e) {
                    await sendAntinukeLog(client, guildData, member.guild, {
                        eventType: 'botadd',
                        executor: { id: executor.id, tag: executor.tag || executor.username },
                        target: `${member.user.tag} (${member.id})`,
                        details: `❌ Failed to remove unverified bot\n\nAdded by: ${executor.tag}${isWhitelistedUser ? ' (Whitelisted)' : ''}`,
                        action: 'UNVERIFIED_BOT_BLOCKED',
                        strikes: 0,
                        threshold: 0
                    });
                }
                return;
            }

            if (isWhitelistedUser) return;

            if (!isModuleEnabled(guildData, 'botAdd')) return;

            try {
                await member.kick('[Antinuke] Unauthorized bot addition');
                console.log(`[Antinuke] Kicked unauthorized bot: ${member.user.tag}`);

                await sendAntinukeLog(client, guildData, member.guild, {
                    eventType: 'botadd',
                    executor: { id: executor.id, tag: executor.tag || executor.username },
                    target: `${member.user.tag} (${member.id})`,
                    details: `✅ Bot was automatically removed\n\nAdded by: ${executor.tag}`,
                    action: 'BOT_ADD',
                    strikes: 0,
                    threshold: 0
                });
            } catch (e) {
                await sendAntinukeLog(client, guildData, member.guild, {
                    eventType: 'botadd',
                    executor: { id: executor.id, tag: executor.tag || executor.username },
                    target: `${member.user.tag} (${member.id})`,
                    details: `❌ Failed to remove bot\n\nAdded by: ${executor.tag}`,
                    action: 'BOT_ADD',
                    strikes: 0,
                    threshold: 0
                });
            }

            await handleStrike(client, member.guild, executor.id, executor.tag || executor.username,
                'botAdd', guildData, `Bot: ${member.user.tag} (${member.id})\nPermissions: ${member.permissions.toArray().length} perms`);
        } catch (e) {
            console.error('[Antinuke] Error in bot add handler:', e.message);
        }
    });

    client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
        const vanityChanged = oldGuild.vanityURLCode !== newGuild.vanityURLCode;
        const nameChanged = oldGuild.name !== newGuild.name;
        const iconChanged = oldGuild.icon !== newGuild.icon;

        if (!vanityChanged && !nameChanged && !iconChanged) return;

        const guildData = await client.db.findOne({ guildId: newGuild.id });
        if (!guildData?.antinuke?.enabled) return;
        if (!isModuleEnabled(guildData, 'guildUpdate')) return;

        try {
            const auditEntry = await fetchAuditLog(newGuild, AuditLogEvent.GuildUpdate);
            if (!auditEntry) return;

            const executor = auditEntry.executor;
            if (!executor) return;

            let details = [];
            if (vanityChanged) details.push(`Vanity: ${oldGuild.vanityURLCode || 'none'} → ${newGuild.vanityURLCode || 'none'}`);
            if (nameChanged) details.push(`Name: ${oldGuild.name} → ${newGuild.name}`);
            if (iconChanged) details.push('Icon changed');

            if (isWhitelisted(client, newGuild, executor.id, guildData)) return;

            await handleStrike(client, newGuild, executor.id, executor.tag || executor.username,
                'guildUpdate', guildData, details.join('\n'));
        } catch (e) {
            console.error('[Antinuke] Error in guild update handler:', e.message);
        }
    });

    client.on(Events.GuildEmojiDelete, async (emoji) => {
        await processEvent(client, emoji.guild, AuditLogEvent.EmojiDelete, 'emojiDelete',
            emoji.id, `Emoji: :${emoji.name}:\nID: ${emoji.id}\nAnimated: ${emoji.animated ? 'Yes' : 'No'}`);
    });

    client.on(Events.GuildEmojiCreate, async (emoji) => {
        await processEvent(client, emoji.guild, AuditLogEvent.EmojiCreate, 'emojiCreate',
            emoji.id, `Emoji: :${emoji.name}:\nID: ${emoji.id}\nAnimated: ${emoji.animated ? 'Yes' : 'No'}`);
    });

    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const guildData = await client.db.findOne({ guildId: newMember.guild.id });

        const isInProtocol = guildData?.antinuke?.protocol?.some(p => p.id === newMember.id);
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));

        if (isInProtocol && addedRoles.size > 0) {
            try {
                const auditEntry = await fetchAuditLog(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
                if (auditEntry) {
                    const executor = auditEntry.executor;
                    if (executor && !isWhitelisted(client, newMember.guild, executor.id, guildData)) {
                        const reason = `[Antinuke Protocol Hold] Attempted to modify protocol user: ${newMember.user.tag}`;
                        const result = await executePunishment(client, newMember.guild, executor.id,
                            guildData.antinuke.defaultPunishment || 'kick', reason, guildData);

                        await sendAntinukeLog(client, guildData, newMember.guild, {
                            eventType: 'protocolHold',
                            executor: { id: executor.id, tag: executor.tag || executor.username },
                            target: `${newMember.user.tag}\n(ID: ${newMember.id})`,
                            punishment: result.action,
                            success: result.success
                        });

                        await newMember.roles.remove(addedRoles).catch(() => {});
                    }
                }
            } catch (e) {}
            return;
        }

        if (addedRoles.size === 0) return;

        const dangerousAdded = addedRoles.filter(r =>
            DANGEROUS_PERMISSIONS.some(p => r.permissions.has(p))
        );

        if (dangerousAdded.size === 0) return;

        if (!guildData?.antinuke?.enabled) return;
        if (!isModuleEnabled(guildData, 'memberRoleUpdate')) return;

        try {
            const auditEntry = await fetchAuditLog(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
            if (!auditEntry) return;

            const executor = auditEntry.executor;
            if (!executor) return;
            if (isWhitelisted(client, newMember.guild, executor.id, guildData)) return;

            await handleStrike(client, newMember.guild, executor.id, executor.tag || executor.username,
                'memberRoleUpdate', guildData,
                `User: ${newMember.user.tag} (${newMember.id})\nDangerous roles added:\n• ${dangerousAdded.map(r => r.name).join('\n• ')}`);
        } catch (e) {
            console.error('[Antinuke] Error in member role update handler:', e.message);
        }
    });

    setInterval(() => {
        const now = Date.now();
        const maxAge = 300000;

        for (const [guildId, guildStrikes] of strikes.entries()) {
            for (const [userId, userStrikes] of guildStrikes.entries()) {
                let hasActiveStrikes = false;

                for (const [module, data] of Object.entries(userStrikes)) {
                    if (data.timestamps) {
                        data.timestamps = data.timestamps.filter(t => now - t < maxAge);
                        data.count = data.timestamps.length;
                        if (data.count > 0) hasActiveStrikes = true;
                    }
                }

                if (!hasActiveStrikes) {
                    guildStrikes.delete(userId);
                }
            }

            if (guildStrikes.size === 0) {
                strikes.delete(guildId);
            }
        }
    }, 60000);

    console.log('[Antinuke] Enhanced protection handlers loaded');
};
