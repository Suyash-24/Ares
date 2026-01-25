import { ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { getEditedMessages } from '../../../utils/snipeCache.js';

export default {
    name: 'editsnipe',
    description: 'Snipe the latest message that was edited',
    category: 'Miscellaneous',
    aliases: ['es', 'esnipe'],
    usage: 'editsnipe [index]',
    async execute(message, args, client) {
        const editedMsgs = getEditedMessages(message.guild.id, message.channel.id);

        if (editedMsgs.length === 0) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} No edited messages found in this channel.`));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        let index = 0;
        if (args[0]) {
            index = parseInt(args[0], 10) - 1;
            if (isNaN(index) || index < 0 || index >= editedMsgs.length) {
                const c = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Invalid index. Use a number between 1 and ${editedMsgs.length}.`));
                return message.reply({
                    components: [c],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }
        }

        const editedMsg = editedMsgs[index];
        const timestamp = Math.floor(editedMsg.timestamp / 1000);

        const escapeContent = (content) => content
            .replace(/@everyone/g, '@\u200beveryone')
            .replace(/@here/g, '@\u200bhere')
            .replace(/<@&?\d+>/g, match => `\`${match}\``);

        const oldContent = escapeContent(editedMsg.oldContent || '*Empty*');
        const newContent = escapeContent(editedMsg.newContent || '*Empty*');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.logEdit || '✏️'} Edited Message`))
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        container.addTextDisplayComponents(t => t.setContent(
            `${EMOJIS.members || '👤'} **Author**\n` +
            `> ${editedMsg.author.username} \`${editedMsg.author.id}\`\n\n` +
            `${EMOJIS.duration || '⏰'} **Edited**\n` +
            `> <t:${timestamp}:R>\n\n` +
            `${EMOJIS.trending || '🔗'} **[Jump to Message](${editedMsg.messageUrl})**`
        ));

        container
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent(
                `${EMOJIS.error || '❌'} **Before**\n` +
                `>>> ${oldContent}`
            ));

        container
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(t => t.setContent(
                `${EMOJIS.success || '✅'} **After**\n` +
                `>>> ${newContent}`
            ));

        if (editedMsgs.length > 1) {
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `-# 📋 Showing ${index + 1} of ${editedMsgs.length} • Use \`.editsnipe [1-${editedMsgs.length}]\` to view others`
                ));
        }

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false, parse: [] }
        });
    }
};
