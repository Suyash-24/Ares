import { ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { getRemovedReactions } from '../../../utils/snipeCache.js';

export default {
    name: 'reactionsnipe',
    description: 'Snipe the latest reaction that was removed',
    category: 'Miscellaneous',
    aliases: ['rs', 'rsnipe'],
    usage: 'reactionsnipe',
    async execute(message, args, client) {
        const removedReactions = getRemovedReactions(message.guild.id, message.channel.id);

        if (removedReactions.length === 0) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} No removed reactions found in this channel.`));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        const reaction = removedReactions[0];
        const timestamp = Math.floor(reaction.timestamp / 1000);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.logEmoji || '😶'} Reaction Removed`))
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        container.addTextDisplayComponents(t => t.setContent(
            `${EMOJIS.members || '👤'} **User**\n` +
            `> ${reaction.user.username} \`${reaction.user.id}\`\n\n` +
            `${EMOJIS.logEmoji || '😀'} **Emoji**\n` +
            `> ${reaction.emoji}\n\n` +
            `${EMOJIS.duration || '⏰'} **Removed**\n` +
            `> <t:${timestamp}:R>\n\n` +
            `${EMOJIS.trending || '🔗'} **[Jump to Message](${reaction.messageUrl})**`
        ));

        if (removedReactions.length > 1) {
            const recentList = removedReactions.slice(1, 6).map((r, i) =>
                `> ${i + 2}. ${r.emoji} by **${r.user.username}** <t:${Math.floor(r.timestamp / 1000)}:R>`
            ).join('\n');

            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.chart || '📊'} **Recent Removals**\n${recentList}`
                ));
        }

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false, parse: [] }
        });
    }
};
