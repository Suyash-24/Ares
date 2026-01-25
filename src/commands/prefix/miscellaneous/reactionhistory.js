import { PermissionFlagsBits, ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { getReactionHistory } from '../../../utils/snipeCache.js';

export default {
    name: 'reactionhistory',
    description: 'See logged reactions for a message',
    category: 'Miscellaneous',
    aliases: ['rh', 'reactions'],
    usage: 'reactionhistory <messagelink|messageid>',
    async execute(message, args, client) {

        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} You need **Manage Messages** permission to use this.`));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        if (!args[0]) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.error} Please provide a message link or message ID.\n\n` +
                    `**Usage:** \`.reactionhistory <messagelink|messageid>\`\n` +
                    `**Examples:**\n` +
                    `> \`.rh 1234567890123456789\`\n` +
                    `> \`.rh https://discord.com/channels/.../.../.../\``
                ));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        let messageId;
        let messageUrl;

        const linkRegex = /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = args[0].match(linkRegex);

        if (match) {

            const [, guildId, channelId, msgId] = match;

            if (guildId !== message.guild.id) {
                const c = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} That message is from a different server.`));
                return message.reply({
                    components: [c],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }

            messageId = msgId;
            messageUrl = args[0];
        } else if (/^\d{17,20}$/.test(args[0])) {

            messageId = args[0];

            messageUrl = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${messageId}`;
        } else {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.error} Invalid format. Please provide a valid message link or message ID.\n\n` +
                    `**Examples:**\n` +
                    `> \`.rh 1234567890123456789\`\n` +
                    `> \`.rh https://discord.com/channels/.../.../.../\``
                ));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        const history = getReactionHistory(messageId);

        if (history.length === 0) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.error} No reaction history found for that message.\n\n` +
                    `-# Only reactions added/removed after the bot started are tracked.`
                ));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        const jumpUrl = history[0]?.messageUrl || messageUrl;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.chart || '📊'} Reaction History`))
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        container.addTextDisplayComponents(t => t.setContent(
            `${EMOJIS.trending || '🔗'} **[Jump to Message](${jumpUrl})**\n` +
            `${EMOJIS.stats || '📈'} **Total Events:** ${history.length}`
        ));

        const displayHistory = history.slice(0, 15).map(entry => {
            const action = entry.action === 'add'
                ? `${EMOJIS.success || '✅'} Added`
                : `${EMOJIS.error || '❌'} Removed`;
            const time = `<t:${Math.floor(entry.timestamp / 1000)}:R>`;
            return `> ${entry.emoji} ${action} by **${entry.user.username}** ${time}`;
        }).join('\n');

        container
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent(
                `${EMOJIS.logMessage || '📜'} **Timeline**\n${displayHistory}`
            ));

        if (history.length > 15) {
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(`-# ...and ${history.length - 15} more events`));
        }

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false, parse: [] }
        });
    }
};
