import { PermissionFlagsBits, parseEmoji, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType, ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, GuildPremiumTier } from 'discord.js';
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

// Sanitize emoji name to match Discord's requirements (2-32 chars, alphanumeric and underscores only)
function sanitizeEmojiName(name) {
    // Remove any characters that aren't alphanumeric or underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Ensure minimum length of 2
    if (sanitized.length < 2) {
        sanitized = 'emoji_' + sanitized;
    }
    
    // Ensure maximum length of 32
    if (sanitized.length > 32) {
        sanitized = sanitized.substring(0, 32);
    }
    
    return sanitized;
}

// Get max emoji slots based on server boost level
function getMaxEmojiSlots(guild) {
    const tier = guild.premiumTier;
    switch (tier) {
        case GuildPremiumTier.Tier3: return 250;
        case GuildPremiumTier.Tier2: return 150;
        case GuildPremiumTier.Tier1: return 100;
        default: return 50;
    }
}

// Get available emoji slots (separate for static and animated)
function getAvailableSlots(guild) {
    const maxSlots = getMaxEmojiSlots(guild);
    const staticEmojis = guild.emojis.cache.filter(e => !e.animated).size;
    const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
    
    return {
        static: maxSlots - staticEmojis,
        animated: maxSlots - animatedEmojis,
        maxSlots
    };
}

export default {
    name: 'steal',
    description: 'Steal emojis or stickers from a message',
    category: 'Miscellaneous',
    aliases: ['yoink'],
    usage: 'steal [emoji(s)] (or reply to a message)',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} You need **Manage Emojis/Stickers** permission to use this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        // 1. Direct Arguments (Multiple Emojis)
        if (args.length > 0) {
            // Parse all emojis from arguments
            const emojisToAdd = [];
            for (const arg of args) {
                const customEmoji = parseEmoji(arg);
                if (customEmoji && customEmoji.id) {
                    emojisToAdd.push(customEmoji);
                }
            }

            if (emojisToAdd.length > 0) {
                return addMultipleEmojis(message, emojisToAdd);
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

            // Case B: Reply has Custom Emojis (handle multiple)
            if (targetContent.emojis.length > 0) {
                if (targetContent.emojis.length === 1) {
                    // Single emoji - show prompt
                    const emoji = targetContent.emojis[0];
                    const extension = emoji.animated ? 'gif' : 'png';
                    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}`;
                    return promptStickerOrEmoji(message, url, emoji.name, 'Emoji');
                } else {
                    // Multiple emojis - add all directly
                    return addMultipleEmojis(message, targetContent.emojis);
                }
            }

             // Case C: Reply has Image Attachment
            if (targetContent.attachments.size > 0) {
                const attachment = targetContent.attachments.first();
                return promptStickerOrEmoji(message, attachment.url, 'stolen_image', 'Image');
            }
            
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} No stealable content found in the replied message.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Please provide emoji(s) or reply to a message containing emoji/sticker/image.`));
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

async function addMultipleEmojis(message, emojis) {
    const slots = getAvailableSlots(message.guild);
    
    // Separate emojis by type
    const staticEmojis = emojis.filter(e => !e.animated);
    const animatedEmojis = emojis.filter(e => e.animated);
    
    // Check if we have any slots at all
    if (slots.static <= 0 && slots.animated <= 0) {
        const c = new ContainerBuilder().addTextDisplayComponents(t => 
            t.setContent(`${EMOJIS.error} **Server Full!**\nThis server has no available emoji slots (${slots.maxSlots} max).`)
        );
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    // Limit emojis to available slots
    const staticToAdd = staticEmojis.slice(0, Math.max(0, slots.static));
    const animatedToAdd = animatedEmojis.slice(0, Math.max(0, slots.animated));
    const emojisToAdd = [...staticToAdd, ...animatedToAdd];

    if (emojisToAdd.length === 0) {
        const c = new ContainerBuilder().addTextDisplayComponents(t => 
            t.setContent(`${EMOJIS.error} **No Slots Available!**\n` +
                `Static slots: ${slots.static} remaining\n` +
                `Animated slots: ${slots.animated} remaining`)
        );
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    // Notify if some emojis will be skipped
    const skippedStatic = staticEmojis.length - staticToAdd.length;
    const skippedAnimated = animatedEmojis.length - animatedToAdd.length;
    const totalSkipped = skippedStatic + skippedAnimated;

    // Send loading message
    const loadingContainer = new ContainerBuilder().addTextDisplayComponents(t => 
        t.setContent(`${EMOJIS.loading || '⏳'} Adding ${emojisToAdd.length} emoji(s)...`)
    );
    const reply = await message.reply({ 
        components: [loadingContainer], 
        flags: MessageFlags.IsComponentsV2, 
        allowedMentions: { repliedUser: false } 
    });

    const results = {
        success: [],
        failed: []
    };

    // Add emojis one by one
    for (const emoji of emojisToAdd) {
        const extension = emoji.animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}`;
        const name = sanitizeEmojiName(emoji.name);

        try {
            const addedEmoji = await message.guild.emojis.create({ attachment: url, name: name });
            results.success.push(addedEmoji);
        } catch (error) {
            results.failed.push({ name: emoji.name, error: error.message });
        }
    }

    // Build result message
    const container = new ContainerBuilder();
    
    if (results.success.length > 0) {
        const emojiList = results.success.map(e => `${e} **${e.name}**`).join('\n');
        container.addTextDisplayComponents(t => 
            t.setContent(`${EMOJIS.success} **Added ${results.success.length} Emoji(s)**`)
        );
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(t => t.setContent(emojiList));
    }
    
    if (results.failed.length > 0) {
        if (results.success.length > 0) {
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        }
        const failedList = results.failed.map(f => `❌ **${f.name}**: ${f.error}`).join('\n');
        container.addTextDisplayComponents(t => 
            t.setContent(`${results.success.length === 0 ? EMOJIS.error + ' **Failed to Add Emojis**\n' : '**Failed:**\n'}${failedList}`)
        );
    }

    if (totalSkipped > 0) {
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(t => 
            t.setContent(`⚠️ **${totalSkipped} emoji(s) skipped** (server emoji slots full)`)
        );
    }

    return reply.edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

async function promptStickerOrEmoji(message, url, name, sourceType) {
    const sanitizedName = sanitizeEmojiName(name);
    
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
        .addTextDisplayComponents(t => t.setContent(`### ${EMOJIS.search || '🔍'} Found **${sourceType}**\n${EMOJIS.giveawayarrow || '⬇️'} Select an option below to add it.`))
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
                
                // Check available slots
                const slots = getAvailableSlots(message.guild);
                // Determine if the emoji would be animated (check URL for gif)
                const isAnimated = url.endsWith('.gif');
                const availableSlots = isAnimated ? slots.animated : slots.static;
                
                if (availableSlots <= 0) {
                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} **No Slots Available!**\nThis server has no ${isAnimated ? 'animated' : 'static'} emoji slots left.`));
                    await i.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                    return;
                }
                
                try {
                    const emoji = await message.guild.emojis.create({ attachment: url, name: sanitizedName });
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
                     
                     const sticker = await message.guild.stickers.create({ file: imageBuffer, name: sanitizedName, tags: sanitizedName });
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
