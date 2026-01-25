import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'noprefix';
const aliases = ['nop'];
const description = 'Manage no-prefix access for users, servers, or roles.';
const usage = 'noprefix <add|remove|list|status> <user|server|role> [target] [duration|lifetime]';
const category = 'Bot Owner';

const NOPREFIX_KEY = '_noprefix';
const LIFETIME = 9999999999999;

function parseDuration(str) {
    if (!str) return 90 * 24 * 60 * 60 * 1000;
    if (str.toLowerCase() === 'lifetime') return LIFETIME;
    const match = str.match(/^(\d+)d$/i);
    if (match) {
        return parseInt(match[1]) * 24 * 60 * 60 * 1000;
    }
    return null;
}

function formatDuration(ms) {
    if (ms >= LIFETIME - 1000000000) return '♾️ Lifetime';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? 's' : ''}`;
}

function formatExpiry(expiresAt) {
    if (expiresAt >= LIFETIME) return '♾️ Lifetime';
    const now = Date.now();
    if (expiresAt <= now) return '❌ Expired';
    const remaining = expiresAt - now;
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
}

function formatTimestamp(ts) {
    return `<t:${Math.floor(ts / 1000)}:R>`;
}

async function execute(message, args, client) {
    const container = new ContainerBuilder();

    const ownerIds = client.ownerIds || client.config?.ownerIds || [];
    const isBotOwner = ownerIds.includes(message.author.id) || client.application?.owner?.id === message.author.id;

    if (!isBotOwner) {
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Access Denied`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent('Only bot owners can use this command.'));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const action = args[0]?.toLowerCase();
    const type = args[1]?.toLowerCase();

    if (!action || !['add', 'remove', 'list', 'status'].includes(action)) {
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || '📋'} No-Prefix System`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
            '**➕ Add Access:**\n' +
            '```\n.noprefix add user <@user|id> [duration|lifetime]\n.noprefix add server [id] [duration|lifetime]\n.noprefix add role <@role|id> [duration|lifetime]\n```\n' +
            '**➖ Remove Access:**\n' +
            '```\n.noprefix remove user <@user|id>\n.noprefix remove server [id]\n.noprefix remove role <@role|id>\n```\n' +
            '**📊 Status Check:**\n' +
            '```\n.noprefix status user <@user|id>\n.noprefix status server [id]\n.noprefix status role <@role|id>\n```\n' +
            '**📋 List All:**\n' +
            '```\n.noprefix list\n```\n' +
            '> **Duration:** `30d`, `7d`, `lifetime` (default: 90d)'
        ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let npData = await client.db.findOne({ guildId: NOPREFIX_KEY }) || { guildId: NOPREFIX_KEY, users: [], servers: [], roles: [] };
    if (!npData.users) npData.users = [];
    if (!npData.servers) npData.servers = [];
    if (!npData.roles) npData.roles = [];

    const now = Date.now();
    npData.users = npData.users.filter(u => u.expiresAt > now || u.expiresAt >= LIFETIME);
    npData.servers = npData.servers.filter(s => s.expiresAt > now || s.expiresAt >= LIFETIME);
    npData.roles = npData.roles.filter(r => r.expiresAt > now || r.expiresAt >= LIFETIME);

    if (action === 'list') {
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || '📋'} No-Prefix Grants`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let content = '';

        if (ownerIds.length > 0) {
            content += '**👑 Bot Owners** *(auto-lifetime)*\n';
            for (const oid of ownerIds) {
                content += `> <@${oid}>\n`;
            }
            content += '\n';
        }

        if (npData.users.length > 0) {
            content += '**👤 Users**\n';
            for (const u of npData.users) {
                const status = formatExpiry(u.expiresAt);
                content += `> <@${u.id}> — ${status}\n`;
            }
            content += '\n';
        }

        if (npData.servers.length > 0) {
            content += '**🏠 Servers**\n';
            for (const s of npData.servers) {
                const guild = client.guilds.cache.get(s.id);
                const status = formatExpiry(s.expiresAt);
                content += `> ${guild?.name || s.id} — ${status}\n`;
            }
            content += '\n';
        }

        if (npData.roles.length > 0) {
            content += '**🎭 Roles**\n';
            for (const r of npData.roles) {
                const guild = client.guilds.cache.get(r.guildId);
                const role = guild?.roles.cache.get(r.roleId);
                const status = formatExpiry(r.expiresAt);
                content += `> ${role?.name || r.roleId} in *${guild?.name || r.guildId}* — ${status}\n`;
            }
        }

        if (!content) content = '*No active no-prefix grants.*';

        container.addTextDisplayComponents(td => td.setContent(content));
        await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (action === 'status') {
        if (!type || !['user', 'server', 'role'].includes(type)) {
            container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Type**`));
            container.addTextDisplayComponents(td => td.setContent('Usage: `.noprefix status <user|server|role> [target]`'));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        const targetArg = args[2];

        if (type === 'user') {
            const userId = targetArg ? targetArg.replace(/[<@!>]/g, '') : message.author.id;

            if ((client.ownerIds || ownerIds).includes(userId) || client.application?.owner?.id === userId) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '👑'} Bot Owner`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(
                    `**User:** <@${userId}>\n` +
                    `**Status:** ✅ Active\n` +
                    `**Duration:** ♾️ Lifetime\n` +
                    `**Reason:** Bot Owner (Automatic)`
                ));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const entry = npData.users.find(u => u.id === userId);
            if (entry && entry.expiresAt > now) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Active`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(
                    `**User:** <@${userId}>\n` +
                    `**Status:** ✅ Active\n` +
                    `**Expires:** ${formatExpiry(entry.expiresAt)}\n` +
                    `**Granted By:** <@${entry.grantedBy}>\n` +
                    `**Granted:** ${formatTimestamp(entry.grantedAt)}`
                ));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} No Access`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`<@${userId}> does not have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (type === 'server') {
            const serverId = targetArg || message.guildId;
            const guild = client.guilds.cache.get(serverId);
            const entry = npData.servers.find(s => s.id === serverId);

            if (entry && entry.expiresAt > now) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Active`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(
                    `**Server:** ${guild?.name || serverId}\n` +
                    `**Status:** ✅ Active\n` +
                    `**Expires:** ${formatExpiry(entry.expiresAt)}\n` +
                    `**Granted By:** <@${entry.grantedBy}>\n` +
                    `**Granted:** ${formatTimestamp(entry.grantedAt)}`
                ));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} No Access`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`**${guild?.name || serverId}** does not have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (type === 'role') {
            if (!targetArg) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing Role**`));
                container.addTextDisplayComponents(td => td.setContent('Please mention a role or provide its ID.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const roleId = targetArg.replace(/[<@&>]/g, '');
            const role = message.guild.roles.cache.get(roleId);
            const entry = npData.roles.find(r => r.guildId === message.guildId && r.roleId === roleId);

            if (entry && entry.expiresAt > now) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Active`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(
                    `**Role:** ${role?.name || roleId}\n` +
                    `**Status:** ✅ Active\n` +
                    `**Expires:** ${formatExpiry(entry.expiresAt)}\n` +
                    `**Granted By:** <@${entry.grantedBy}>\n` +
                    `**Granted:** ${formatTimestamp(entry.grantedAt)}`
                ));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} No Access`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`Role **${role?.name || roleId}** does not have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }

    if (!type || !['user', 'server', 'role'].includes(type)) {
        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Type**`));
        container.addTextDisplayComponents(td => td.setContent('Type must be `user`, `server`, or `role`.'));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (type === 'user') {
        const targetArg = args[2];
        const durationArg = args[3];

        if (action === 'add') {
            if (!targetArg) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing User**`));
                container.addTextDisplayComponents(td => td.setContent('Please mention a user or provide their ID.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const userId = targetArg.replace(/[<@!>]/g, '');
            const duration = parseDuration(durationArg);
            if (durationArg && duration === null) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Duration**`));
                container.addTextDisplayComponents(td => td.setContent('Duration format: `30d`, `7d`, `lifetime`'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const expiresAt = duration >= LIFETIME ? LIFETIME : now + duration;

            npData.users = npData.users.filter(u => u.id !== userId);
            npData.users.push({
                id: userId,
                expiresAt: expiresAt,
                grantedBy: message.author.id,
                grantedAt: now
            });

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Granted`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `**User:** <@${userId}>\n` +
                `**Duration:** ${expiresAt >= LIFETIME ? '♾️ Lifetime' : formatDuration(duration)}\n` +
                `**Granted By:** <@${message.author.id}>`
            ));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (action === 'remove') {
            if (!targetArg) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing User**`));
                container.addTextDisplayComponents(td => td.setContent('Please mention a user or provide their ID.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const userId = targetArg.replace(/[<@!>]/g, '');
            const existed = npData.users.some(u => u.id === userId);
            npData.users = npData.users.filter(u => u.id !== userId);

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            if (existed) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Revoked`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`<@${userId}>'s no-prefix access has been removed.`));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Not Found`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`<@${userId}> didn't have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }

    if (type === 'server') {
        const targetArg = args[2];
        const durationArg = args[3];

        if (action === 'add') {

            const isDurationArg = targetArg?.match(/^(\d+d|lifetime)$/i);
            const finalServerId = isDurationArg ? message.guildId : (targetArg || message.guildId);
            const duration = parseDuration(isDurationArg ? targetArg : durationArg);

            if ((isDurationArg ? null : durationArg) && duration === null) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Duration**`));
                container.addTextDisplayComponents(td => td.setContent('Duration format: `30d`, `7d`, `lifetime`'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const expiresAt = duration >= LIFETIME ? LIFETIME : now + duration;

            npData.servers = npData.servers.filter(s => s.id !== finalServerId);
            npData.servers.push({
                id: finalServerId,
                expiresAt: expiresAt,
                grantedBy: message.author.id,
                grantedAt: now
            });

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            const guild = client.guilds.cache.get(finalServerId);
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Granted`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `**Server:** ${guild?.name || finalServerId}\n` +
                `**Duration:** ${expiresAt >= LIFETIME ? '♾️ Lifetime' : formatDuration(duration)}\n` +
                `**Granted By:** <@${message.author.id}>`
            ));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (action === 'remove') {
            const finalServerId = targetArg || message.guildId;
            const existed = npData.servers.some(s => s.id === finalServerId);
            npData.servers = npData.servers.filter(s => s.id !== finalServerId);

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            const guild = client.guilds.cache.get(finalServerId);
            if (existed) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Revoked`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`**${guild?.name || finalServerId}**'s no-prefix access has been removed.`));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Not Found`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`**${guild?.name || finalServerId}** didn't have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }

    if (type === 'role') {
        const targetArg = args[2];
        const durationArg = args[3];

        if (action === 'add') {
            if (!targetArg) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing Role**`));
                container.addTextDisplayComponents(td => td.setContent('Please mention a role or provide its ID.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const roleId = targetArg.replace(/[<@&>]/g, '');
            const duration = parseDuration(durationArg);
            if (durationArg && duration === null) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Duration**`));
                container.addTextDisplayComponents(td => td.setContent('Duration format: `30d`, `7d`, `lifetime`'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const expiresAt = duration >= LIFETIME ? LIFETIME : now + duration;

            npData.roles = npData.roles.filter(r => !(r.guildId === message.guildId && r.roleId === roleId));
            npData.roles.push({
                guildId: message.guildId,
                roleId: roleId,
                expiresAt: expiresAt,
                grantedBy: message.author.id,
                grantedAt: now
            });

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            const role = message.guild.roles.cache.get(roleId);
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Granted`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `**Role:** ${role?.name || roleId}\n` +
                `**Duration:** ${expiresAt >= LIFETIME ? '♾️ Lifetime' : formatDuration(duration)}\n` +
                `**Granted By:** <@${message.author.id}>`
            ));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (action === 'remove') {
            if (!targetArg) {
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing Role**`));
                container.addTextDisplayComponents(td => td.setContent('Please mention a role or provide its ID.'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const roleId = targetArg.replace(/[<@&>]/g, '');
            const existed = npData.roles.some(r => r.guildId === message.guildId && r.roleId === roleId);
            npData.roles = npData.roles.filter(r => !(r.guildId === message.guildId && r.roleId === roleId));

            await client.db.updateOne({ guildId: NOPREFIX_KEY }, { $set: npData }, { upsert: true });

            const role = message.guild.roles.cache.get(roleId);
            if (existed) {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} No-Prefix Revoked`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`Role **${role?.name || roleId}**'s no-prefix access has been removed.`));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Not Found`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`Role **${role?.name || roleId}** didn't have no-prefix access.`));
            }
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }
}

export default { name, aliases, description, usage, execute, category };
