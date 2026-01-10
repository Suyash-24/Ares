import { PermissionFlagsBits, parseEmoji, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType, ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

// Helper function to fetch image as buffer
async function fetchImageAsBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export default {
    name: 'steal',
    description: 'Steal an emoji or sticker from a message',
    category: 'Miscellaneous',
    aliases: ['yoink'],
    usage: 'steal [emoji] (or reply to a message)',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} You need **Manage Emojis/Stickers** permission to use this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        // 1. Direct Argument (Emoji)
        if (args[0]) {
            const customEmoji = parseEmoji(args[0]);
            if (customEmoji && customEmoji.id) {
                return addEmoji(message, customEmoji, args[1]);
            }
        }

        // 2. Reply Handling
        if (message.reference) {
            const repliedMessage = await message.fetchReference().catch(() => null);
            if (!repliedMessage) {
                const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Could not fetch the replied message.`));
                return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const targetContent = {
                stickers: repliedMessage.stickers,
                emojis: parseEmojisFromContent(repliedMessage.content),
                attachments: repliedMessage.attachments.filter(a => a.contentType?.startsWith('image/'))
            };

            // Case A: Reply has Stickers
            if (targetContent.stickers.size > 0) {
                const sticker = targetContent.stickers.first();
                // Ask to add as sticker or emoji (if supported format)
                return promptStickerOrEmoji(message, sticker.url, sticker.name, 'Sticker');
            }

            // Case B: Reply has Custom Emojis
            if (targetContent.emojis.length > 0) {
                // If only one, just add it. If multiple, maybe just take the first one or ask?
                // For simplicity, let's take the first one for now or loop?
                // User said "ask whether to add as sticker or emoji" generally for ambiguous cases,
                // but if it's an emoji being stolen, usually adding as emoji is the goal.
                // HOWEVER, the user specifically said: "replied to a sticker or emoji ... first ask whether to add as sticker or emoji"
                const emoji = targetContent.emojis[0];
                 const extension = emoji.animated ? 'gif' : 'png';
                 const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}`;
                 return promptStickerOrEmoji(message, url, emoji.name, 'Emoji');
            }

             // Case C: Reply has Image Attachment
            if (targetContent.attachments.size > 0) {
                const attachment = targetContent.attachments.first();
                return promptStickerOrEmoji(message, attachment.url, 'stolen_image', 'Image');
            }
            
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} No stealable content found in the replied message.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Please provide an emoji or reply to a message containing an emoji/sticker/image.`));
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
};

function parseEmojisFromContent(content) {
    const regex = /<(a?):(\w+):(\d+)>/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push({ animated: match[1] === 'a', name: match[2], id: match[3] });
    }
    return matches;
}

async function promptStickerOrEmoji(message, url, name, sourceType) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('steal_add_emoji')
                .setLabel('Add as Emoji')
                .setEmoji('😀')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('steal_add_sticker')
                .setLabel('Add as Sticker')
                .setEmoji('🏷️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('steal_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );

    // Build the container with MediaGallery for image preview (Components V2 compatible)
    const container = new ContainerBuilder()
        .addTextDisplayComponents(t => t.setContent(`### ${EMOJIS.search || '🔍'} Found **${sourceType}**\n${EMOJIS.arrow || '⬇️'} Select an option below to add it.`))
        .addMediaGalleryComponents(gallery => 
            gallery.addItems(new MediaGalleryItemBuilder().setURL(url))
        )
        .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(row);

    const reply = await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
    });


    const filter = i => i.user.id === message.author.id;
    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 30000 });

    collector.on('collect', async i => {
        try {
            if (i.customId === 'steal_cancel') {
                const cancelContainer = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Operation cancelled.`));
                await i.update({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                return;
            }

            if (i.customId === 'steal_add_emoji') {
                await i.deferUpdate();
                try {
                    const emoji = await message.guild.emojis.create({ attachment: url, name: name });
                    const successContainer = new ContainerBuilder()
                         .addTextDisplayComponents(t => t.setContent(`${EMOJIS.success} Added emoji ${emoji} (**${emoji.name}**)`));
                    await i.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                } catch (err) {
                     const errorContainer = new ContainerBuilder()
                         .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to add emoji: ${err.message}`));
                    await i.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }
            } else if (i.customId === 'steal_add_sticker') {
                await i.deferUpdate();
                try {
                     const loadingContainer = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.loading || '⏳'} Adding sticker...`));
                     await i.editReply({ components: [loadingContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                     
                     // Fetch image as buffer for sticker creation
                     const imageBuffer = await fetchImageAsBuffer(url);
                     
                     // Check file size (Discord stickers must be under 512KB)
                     if (imageBuffer.length > 512 * 1024) {
                         const sizeKB = Math.round(imageBuffer.length / 1024);
                         const errorContainer = new ContainerBuilder()
                             .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Image too large (${sizeKB}KB). Discord stickers must be under 512KB.`));
                         await i.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                         return;
                     }
                     
                     const sticker = await message.guild.stickers.create({ file: imageBuffer, name: name, tags: name });
                     const successContainer = new ContainerBuilder()
                         .addTextDisplayComponents(t => t.setContent(`${EMOJIS.success} Added sticker **${sticker.name}**`));
                     await i.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                } catch (err) {
                    const errorContainer = new ContainerBuilder()
                         .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to add sticker: ${err.message}`));
                    await i.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }
            }
        } catch (error) {
           // Handle interaction errors
           console.error("Steal interaction error:", error);
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
             const timeoutContainer = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.duration} Timed out.`));
             reply.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } }).catch(() => {});
        }
    });
}

async function addEmoji(message, customEmoji, nameOverride) {
    const extension = customEmoji.animated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${customEmoji.id}.${extension}`;
    const name = nameOverride || customEmoji.name;

    try {
        const emoji = await message.guild.emojis.create({ attachment: url, name: name });
        const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.success} Added emoji ${emoji} (**${emoji.name}**)`));
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } catch (error) {
        const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to add emoji: ${error.message}`));
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
}
