import { ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { getDeletedMessages } from '../../../utils/snipeCache.js';

export default {
    name: 'snipe',
    description: 'Snipe the latest message that was deleted',
    category: 'Miscellaneous',
    aliases: ['s'],
    usage: 'snipe [index]',
    async execute(message, args, client) {
        const deletedMsgs = getDeletedMessages(message.guild.id, message.channel.id);

        if (deletedMsgs.length === 0) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} No deleted messages found in this channel.`));
            return message.reply({
                components: [c],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        let index = 0;
        if (args[0]) {
            index = parseInt(args[0], 10) - 1;
            if (isNaN(index) || index < 0 || index >= deletedMsgs.length) {
                const c = new ContainerBuilder()
                    .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Invalid index. Use a number between 1 and ${deletedMsgs.length}.`));
                return message.reply({
                    components: [c],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }
        }

        const snipedMsg = deletedMsgs[index];
        const timestamp = Math.floor(snipedMsg.timestamp / 1000);

        let contentDisplay = snipedMsg.content || '';

        contentDisplay = contentDisplay
            .replace(/@everyone/g, '@\u200beveryone')
            .replace(/@here/g, '@\u200bhere')
            .replace(/<@&?\d+>/g, match => `\`${match}\``);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(t => t.setContent(`## ${EMOJIS.logDelete || '🗑️'} Sniped Message`))
            .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        container.addTextDisplayComponents(t => t.setContent(
            `${EMOJIS.members || '👤'} **Author**\n` +
            `> ${snipedMsg.author.username} \`${snipedMsg.author.id}\`\n\n` +
            `${EMOJIS.duration || '⏰'} **Deleted**\n` +
            `> <t:${timestamp}:R>`
        ));

        if (contentDisplay) {
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.logMessage || '💬'} **Content**\n` +
                    `>>> ${contentDisplay}`
                ));
        }

        if (snipedMsg.attachments && snipedMsg.attachments.length > 0) {
            const attachmentList = snipedMsg.attachments.map(a => `> [${a.name}](${a.url})`).join('\n');
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.trending || '📎'} **Attachments**\n${attachmentList}`
                ));
        }

        if (snipedMsg.stickers && snipedMsg.stickers.length > 0) {
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `${EMOJIS.star || '🏷️'} **Stickers**\n> ${snipedMsg.stickers.join(', ')}`
                ));
        }

        if (deletedMsgs.length > 1) {
            container
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(t => t.setContent(
                    `-# 📋 Showing ${index + 1} of ${deletedMsgs.length} • Use \`.snipe [1-${deletedMsgs.length}]\` to view others`
                ));
        }

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false, parse: [] }
        });
    }
};
