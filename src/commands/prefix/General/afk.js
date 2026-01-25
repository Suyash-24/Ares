import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

const buildAfkSetContainer = (reason) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afk || '💤'} AFK Set`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(
        reason ? `**Reason:** ${reason}` : `You are now AFK.`
    ));
    return container;
};

const buildAfkRemovedContainer = (duration, mentionsCount) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afkremoved || '👋'} Welcome Back!`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    let content = `You were AFK for **${duration}**`;
    if (mentionsCount > 0) {
        content += `\nYou received **${mentionsCount}** mention${mentionsCount > 1 ? 's' : ''}. Use \`.afk mentions\` to view.`;
    }
    container.addTextDisplayComponents(td => td.setContent(content));
    return container;
};

const buildMentionsContainer = (mentions, page = 1) => {
    const perPage = 5;
    const totalPages = Math.ceil(mentions.length / perPage) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * perPage;
    const pageItems = mentions.slice(start, start + perPage);

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afk || '💤'} AFK Mentions`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    if (pageItems.length === 0) {
        container.addTextDisplayComponents(td => td.setContent('No mentions while you were AFK.'));
    } else {
        pageItems.forEach((m, i) => {
            const time = formatDuration(Date.now() - m.timestamp);
            let content = `${start + i + 1}. <@${m.userId}> in <#${m.channelId}> (${time} ago)`;
            if (m.messageUrl) {
                content += `\n-# [Go to Message](${m.messageUrl})`;
            }
            container.addTextDisplayComponents(td => td.setContent(content));

            if (i < pageItems.length - 1) {
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(false));
            }
        });

        if (totalPages > 1) {
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

            const prevBtn = new ButtonBuilder()
                .setCustomId(`afk_mentions_${safePage - 1}`)
                .setLabel('◀ Prev')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(safePage <= 1);

            const pageBtn = new ButtonBuilder()
                .setCustomId('afk_mentions_page')
                .setLabel(`${safePage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const nextBtn = new ButtonBuilder()
                .setCustomId(`afk_mentions_${safePage + 1}`)
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(safePage >= totalPages);

            container.addActionRowComponents(row => row.addComponents(prevBtn, pageBtn, nextBtn));
        }
    }

    return container;
};

export default {
    name: 'afk',
    description: 'Set your AFK status',
    usage: '.afk [reason]\n.afk remove @user\n.afk mentions',
    category: 'General',

    async execute(message, args) {
        const { client, guild, member, author } = message;
        const guildId = guild.id;
        const userId = author.id;

        const guildData = await client.db.findOne({ guildId }) || {};
        const afkUsers = guildData.afkUsers || {};

        if (args[0]?.toLowerCase() === 'remove') {

            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return message.reply({
                    content: '❌ You need **Manage Messages** permission to remove someone\'s AFK.',
                    allowedMentions: { repliedUser: false }
                });
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply({
                    content: '❌ Please mention a user to remove their AFK.',
                    allowedMentions: { repliedUser: false }
                });
            }

            if (!afkUsers[targetUser.id]) {
                return message.reply({
                    content: `❌ <@${targetUser.id}> is not AFK.`,
                    allowedMentions: { repliedUser: false, users: [] }
                });
            }

            const afkData = afkUsers[targetUser.id];
            try {
                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                if (targetMember && afkData.originalNickname !== undefined) {
                    await targetMember.setNickname(afkData.originalNickname || null).catch(() => {});
                }
            } catch (e) {}

            delete afkUsers[targetUser.id];
            await client.db.updateOne(
                { guildId },
                { $set: { afkUsers } },
                { upsert: true }
            );

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afkremoved || '👋'} AFK Removed`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`Removed AFK status from <@${targetUser.id}>.`));

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, users: [] }
            });
        }

        if (args[0]?.toLowerCase() === 'mentions') {
            const myAfk = afkUsers[userId];
            const mentions = myAfk?.mentions || [];

            const storedData = guildData.afkMentionsHistory?.[userId];
            let storedMentions = [];

            if (storedData) {
                const thirtyMinutes = 30 * 60 * 1000;
                const storedAt = storedData.storedAt || 0;

                if (Date.now() - storedAt < thirtyMinutes) {
                    storedMentions = storedData.mentions || [];
                } else {

                    await client.db.updateOne(
                        { guildId },
                        { $unset: { [`afkMentionsHistory.${userId}`]: '' } }
                    );
                }
            }

            const allMentions = [...mentions, ...storedMentions].sort((a, b) => b.timestamp - a.timestamp);

            const container = buildMentionsContainer(allMentions);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const reason = args.join(' ') || null;

        let originalNickname = member.nickname;

        try {
            const newNickname = `[AFK] ${member.displayName}`.slice(0, 32);
            if (member.manageable && !member.displayName.startsWith('[AFK]')) {
                await member.setNickname(newNickname).catch(() => {});
            }
        } catch (e) {}

        afkUsers[userId] = {
            reason,
            timestamp: Date.now(),
            originalNickname,
            mentions: []
        };

        await client.db.updateOne(
            { guildId },
            { $set: { afkUsers } },
            { upsert: true }
        );

        const container = buildAfkSetContainer(reason);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};

export { formatDuration, buildAfkRemovedContainer };
