import { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ChannelType } from 'discord.js';
import EMOJIS from '../utils/emojis.js';
import { getDefaultConfig } from '../commands/prefix/Anti Raid/antiraid.js';

const joinCache = new Map();

const getConfig = async (client, guildId) => {
    const data = await client.db.findOne({ guildId }) || {};
    return data.antiraid || null;
};

const saveConfig = async (client, guildId, config) => {
    await client.db.updateOne({ guildId }, { $set: { antiraid: config } }, { upsert: true });
};

const logAction = async (guild, config, title, description) => {
    if (!config.logChannel) return;

    const channel = guild.channels.cache.get(config.logChannel);
    if (!channel) return;

    try {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.antiraidemoji || '🛡️'} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
        console.error('[AntiRaid] Log failed:', e);
    }
};

const lockAllChannels = async (guild, client) => {
    try {
        const textChannels = guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.SendMessages)
        );

        for (const [, channel] of textChannels) {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false
            }, { reason: 'AntiRaid: Mass join detected - Emergency lockdown' }).catch(() => {});
        }

        return textChannels.size;
    } catch (e) {
        console.error('[AntiRaid] Lock failed:', e);
        return 0;
    }
};

const punishMember = async (member, action, reason) => {
    try {
        if (action === 'ban' && member.bannable) {
            await member.ban({ reason, deleteMessageSeconds: 86400 });
            return true;
        } else if (action === 'kick' && member.kickable) {
            await member.kick(reason);
            return true;
        }
    } catch (e) {
        console.error('[AntiRaid] Punish failed:', e);
    }
    return false;
};

export default function registerAntiraidHandler(client) {
    client.on(Events.GuildMemberAdd, async (member) => {
        if (member.user.bot) return;

        const config = await getConfig(client, member.guild.id);
        if (!config || !config.enabled) return;

        const guildId = member.guild.id;
        const userId = member.id;

        if (config.whitelist && config.whitelist.includes(userId)) {

            config.whitelist = config.whitelist.filter(id => id !== userId);
            await saveConfig(client, guildId, config);
            await logAction(member.guild, config, 'Whitelist Bypass',
                `**User:** ${member.user.tag} (${member.id})\n` +
                `**Action:** Allowed to join (whitelisted)\n` +
                `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            );
            return;
        }

        let violated = false;
        let violationReason = '';

        if (!violated && config.avatar?.enabled) {
            if (!member.user.avatar) {
                violated = true;
                violationReason = 'No avatar';
                const punished = await punishMember(member, config.avatar.action, 'AntiRaid: No avatar');
                if (punished) {
                    await logAction(member.guild, config, 'Avatar Check Violation',
                        `**User:** ${member.user.tag} (${member.id})\n` +
                        `**Reason:** No profile picture\n` +
                        `**Action:** ${config.avatar.action}\n` +
                        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    );
                }
            }
        }

        if (!violated && config.newaccounts?.enabled) {
            const accountAge = Date.now() - member.user.createdTimestamp;
            const minAgeDays = config.newaccounts.threshold || 7;
            const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

            if (accountAge < minAgeMs) {
                violated = true;
                violationReason = 'Account too new';
                const punished = await punishMember(member, config.newaccounts.action, `AntiRaid: Account younger than ${minAgeDays} days`);
                if (punished) {
                    const ageInDays = Math.floor(accountAge / (24 * 60 * 60 * 1000));
                    await logAction(member.guild, config, 'New Account Violation',
                        `**User:** ${member.user.tag} (${member.id})\n` +
                        `**Account Age:** ${ageInDays} days\n` +
                        `**Required:** ${minAgeDays} days\n` +
                        `**Action:** ${config.newaccounts.action}\n` +
                        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    );
                }
            }
        }

        if (!violated && config.raidState) {
            violated = true;
            violationReason = 'Raid mode active';
            const action = config.massjoin?.action || 'kick';
            const punished = await punishMember(member, action, 'AntiRaid: Server in raid mode');
            if (punished) {
                await logAction(member.guild, config, 'Raid Mode Enforcement',
                    `**User:** ${member.user.tag} (${member.id})\n` +
                    `**Reason:** Server is in raid mode\n` +
                    `**Action:** ${action}\n` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                );
            }
        }

        if (!violated && config.massjoin?.enabled) {
            const now = Date.now();
            const window = 10000;
            const threshold = config.massjoin.threshold || 5;

            if (!joinCache.has(guildId)) {
                joinCache.set(guildId, []);
            }

            const joins = joinCache.get(guildId);
            joins.push(now);

            const recentJoins = joins.filter(t => now - t < window);
            joinCache.set(guildId, recentJoins);

            if (recentJoins.length >= threshold && !config.raidState) {

                config.raidState = true;
                await saveConfig(client, guildId, config);

                let lockedCount = 0;
                if (config.massjoin.lockChannels) {
                    lockedCount = await lockAllChannels(member.guild, client);
                }

                await logAction(member.guild, config, '🚨 RAID DETECTED',
                    `**Threshold Exceeded:** ${recentJoins.length} joins in 10 seconds\n` +
                    `**Action:** Raid mode activated\n` +
                    `${lockedCount > 0 ? `**Channels Locked:** ${lockedCount}\n` : ''}` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                    `*Use \`.antiraid state\` to disable raid mode when the raid is over.*`
                );

                await punishMember(member, config.massjoin.action, 'AntiRaid: Mass join detected');
            }
        }
    });

    setInterval(() => {
        const now = Date.now();
        for (const [guildId, joins] of joinCache.entries()) {
            const filtered = joins.filter(t => now - t < 60000);
            if (filtered.length === 0) {
                joinCache.delete(guildId);
            } else {
                joinCache.set(guildId, filtered);
            }
        }
    }, 60000);
}
