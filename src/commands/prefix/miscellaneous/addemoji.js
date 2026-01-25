import { PermissionFlagsBits, parseEmoji, ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
    name: 'addemoji',
    description: 'Add an emoji to the server',
    category: 'Miscellaneous',
    aliases: ['ae', 'createemoji'],
    usage: 'addemoji <url|emoji> [name]',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} You need **Manage Emojis** permission to use this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} I need **Manage Emojis** permission to do this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        let url;
        let name;

        if (message.attachments.size > 0) {
            url = message.attachments.first().url;
            name = args[0] || 'uploaded_emoji';
        } else if (args[0]) {

            const customEmoji = parseEmoji(args[0]);
            if (customEmoji && customEmoji.id) {
                const extension = customEmoji.animated ? 'gif' : 'png';
                url = `https://cdn.discordapp.com/emojis/${customEmoji.id}.${extension}`;
                name = args[1] || customEmoji.name;
            } else {

                url = args[0];
                name = args[1] || 'custom_emoji';
            }
        } else {
             const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Please provide an emoji, URL, or attach an image.`));
             return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        try {
            const emoji = await message.guild.emojis.create({ attachment: url, name: name });
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.success} Added emoji ${emoji} with name **${emoji.name}**!`))
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        } catch (error) {
            console.error(error);
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to add emoji. Ensure the file is under 256kb and slot limits aren't reached.\nError: ${error.message}`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }
};
