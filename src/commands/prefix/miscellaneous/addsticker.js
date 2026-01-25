import { PermissionFlagsBits, ContainerBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

async function getTenorMediaUrl(tenorUrl) {
    try {
        const response = await fetch(tenorUrl);
        const html = await response.text();

        const gifMatch = html.match(/https:\/\/media[^"'\s]+\.gif/i);
        if (gifMatch) {
            return gifMatch[0];
        }

        // Try looking for contentUrl in JSON-LD
        const jsonLdMatch = html.match(/"contentUrl"\s*:\s*"([^"]+)"/);
        if (jsonLdMatch) {
            return jsonLdMatch[1];
        }

        const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        if (ogImageMatch) {
            return ogImageMatch[1];
        }

        return null;
    } catch (error) {
        console.error('Error fetching Tenor page:', error);
        return null;
    }
}

// Helper function to fetch image as buffer
async function fetchImageAsBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    // Check if it's an actual image
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
        throw new Error(`URL does not point to an image (content-type: ${contentType})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export default {
    name: 'addsticker',
    description: 'Add a sticker to the server',
    category: 'Miscellaneous',
    aliases: ['as', 'createsticker'],
    usage: 'addsticker <url|attachment> <name> [tags]',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} You need **Manage Stickers** permission to use this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} I need **Manage Stickers** permission to do this.`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        let url;
        let name;
        let tags;

        // Check for attachments
        if (message.attachments.size > 0) {
            url = message.attachments.first().url;
            name = args[0];
            tags = args.slice(1).join(' ');
        } else if (args[0]) {
            url = args[0];
            name = args[1];
            tags = args.slice(2).join(' ');
        } else {
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Usage: \`.addsticker <url|attachment> <name> [tags]\``));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (!name) {
             const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Please specify a name for the sticker.`));
             return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
        if (!tags) tags = name; // Default tags to name if not provided

        try {
            // Show loading message
            const loadingC = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.loading || '⏳'} Processing sticker...`));
            const loadingMsg = await message.reply({ components: [loadingC], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

            let finalUrl = url;

            // Handle Tenor links
            if (url.includes('tenor.com') || url.includes('tenor.co')) {
                const tenorMediaUrl = await getTenorMediaUrl(url);
                if (!tenorMediaUrl) {
                    const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Could not extract media from Tenor link. Please use a direct image URL.`));
                    return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }
                finalUrl = tenorMediaUrl;
            }

            // Fetch the image as buffer
            let imageBuffer;
            try {
                imageBuffer = await fetchImageAsBuffer(finalUrl);
            } catch (fetchError) {
                const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to fetch image: ${fetchError.message}`));
                return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            // Check file size (Discord stickers must be under 512KB)
            if (imageBuffer.length > 512 * 1024) {
                const sizeKB = Math.round(imageBuffer.length / 1024);
                const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Image too large (${sizeKB}KB). Discord stickers must be under 512KB.`));
                return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            const sticker = await message.guild.stickers.create({ file: imageBuffer, name: name, tags: tags });
            const c = new ContainerBuilder()
                .addTextDisplayComponents(t => t.setContent(`${EMOJIS.success} Added sticker **${sticker.name}**!`))
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        } catch (error) {
            console.error(error);
            const c = new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${EMOJIS.error} Failed to add sticker. Ensure the file is valid (PNG/APNG/Lottie) and under 512KB.\nError: ${error.message}`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
    }
};
