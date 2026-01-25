import {
    EmbedBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const embedSessions = new Map();

const replaceVariables = (text, context) => {
    if (!text) return text;
    const now = new Date();
    return text
        .replace(/\{user\}/gi, context.user?.toString() || '')
        .replace(/\{user\.mention\}/gi, context.user?.toString() || '')
        .replace(/\{user\.name\}/gi, context.user?.username || '')
        .replace(/\{user\.username\}/gi, context.user?.username || '')
        .replace(/\{user\.tag\}/gi, context.user?.tag || '')
        .replace(/\{user\.id\}/gi, context.user?.id || '')
        .replace(/\{user\.avatar\}/gi, context.user?.displayAvatarURL({ dynamic: true }) || '')
        .replace(/\{guild\.name\}/gi, context.guild?.name || '')
        .replace(/\{guild\.icon\}/gi, context.guild?.iconURL({ dynamic: true }) || '')
        .replace(/\{guild\.membercount\}/gi, context.guild?.memberCount?.toString() || '')
        .replace(/\{guild\.id\}/gi, context.guild?.id || '')
        .replace(/\{channel\}/gi, context.channel?.toString() || '')
        .replace(/\{channel\.name\}/gi, context.channel?.name || '')
        .replace(/\{channel\.id\}/gi, context.channel?.id || '')
        .replace(/\{timestamp\}/gi, `<t:${Math.floor(now.getTime() / 1000)}>`)
        .replace(/\{timestamp\.relative\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:R>`)
        .replace(/\{timestamp\.date\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:D>`)
        .replace(/\{timestamp\.time\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:T>`)
        .replace(/\{timestamp\.full\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:F>`);
};

const parseEmbedCode = (code, context) => {
    const embedData = {
        content: null,
        title: null,
        description: null,
        color: null,
        thumbnail: null,
        image: null,
        author: null,
        footer: null,
        fields: [],
        timestamp: false,
        url: null
    };

    const parts = code.split(/\$v/gi);

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^\{(\w+):\s*(.+)\}$/s);
        if (!match) {

            if (trimmed.match(/^\{timestamp\}$/i)) {
                embedData.timestamp = true;
            }
            continue;
        }

        const param = match[1].toLowerCase();
        let value = match[2].trim();

        value = replaceVariables(value, context);

        switch (param) {
            case 'content':
            case 'message':
            case 'msg':
                embedData.content = value;
                break;
            case 'title':
                embedData.title = value;
                break;
            case 'description':
            case 'desc':
                embedData.description = value;
                break;
            case 'color':
            case 'colour':
                embedData.color = value.startsWith('#') ? parseInt(value.slice(1), 16) : parseInt(value, 16);
                break;
            case 'thumbnail':
            case 'thumb':
                embedData.thumbnail = value;
                break;
            case 'image':
            case 'img':
                embedData.image = value;
                break;
            case 'url':
                embedData.url = value;
                break;
            case 'author':

                const authorParts = value.split('&&').map(p => p.trim());
                embedData.author = {
                    name: authorParts[0] || null,
                    iconURL: authorParts[1] || null,
                    url: authorParts[2] || null
                };
                break;
            case 'footer':

                const footerParts = value.split('&&').map(p => p.trim());
                embedData.footer = {
                    text: footerParts[0] || null,
                    iconURL: footerParts[1] || null
                };
                break;
            case 'field':

                const fieldParts = value.split('&&').map(p => p.trim());
                if (fieldParts[0] && fieldParts[1]) {
                    embedData.fields.push({
                        name: fieldParts[0],
                        value: fieldParts[1],
                        inline: fieldParts[2]?.toLowerCase() === 'true' || fieldParts[2]?.toLowerCase() === 'inline'
                    });
                }
                break;
            case 'timestamp':
                embedData.timestamp = true;
                break;
        }
    }

    return embedData;
};

export const isValidUrl = (str) => {
    if (!str) return false;
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
};

const buildEmbed = (data) => {
    const embed = new EmbedBuilder();

    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.color) embed.setColor(data.color);
    if (data.thumbnail && isValidUrl(data.thumbnail)) embed.setThumbnail(data.thumbnail);
    if (data.image && isValidUrl(data.image)) embed.setImage(data.image);
    if (data.url && isValidUrl(data.url)) embed.setURL(data.url);
    if (data.author?.name) {
        const authorData = { name: data.author.name };
        if (data.author.iconURL && isValidUrl(data.author.iconURL)) authorData.iconURL = data.author.iconURL;
        if (data.author.url && isValidUrl(data.author.url)) authorData.url = data.author.url;
        embed.setAuthor(authorData);
    }
    if (data.footer?.text) {
        const footerData = { text: data.footer.text };
        if (data.footer.iconURL && isValidUrl(data.footer.iconURL)) footerData.iconURL = data.footer.iconURL;
        embed.setFooter(footerData);
    }
    if (data.timestamp) embed.setTimestamp();
    if (data.fields?.length > 0) embed.addFields(data.fields);

    return embed;
};

