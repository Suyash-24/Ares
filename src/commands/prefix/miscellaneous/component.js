import {
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
    ComponentType,
    MediaGalleryBuilder
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export const componentSessions = new Map();

export const replaceVariables = (text, context) => {
    if (!text) return text;
    const now = new Date();
    return text
        .replace(/\\n/gi, '\n')
        .replace(/\{user\}/gi, context.user?.username || '')
        .replace(/\{user\.mention\}/gi, context.user?.toString() || '')
        .replace(/\{user\.name\}/gi, context.user?.username || '')
        .replace(/\{user\.tag\}/gi, context.user?.tag || '')
        .replace(/\{user\.id\}/gi, context.user?.id || '')
        .replace(/\{user\.avatar\}/gi, context.user?.displayAvatarURL({ dynamic: true }) || '')
        .replace(/\{guild\.name\}/gi, context.guild?.name || '')
        .replace(/\{guild\.icon\}/gi, context.guild?.iconURL({ dynamic: true }) || '')
        .replace(/\{guild\.membercount\}/gi, context.guild?.memberCount?.toString() || '')
        .replace(/\{guild\.id\}/gi, context.guild?.id || '')
        .replace(/\{channel\}/gi, context.channel?.name || '')
        .replace(/\{channel\.mention\}/gi, context.channel?.toString() || '')
        .replace(/\{channel\.name\}/gi, context.channel?.name || '')
        .replace(/\{channel\.id\}/gi, context.channel?.id || '')
        .replace(/\{timestamp\}/gi, `<t:${Math.floor(now.getTime() / 1000)}>`)
        .replace(/\{timestamp\.relative\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:R>`)
        .replace(/\{timestamp\.date\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:D>`)
        .replace(/\{timestamp\.time\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:T>`)
        .replace(/\{timestamp\.full\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:F>`)
};

const parseContainerCode = async (code, context) => {
    const { SeparatorSpacingSize, MediaGalleryBuilder } = await import('discord.js');
    const container = new ContainerBuilder();

    const parts = code.split(/\$v/gi);

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^\{([\w\d]+)\s*:\s*(.+)\}$/s);
        if (!match) continue;

        const type = match[1].toLowerCase();
        const value = replaceVariables(match[2], context);

        switch (type) {
            case 'text':
            case 'content':

                const textParts = value.split('&&').map(p => p.trim());
                const content = textParts[0];
                const thumbnail = textParts[1];

                if (thumbnail && thumbnail.startsWith('http')) {

                    container.addSectionComponents(section => {
                        section.addTextDisplayComponents(td => td.setContent(content));
                        section.setThumbnailAccessory(t => t.setURL(thumbnail));
                        return section;
                    });
                } else {

                    container.addTextDisplayComponents(td => td.setContent(content));
                }
                break;

            case 'color':
            case 'accent':

                const colorInt = parseInt(value.replace('#', ''), 16);
                if (!isNaN(colorInt)) container.setAccentColor(colorInt);
                break;

            case 'separator':
            case 'sep':
            case 'divider':
                const spacing = value?.toLowerCase() || 'small';

                if (spacing === 'medium' || spacing === 'med' || spacing === 'm') {
                    container.addSeparatorComponents(s => s.setSpacing(2));
                } else if (spacing === 'large' || spacing === 'big' || spacing === 'l') {
                    container.addSeparatorComponents(s => s.setSpacing(2));
                } else {
                    container.addSeparatorComponents(s => s.setSpacing(1));
                }
                break;

            case 'media':
            case 'gallery':
            case 'image':
            case 'images':

                const urls = value.split('&&').map(u => u.trim()).filter(u => u);
                if (urls.length > 0) {
                    const gallery = new MediaGalleryBuilder();
                    urls.forEach(url => {
                        gallery.addItems(item => item.setURL(url));
                    });
                    container.addMediaGalleryComponents(gallery);
                }
                break;
        }
    }

    return container;
};

export default {
    name: 'component',
    category: 'miscellaneous',
    description: 'Build and send rich container messages',
    usage: '.component #channel {text: ...} $v {media: ...}',

    async execute(message, args) {
        const { author, channel } = message;

        const targetChannel = message.mentions.channels.first();
        if (targetChannel || (args[0] && args.join(' ').includes('{'))) {
            const codeText = targetChannel ? args.slice(1).join(' ') : args.join(' ');

            const context = { user: author, guild: message.guild, channel: targetChannel || channel };
            const container = await parseContainerCode(codeText, context);

            try {
                await (targetChannel || channel).send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                const responseContainer = new ContainerBuilder();
                responseContainer.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Container sent to ${targetChannel || channel}!**`));
                return message.reply({ components: [responseContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            } catch (err) {
                 const errorContainer = new ContainerBuilder();
                errorContainer.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Error:** ${err.message}`));
                return message.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
        }

        const helpContainer = new ContainerBuilder();
        helpContainer.addTextDisplayComponents(td => td.setContent(`# 🧩 Component Builder Guide

**Command:** \`.component #channel {code}\`
Create rich container messages using the code syntax below. Use \`$v\` to separate different sections.

### 📚 Available Elements
- **Color:** \`{color: #HexCode}\` (Sets the accent border color)
- **Text:** \`{text: Your content here}\`
- **Text & Thumbnail:** \`{text: Your content && https:
- **Large Image:** \`{media: https://url/to/image.png}\`
- **Separator:** \`{separator: small|large}\`
- **New Line:** \`{\n}\`

### ✨ Variables
You can use these variables in your text:
\`{user}\` (Name), \`{user.mention}\`, \`{user.avatar}\`
\`{guild.name}\`, \`{guild.membercount}\`
\`{timestamp.full}\`, \`{timestamp.relative}\`

### 📋 Full Template Code
Copy and edit this to get started:
\`\`\`
.component {color: #5865F2} $v {text: # 🚀 Update Log} $v {separator: large} $v {text: We have added support for **Rich Containers**! \nNow you can create beautiful announcements. && https://cdn.discordapp.com/embed/avatars/0.png} $v {separator: small} $v {media: https://i.imgur.com/7gK7M3N.jpeg} $v {separator: small} $v {text: -# Sent by {user} • {timestamp.full}}
\`\`\`
`));

        return message.reply({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
