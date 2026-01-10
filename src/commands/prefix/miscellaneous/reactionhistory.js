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
        // Check permissions
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
                    `> \`.rh https://discord.com/channels/123/456/789\``
                ));
            return message.reply({ 
                components: [c], 
                flags: MessageFlags.IsComponentsV2, 
                allowedMentions: { repliedUser: false, parse: [] } 
            });
        }

        let messageId;
        let messageUrl;

        // Check if it's a message link
        const linkRegex = /discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = args[0].match(linkRegex);

        if (match) {
            // It's a message link
            const [, guildId, channelId, msgId] = match;

            // Verify it's from this guild
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
            // It's a message ID (snowflake format: 17-20 digits)
            messageId = args[0];
            // Try to find the message URL from the current channel
            messageUrl = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${messageId}`;
        } else {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.error} Invalid format. Please provide a valid message link or message ID.\n\n` +
                    `**Examples:**\n` +
                    `> \`.rh 1234567890123456789\`\n` +
                    `> \`.rh https://discord.com/channels/123/456/789\``
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

        // Use the URL from history if available
        const jumpUrl = history[0]?.messageUrl || messageUrl;

        // Build the aesthetic container
        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.chart || '📊'} Reaction History`))
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        // Message info
        container.addTextDisplayComponents(t => t.setContent(
            `${EMOJIS.trending || '🔗'} **[Jump to Message](${jumpUrl})**\n` +
            `${EMOJIS.stats || '📈'} **Total Events:** ${history.length}`
        ));

        // Build history display (limit to 15 entries)
        // Using visible emojis: ✅ for added, ❌ for removed
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