const buildEmbedBuilderUI = (userId, embedData = {}) => {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.embed || '📝'} Embed Builder`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    let previewText = '';
    if (embedData.title) previewText += `**Title:** ${embedData.title}\n`;
    if (embedData.description) previewText += `**Description:** ${embedData.description.substring(0, 50)}${embedData.description.length > 50 ? '...' : ''}\n`;
    if (embedData.color) previewText += `**Color:** #${embedData.color.toString(16).padStart(6, '0')}\n`;
    if (embedData.thumbnail) previewText += `**Thumbnail:** Set\n`;
    if (embedData.image) previewText += `**Image:** Set\n`;
    if (embedData.author?.name) previewText += `**Author:** ${embedData.author.name}\n`;
    if (embedData.footer?.text) previewText += `**Footer:** ${embedData.footer.text}\n`;
    if (embedData.fields?.length > 0) previewText += `**Fields:** ${embedData.fields.length}\n`;

    container.addTextDisplayComponents(td => td.setContent(previewText || '-# No properties set yet. Use the buttons below to build your embed.'));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_title_${userId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_desc_${userId}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_color_${userId}`).setLabel('Color').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_url_${userId}`).setLabel('URL').setStyle(ButtonStyle.Secondary)
    ));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_author_${userId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_footer_${userId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_thumb_${userId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_image_${userId}`).setLabel('Image').setStyle(ButtonStyle.Secondary)
    ));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_field_${userId}`).setLabel('Add Field').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_timestamp_${userId}`).setLabel('Timestamp').setStyle(embedData.timestamp ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_preview_${userId}`).setLabel('Preview').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`embed_send_${userId}`).setLabel('Send').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`embed_code_${userId}`).setLabel('Get Code').setStyle(ButtonStyle.Secondary)
    ));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(
        '-# **User:** `{user}` `{user.name}` `{user.tag}` `{user.id}` `{user.avatar}`\n' +
        '-# **Server:** `{guild.name}` `{guild.icon}` `{guild.memberCount}` `{guild.id}`\n' +
        '-# **Channel:** `{channel}` `{channel.name}` `{channel.id}`\n' +
        '-# **Time:** `{timestamp}` `{timestamp.relative}` `{timestamp.date}` `{timestamp.time}` `{timestamp.full}`'
    ));

    return container;
};

const generateEmbedCode = (data) => {
    const parts = [];

    if (data.content) parts.push(`{content: ${data.content}}`);
    if (data.title) parts.push(`{title: ${data.title}}`);
    if (data.description) parts.push(`{description: ${data.description}}`);
    if (data.color) parts.push(`{color: #${data.color.toString(16).padStart(6, '0')}}`);
    if (data.url) parts.push(`{url: ${data.url}}`);
    if (data.thumbnail) parts.push(`{thumbnail: ${data.thumbnail}}`);
    if (data.image) parts.push(`{image: ${data.image}}`);
    if (data.author?.name) {
        let authorStr = data.author.name;
        if (data.author.iconURL) authorStr += ` && ${data.author.iconURL}`;
        if (data.author.url) authorStr += ` && ${data.author.url}`;
        parts.push(`{author: ${authorStr}}`);
    }
    if (data.footer?.text) {
        let footerStr = data.footer.text;
        if (data.footer.iconURL) footerStr += ` && ${data.footer.iconURL}`;
        parts.push(`{footer: ${footerStr}}`);
    }
    if (data.fields?.length > 0) {
        for (const field of data.fields) {
            parts.push(`{field: ${field.name} && ${field.value}${field.inline ? ' && inline' : ''}}`);
        }
    }
    if (data.timestamp) parts.push(`{timestamp}`);

    return parts.join('$v');
};

const extractEmbedCode = (embed) => {
    const data = {
        title: embed.title || null,
        description: embed.description || null,
        color: embed.color || null,
        url: embed.url || null,
        thumbnail: embed.thumbnail?.url || null,
        image: embed.image?.url || null,
        author: embed.author ? { name: embed.author.name, iconURL: embed.author.iconURL, url: embed.author.url } : null,
        footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconURL } : null,
        fields: embed.fields || [],
        timestamp: !!embed.timestamp
    };
    return generateEmbedCode(data);
};

