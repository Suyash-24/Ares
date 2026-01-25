import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { MATCH_MODES } from '../../../events/triggerHandler.js';

const MATCH_MODE_NAMES = {
    [MATCH_MODES.EXACT]: 'Exact',
    [MATCH_MODES.STARTSWITH]: 'Starts With',
    [MATCH_MODES.ENDSWITH]: 'Ends With',
    [MATCH_MODES.INCLUDES]: 'Includes',
    [MATCH_MODES.REGEX]: 'Regex'
};

export default {
    name: 'reaction',
    description: 'Manage reaction triggers - auto-react to messages containing triggers',
    category: 'Configuration',
    aliases: ['rt', 'reactiontrigger', 'autoreact'],
    usage: '<add|remove|list|messages|reset> [options]',
    examples: [
        'reaction add 👍 hello',
        'reaction add <:custom:123456> goodbye',
        'reaction remove 👍 hello',
        'reaction list',
        'reaction messages #selfies 👍 ❤️',
        'reaction messages list',
        'reaction messages remove #selfies',
        'reaction reset'
    ],
    userPermissions: [PermissionFlagsBits.ManageGuild],

    async execute(message, args, client) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            return this.showHelp(message);
        }

        switch (subcommand) {
            case 'add':
            case 'create':
                return this.addReaction(message, args.slice(1), client);

            case 'remove':
            case 'delete':
            case 'del':
                return this.removeReaction(message, args.slice(1), client);

            case 'list':
            case 'ls':
                return this.listReactions(message, client);

            case 'messages':
            case 'msg':
            case 'channel':
                return this.handleMessages(message, args.slice(1), client);

            case 'reset':
            case 'clear':
                return this.resetReactions(message, client);

            case 'matchmode':
            case 'mode':
                return this.setMatchMode(message, args.slice(1), client);

            default:
                return this.showHelp(message);
        }
    },

    async showHelp(message) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# 😀 Reaction Triggers`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `Auto-react to messages containing specific triggers.\n\n` +
                `**Subcommands:**\n` +
                `> \`.reaction add <emoji> <trigger>\` - Add reaction trigger\n` +
                `> \`.reaction remove <emoji> <trigger>\` - Remove reaction trigger\n` +
                `> \`.reaction list\` - List all reaction triggers\n` +
                `> \`.reaction matchmode <trigger> <mode>\` - Set match mode\n` +
                `> \`.reaction messages <#channel> <emojis>\` - React to all messages in channel\n` +
                `> \`.reaction messages list\` - List channels with auto-reactions\n` +
                `> \`.reaction messages remove <#channel>\` - Remove channel reactions\n` +
                `> \`.reaction reset\` - Remove all reaction triggers\n\n` +
                `**Match Modes:** \`exact\`, \`startswith\`, \`endswith\`, \`includes\`, \`regex\`\n` +
                `*Default: includes*`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async addReaction(message, args, client) {
        if (args.length < 2) {
            return this.sendError(message, 'Usage: `.reaction add <emoji> <trigger>`\n\n**Example:** `.reaction add 👍 hello`');
        }

        const emojiArg = args[0];
        const trigger = args.slice(1).join(' ').trim();

        if (!trigger) {
            return this.sendError(message, 'Please provide a trigger text.');
        }

        if (!this.isValidEmoji(emojiArg)) {
            return this.sendError(message, `\`${emojiArg}\` is not a valid emoji!\n\nPlease use a valid emoji like 👍 or a custom server emoji.`);
        }

        const emoji = this.parseEmoji(emojiArg);

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const reactionTriggers = guildData.reactionTriggers || [];

        const exists = reactionTriggers.some(rt =>
            rt.emoji === emoji && rt.trigger.toLowerCase() === trigger.toLowerCase()
        );

        if (exists) {
            return this.sendError(message, `Reaction trigger \`${trigger}\` with ${emojiArg} already exists!`);
        }

        reactionTriggers.push({
            emoji: emoji,
            emojiDisplay: emojiArg,
            trigger: trigger,
            matchMode: MATCH_MODES.INCLUDES,
            createdBy: message.author.id,
            createdAt: Date.now()
        });

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { reactionTriggers } },
            { upsert: true }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Reaction Trigger Added`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Emoji:** ${emojiArg}\n` +
                `**Trigger:** \`${trigger}\`\n` +
                `**Match Mode:** Includes (default)\n\n` +
                `Use \`.reaction matchmode ${trigger} <mode>\` to change match mode.`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async removeReaction(message, args, client) {
        if (args.length < 2) {
            return this.sendError(message, 'Usage: `.reaction remove <emoji> <trigger>`');
        }

        const emojiArg = args[0];
        const trigger = args.slice(1).join(' ').trim();

        const emoji = this.parseEmoji(emojiArg);
        if (!emoji) {
            return this.sendError(message, 'Invalid emoji.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const reactionTriggers = guildData.reactionTriggers || [];

        const index = reactionTriggers.findIndex(rt =>
            rt.emoji === emoji && rt.trigger.toLowerCase() === trigger.toLowerCase()
        );

        if (index === -1) {
            return this.sendError(message, `No reaction trigger found for \`${trigger}\` with ${emojiArg}.`);
        }

        reactionTriggers.splice(index, 1);

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { reactionTriggers } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Reaction Trigger Removed`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Removed ${emojiArg} reaction for trigger \`${trigger}\`.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async listReactions(message, client) {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const reactionTriggers = guildData.reactionTriggers || [];

        if (reactionTriggers.length === 0) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# ℹ️ No Reaction Triggers`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`This server has no reaction triggers. Use \`.reaction add\` to create one!`)
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const grouped = [];
        const seenTriggers = new Set();
        for (const rt of reactionTriggers) {
            if (!seenTriggers.has(rt.trigger.toLowerCase())) {
                seenTriggers.add(rt.trigger.toLowerCase());
                const allEmojis = reactionTriggers
                    .filter(r => r.trigger.toLowerCase() === rt.trigger.toLowerCase())
                    .map(r => r.emojiDisplay || r.emoji);
                grouped.push({
                    trigger: rt.trigger,
                    emojis: allEmojis,
                    matchMode: rt.matchMode || 'includes'
                });
            }
        }

        const pageSize = 5;
        const pages = [];
        for (let i = 0; i < grouped.length; i += pageSize) {
            const pageItems = grouped.slice(i, i + pageSize);
            let content = '';
            pageItems.forEach((item, idx) => {
                const modeName = MATCH_MODE_NAMES[item.matchMode] || 'Includes';
                content += `**${i + idx + 1}.** \`${item.trigger}\` → ${item.emojis.join(' ')} • ${modeName}\n`;
            });
            pages.push(content);
        }

        let currentPage = 0;

        const buildPage = (page) => {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# 😀 Reaction Triggers`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(pages[page])
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`Page ${page + 1}/${pages.length} • Total: ${grouped.length} trigger(s)`)
            );

            if (pages.length > 1) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('reaction_list_prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('reaction_list_next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === pages.length - 1)
                );
                container.addActionRowComponents(() => row);
            }

            return [container];
        };

        const reply = await message.reply({
            components: buildPage(0),
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });

        if (pages.length > 1) {
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'This is not your interaction!', ephemeral: true });
                }

                if (i.customId === 'reaction_list_next') {
                    currentPage = Math.min(currentPage + 1, pages.length - 1);
                } else {
                    currentPage = Math.max(currentPage - 1, 0);
                }

                await i.update({
                    components: buildPage(currentPage),
                    flags: MessageFlags.IsComponentsV2
                });
            });
        }
    },

    async setMatchMode(message, args, client) {
        const triggerText = args.slice(0, -1).join(' ').trim();
        const mode = args[args.length - 1]?.toLowerCase();

        if (!triggerText || !mode) {
            return this.sendError(message, 'Usage: `.reaction matchmode <trigger> <mode>`\nModes: `exact`, `startswith`, `endswith`, `includes`, `regex`');
        }

        const validModes = Object.values(MATCH_MODES);
        if (!validModes.includes(mode)) {
            return this.sendError(message, `Invalid match mode! Valid modes: ${validModes.join(', ')}`);
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const reactionTriggers = guildData.reactionTriggers || [];

        const matchingIndices = [];
        reactionTriggers.forEach((rt, idx) => {
            if (rt.trigger.toLowerCase() === triggerText.toLowerCase()) {
                matchingIndices.push(idx);
            }
        });

        if (matchingIndices.length === 0) {
            return this.sendError(message, `No reaction triggers found with text \`${triggerText}\`.`);
        }

        for (const idx of matchingIndices) {
            reactionTriggers[idx].matchMode = mode;
        }

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { reactionTriggers } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Match Mode Updated`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Trigger:** \`${triggerText}\`\n` +
                `**New Match Mode:** ${MATCH_MODE_NAMES[mode]}\n\n` +
                `Updated ${matchingIndices.length} reaction trigger(s).`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleMessages(message, args, client) {
        if (!args[0]) {
            return this.sendError(message, 'Usage:\n`.reaction messages <#channel> <emojis>`\n`.reaction messages list`\n`.reaction messages remove <#channel>`');
        }

        const subAction = args[0].toLowerCase();

        if (subAction === 'list' || subAction === 'ls') {
            return this.listMessageReactions(message, client);
        }

        if (subAction === 'remove' || subAction === 'delete') {
            return this.removeMessageReactions(message, args.slice(1), client);
        }

        return this.addMessageReactions(message, args, client);
    },

    async addMessageReactions(message, args, client) {

        let channel = message.mentions.channels.first();

        if (!channel) {
            const channelId = args[0].replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(channelId);
        }

        if (!channel) {
            return this.sendError(message, 'Please mention a valid channel.');
        }

        const emojiArgs = args.slice(1);
        if (emojiArgs.length === 0) {
            return this.sendError(message, 'Please provide at least one emoji.');
        }

        if (emojiArgs.length > 3) {
            return this.sendError(message, 'Maximum 3 emojis allowed per channel.');
        }

        const emojis = [];

        for (const emojiArg of emojiArgs) {

            const customEmojiMatches = emojiArg.match(/<a?:\w+:\d+>/g);
            if (customEmojiMatches && customEmojiMatches.length > 0) {
                for (const match of customEmojiMatches) {
                    const emoji = this.parseEmoji(match);
                    if (emoji) {
                        emojis.push({ emoji, display: match });
                    }
                }
            } else {

                const unicodeEmojis = emojiArg.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu);
                if (unicodeEmojis && unicodeEmojis.length > 0) {
                    for (const emoji of unicodeEmojis) {
                        emojis.push({ emoji, display: emoji });
                    }
                } else {

                    const emoji = this.parseEmoji(emojiArg);
                    if (emoji) {
                        emojis.push({ emoji, display: emojiArg });
                    }
                }
            }
        }

        const finalEmojis = emojis.slice(0, 3);

        if (finalEmojis.length === 0) {
            return this.sendError(message, 'No valid emojis provided.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const channelReactions = guildData.channelReactions || [];

        const existingIndex = channelReactions.findIndex(cr => cr.channelId === channel.id);

        if (existingIndex !== -1) {
            channelReactions[existingIndex].emojis = finalEmojis;
        } else {
            channelReactions.push({
                channelId: channel.id,
                emojis: finalEmojis,
                createdBy: message.author.id,
                createdAt: Date.now()
            });
        }

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { channelReactions } },
            { upsert: true }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Channel Reactions Set`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Channel:** ${channel}\n` +
                `**Reactions:** ${finalEmojis.map(e => e.display).join(' ')}\n\n` +
                `All messages in ${channel} will receive these reactions.`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async listMessageReactions(message, client) {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const channelReactions = guildData.channelReactions || [];

        if (channelReactions.length === 0) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# ℹ️ No Channel Reactions`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`No channels have auto-reactions. Use \`.reaction messages <#channel> <emojis>\` to set up!`)
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const pageSize = 5;
        const pages = [];
        for (let i = 0; i < channelReactions.length; i += pageSize) {
            const pageItems = channelReactions.slice(i, i + pageSize);
            let content = '';
            pageItems.forEach((cr, idx) => {
                const emojiDisplays = cr.emojis.map(e => typeof e === 'string' ? e : e.display).join(' ');
                content += `**${i + idx + 1}.** <#${cr.channelId}> → ${emojiDisplays}\n`;
            });
            pages.push(content);
        }

        let currentPage = 0;

        const buildPage = (page) => {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# 📺 Channel Reactions`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(pages[page])
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`Page ${page + 1}/${pages.length} • Total: ${channelReactions.length} channel(s)`)
            );

            if (pages.length > 1) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('reaction_msg_prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('reaction_msg_next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === pages.length - 1)
                );
                container.addActionRowComponents(() => row);
            }

            return [container];
        };

        const reply = await message.reply({
            components: buildPage(0),
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });

        if (pages.length > 1) {
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'This is not your interaction!', ephemeral: true });
                }

                if (i.customId === 'reaction_msg_next') {
                    currentPage = Math.min(currentPage + 1, pages.length - 1);
                } else {
                    currentPage = Math.max(currentPage - 1, 0);
                }

                await i.update({
                    components: buildPage(currentPage),
                    flags: MessageFlags.IsComponentsV2
                });
            });
        }
    },

    async removeMessageReactions(message, args, client) {
        let channel = message.mentions.channels.first();

        if (!channel && args[0]) {
            const channelId = args[0].replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(channelId);
        }

        if (!channel) {
            return this.sendError(message, 'Please mention a valid channel.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const channelReactions = guildData.channelReactions || [];

        const index = channelReactions.findIndex(cr => cr.channelId === channel.id);

        if (index === -1) {
            return this.sendError(message, `No reactions set for ${channel}.`);
        }

        channelReactions.splice(index, 1);

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { channelReactions } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Channel Reactions Removed`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Removed auto-reactions from ${channel}.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async resetReactions(message, client) {
        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { reactionTriggers: [], channelReactions: [] } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ All Reactions Reset`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`All reaction triggers and channel reactions have been removed.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    parseEmoji(str) {
        if (!str) return null;

        const customMatch = str.match(/^<(a)?:(\w+):(\d+)>$/);
        if (customMatch) {

            const animated = customMatch[1] ? 'a:' : '';
            const name = customMatch[2];
            const id = customMatch[3];
            return `${animated}${name}:${id}`;
        }

        if (str.length > 10) return null;

        const hasEmoji = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u.test(str);
        if (hasEmoji) {
            return str;
        }

        return null;
    },

    isValidEmoji(str) {
        return this.parseEmoji(str) !== null;
    },

    async sendError(message, errorText) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ❌ Error`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(errorText)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
