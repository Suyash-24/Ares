import { PermissionFlagsBits, ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { clearSnipeData, clearReactionHistory } from '../../../utils/snipeCache.js';

export default {
    name: 'clearsnipe',
    description: 'Clear all results for reactions, edits and messages',
    category: 'Miscellaneous',
    aliases: ['cs', 'clearsnipes'],
    usage: 'clearsnipe [channel]',
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

        let targetChannel = message.channel;
        let scope = 'channel';

        if (args[0]) {
            if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'server') {
                scope = 'server';
            } else {

                const channelMatch = args[0].match(/<#(\d+)>/) || args[0].match(/^(\d+)$/);
                if (channelMatch) {
                    targetChannel = message.guild.channels.cache.get(channelMatch[1]);
                    if (!targetChannel) {
                        const c = new ContainerBuilder()
                            .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Channel not found.`));
                        return message.reply({
                            components: [c],
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { repliedUser: false, parse: [] }
                        });
                    }
                }
            }
        }

        if (scope === 'channel') {
            clearSnipeData(message.guild.id, targetChannel.id);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.success} Snipe Data Cleared`))
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.channels || '📁'} **Channel**\n> ${targetChannel}\n\n` +
                    `${EMOJIS.logDelete || '🗑️'} Deleted messages, edits, and reaction removals have been cleared.`
                ));

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        } else {
            clearSnipeData(message.guild.id);
            clearReactionHistory();

            const container = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.success} Snipe Data Cleared`))
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.server || '🏠'} **Scope**\n> Entire Server\n\n` +
                    `${EMOJIS.logDelete || '🗑️'} All snipe data, reaction history, edits, and messages have been cleared.`
                ));

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }
    }
};