export default {
    name: 'embed',
    description: 'Create and send rich embeds with an interactive builder or code syntax',
    usage: '.embed - Interactive builder\n.embed #channel {code} - Send with code\n.embed edit <msgId> {code} - Edit embed\n.embed copy <msgId> - Copy embed as code\n.embed variables - Show variables',
    category: 'miscellaneous',

    async execute(message, args) {
        const { client, guild, author, channel } = message;
        const userId = author.id;

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'variables' || subcommand === 'vars') {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Embed Variables`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                '**User Variables:**\n' +
                '`{user}` - User mention\n' +
                '`{user.name}` - Username\n' +
                '`{user.avatar}` - Avatar URL\n' +
                '`{user.id}` - User ID\n\n' +
                '**Server Variables:**\n' +
                '`{guild.name}` - Server name\n' +
                '`{guild.icon}` - Server icon URL\n' +
                '`{guild.memberCount}` - Member count\n\n' +
                '**Channel Variables:**\n' +
                '`{channel}` - Channel mention\n' +
                '`{channel.name}` - Channel name\n\n' +
                '**Timestamp Variables:**\n' +
                '`{timestamp}` - Current time\n' +
                '`{timestamp.relative}` - Relative time (e.g., "2 hours ago")\n' +
                '`{timestamp.date}` - Date only\n' +
                '`{timestamp.time}` - Time only\n' +
                '`{timestamp.full}` - Full date and time'
            ));

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'copy') {
            const messageId = args[1];
            if (!messageId) {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Usage Error`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent('**Usage:** `.embed copy <messageId>`'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            try {

                let targetMsg = null;

                try {
                    targetMsg = await channel.messages.fetch(messageId);
                } catch {}

                if (!targetMsg) {
                    const textChannels = guild.channels.cache.filter(c => c.type === 0);
                    for (const [, ch] of textChannels) {
                        if (ch.id === channel.id) continue;
                        try {
                            targetMsg = await ch.messages.fetch(messageId);
                            if (targetMsg) break;
                        } catch {}
                    }
                }

                if (!targetMsg) {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Message Not Found`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td => td.setContent('Could not find that message. Make sure the ID is correct.'));
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }

                if (!targetMsg.embeds || targetMsg.embeds.length === 0) {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} No Embeds`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td => td.setContent('That message has no embeds to copy.'));
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }

                const code = extractEmbedCode(targetMsg.embeds[0]);

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Embed Code Copied`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`\`\`\`\n${code}\n\`\`\``));

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            } catch (err) {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Error`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(err.message));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
        }

        if (subcommand === 'edit') {
            const messageId = args[1];
            const codeStart = args.slice(2).join(' ');

            if (!messageId || !codeStart) {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Usage Error`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent('**Usage:** `.embed edit <messageId> {code}`'));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }

            try {

                let targetMsg = null;

                try {
                    targetMsg = await channel.messages.fetch(messageId);
                } catch {}

                if (!targetMsg) {
                    const textChannels = guild.channels.cache.filter(c => c.type === 0);
                    for (const [, ch] of textChannels) {
                        if (ch.id === channel.id) continue;
                        try {
                            targetMsg = await ch.messages.fetch(messageId);
                            if (targetMsg) break;
                        } catch {}
                    }
                }

                if (!targetMsg) {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Message Not Found`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td => td.setContent('Could not find that message. Make sure the ID is correct.'));
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }

                if (targetMsg.author.id !== client.user.id) {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Cannot Edit`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td => td.setContent('I can only edit my own messages.'));
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
                }

                const context = { user: author, guild, channel };
                const embedData = parseEmbedCode(codeStart, context);
                const embed = buildEmbed(embedData);
                const editPayload = { embeds: [embed] };
                if (embedData.content) editPayload.content = embedData.content;

                await targetMsg.edit(editPayload);

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Embed Updated`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`Successfully edited the embed in ${targetMsg.channel}.`));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            } catch (err) {
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Failed to Edit`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(err.message));
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
        }

        const targetChannel = message.mentions.channels.first();
        if (targetChannel || (args[0] && args.join(' ').includes('{'))) {
            const codeText = targetChannel ? args.slice(1).join(' ') : args.join(' ');

            if (!codeText.includes('{')) {

            } else {
                const sendChannel = targetChannel || channel;

                if (!sendChannel.permissionsFor(message.member).has(PermissionFlagsBits.SendMessages)) {
                    return message.reply({ content: '❌ You don\'t have permission to send messages in that channel.', allowedMentions: { repliedUser: false } });
                }

                const context = { user: author, guild, channel: sendChannel };
                const embedData = parseEmbedCode(codeText, context);

                if (!embedData.title && !embedData.description && !embedData.image && !embedData.thumbnail && !embedData.content) {
                    return message.reply({ content: '❌ Your embed needs at least a title, description, image, or content.', allowedMentions: { repliedUser: false } });
                }

                const embed = buildEmbed(embedData);
                const sendPayload = { embeds: [embed] };
                if (embedData.content) sendPayload.content = embedData.content;

                try {
                    await sendChannel.send(sendPayload);
                    if (sendChannel.id !== channel.id) {
                        return message.reply({ content: `✅ Embed sent to ${sendChannel}!`, allowedMentions: { repliedUser: false } });
                    } else {

                        message.delete().catch(() => {});
                    }
                } catch (err) {
                    return message.reply({ content: '❌ Failed to send embed: ' + err.message, allowedMentions: { repliedUser: false } });
                }
                return;
            }
        }

        if (!embedSessions.has(userId)) {
            embedSessions.set(userId, {
                title: null,
                description: null,
                color: null,
                url: null,
                thumbnail: null,
                image: null,
                author: null,
                footer: null,
                fields: [],
                timestamp: false
            });
        }

        const embedData = embedSessions.get(userId);
        const container = buildEmbedBuilderUI(userId, embedData);

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};

export { embedSessions, buildEmbedBuilderUI, buildEmbed, generateEmbedCode, parseEmbedCode, replaceVariables };
