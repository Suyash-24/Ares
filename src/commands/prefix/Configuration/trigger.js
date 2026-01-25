import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { MATCH_MODES } from '../../../events/triggerHandler.js';

const MATCH_MODE_NAMES = {
    [MATCH_MODES.EXACT]: 'Exact',
    [MATCH_MODES.STARTSWITH]: 'Starts With',
    [MATCH_MODES.ENDSWITH]: 'Ends With',
    [MATCH_MODES.INCLUDES]: 'Includes',
    [MATCH_MODES.REGEX]: 'Regex'
};

export default {
    name: 'trigger',
    description: 'Manage autoresponder triggers for the server',
    category: 'Configuration',
    aliases: ['triggers', 'autoresponder', 'ar'],
    usage: '<add|remove|list|edit|matchmode|toggle|info> [options]',
    examples: [
        'trigger add hello | Hello there! Welcome to the server!',
        'trigger add !greet | Hey {user}! Welcome to {server}!',
        'trigger remove hello',
        'trigger list',
        'trigger matchmode hello startswith',
        'trigger info hello',
        'trigger toggle hello'
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
                return this.addTrigger(message, args.slice(1), client);

            case 'remove':
            case 'delete':
            case 'del':
                return this.removeTrigger(message, args.slice(1), client);

            case 'list':
            case 'ls':
                return this.listTriggers(message, client);

            case 'edit':
            case 'editreply':
                return this.editTrigger(message, args.slice(1), client);

            case 'matchmode':
            case 'mode':
                return this.setMatchMode(message, args.slice(1), client);

            case 'toggle':
                return this.toggleTrigger(message, args.slice(1), client);

            case 'info':
            case 'view':
                return this.showTriggerInfo(message, args.slice(1), client);

            case 'plaintext':
            case 'plain':
                return this.togglePlainText(message, args.slice(1), client);

            default:
                return this.showHelp(message);
        }
    },

    async showHelp(message) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.settings || '⚙️'} Trigger System`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Subcommands:**\n` +
                `> \`.trigger add <trigger> | <response>\` - Add a trigger\n` +
                `> \`.trigger remove <trigger>\` - Remove a trigger\n` +
                `> \`.trigger list\` - List all triggers\n` +
                `> \`.trigger edit <trigger> | <new response>\` - Edit response\n` +
                `> \`.trigger matchmode <trigger> <mode>\` - Set match mode\n` +
                `> \`.trigger toggle <trigger>\` - Enable/disable trigger\n` +
                `> \`.trigger info <trigger>\` - View trigger details\n` +
                `> \`.trigger plaintext <trigger>\` - Toggle plain text mode\n\n` +
                `**Match Modes:** \`exact\`, \`startswith\`, \`endswith\`, \`includes\`, \`regex\`\n\n` +
                `**Placeholders:**\n` +
                `> \`{user}\` - User mention • \`{user_name}\` - Username\n` +
                `> \`{server}\` - Server name • \`{channel}\` - Channel mention\n` +
                `> \`{args}\` - Text after trigger • \`{timestamp}\` - Current time`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async addTrigger(message, args, client) {
        const fullArgs = args.join(' ');

        const parts = fullArgs.split('|').map(p => p.trim());

        if (parts.length < 2 || !parts[0] || !parts[1]) {
            return this.sendError(message, 'Invalid format! Use: `.trigger add <trigger> | <response>`');
        }

        const triggerText = parts[0];
        const response = parts.slice(1).join('|').trim();

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        if (triggers.some(t => t.trigger.toLowerCase() === triggerText.toLowerCase())) {
            return this.sendError(message, `A trigger with the text \`${triggerText}\` already exists!`);
        }

        const newTrigger = {
            trigger: triggerText,
            response: response,
            matchMode: MATCH_MODES.EXACT,
            enabled: true,
            plainText: false,
            createdBy: message.author.id,
            createdAt: Date.now()
        };

        triggers.push(newTrigger);

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } },
            { upsert: true }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Trigger Added`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Trigger:** \`${triggerText}\`\n` +
                `**Response:** ${response.length > 100 ? response.substring(0, 100) + '...' : response}\n` +
                `**Match Mode:** ${MATCH_MODE_NAMES[MATCH_MODES.EXACT]}\n\n` +
                `> Use \`.trigger matchmode ${triggerText} <mode>\` to change match mode.`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async removeTrigger(message, args, client) {
        const triggerText = args.join(' ').trim();

        if (!triggerText) {
            return this.sendError(message, 'Please specify the trigger to remove.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const index = triggers.findIndex(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (index === -1) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        const removed = triggers.splice(index, 1)[0];

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Trigger Removed`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Successfully removed trigger \`${removed.trigger}\`.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async listTriggers(message, client) {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        if (triggers.length === 0) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# ${EMOJIS.info || 'ℹ️'} No Triggers`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`This server has no triggers. Use \`.trigger add\` to create one!`)
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const pageSize = 5;
        const pages = [];

        for (let i = 0; i < triggers.length; i += pageSize) {
            const pageTriggers = triggers.slice(i, i + pageSize);
            const pageContent = pageTriggers.map((t, idx) => {
                const status = t.enabled ? '🟢' : '🔴';
                const mode = MATCH_MODE_NAMES[t.matchMode] || 'Exact';
                return `${status} **${i + idx + 1}.** \`${t.trigger}\` • ${mode}`;
            }).join('\n');

            pages.push(pageContent);
        }

        let currentPage = 0;

        const buildPage = (page) => {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td =>
                td.setContent(`# ${EMOJIS.list || '📋'} Server Triggers`)
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(pages[page])
            );
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td =>
                td.setContent(`Page ${page + 1}/${pages.length} • Total: ${triggers.length} trigger(s)`)
            );

            return [container];
        };

        if (pages.length === 1) {
            return message.reply({
                components: buildPage(0),
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('trigger_list_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('trigger_list_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.list || '📋'} Server Triggers`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(pages[0])
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Page 1/${pages.length} • Total: ${triggers.length} trigger(s)`)
        );
        container.addActionRowComponents(() => row);

        const reply = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'This is not your interaction!', ephemeral: true });
            }

            if (i.customId === 'trigger_list_next') {
                currentPage = Math.min(currentPage + 1, pages.length - 1);
            } else {
                currentPage = Math.max(currentPage - 1, 0);
            }

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('trigger_list_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('trigger_list_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === pages.length - 1)
            );

            const newContainer = new ContainerBuilder();
            newContainer.addTextDisplayComponents(td =>
                td.setContent(`# ${EMOJIS.list || '📋'} Server Triggers`)
            );
            newContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            newContainer.addTextDisplayComponents(td =>
                td.setContent(pages[currentPage])
            );
            newContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            newContainer.addTextDisplayComponents(td =>
                td.setContent(`Page ${currentPage + 1}/${pages.length} • Total: ${triggers.length} trigger(s)`)
            );
            newContainer.addActionRowComponents(() => newRow);

            await i.update({
                components: [newContainer],
                flags: MessageFlags.IsComponentsV2
            });
        });
    },

    async editTrigger(message, args, client) {
        const fullArgs = args.join(' ');
        const parts = fullArgs.split('|').map(p => p.trim());

        if (parts.length < 2 || !parts[0] || !parts[1]) {
            return this.sendError(message, 'Invalid format! Use: `.trigger edit <trigger> | <new response>`');
        }

        const triggerText = parts[0];
        const newResponse = parts.slice(1).join('|').trim();

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const index = triggers.findIndex(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (index === -1) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        triggers[index].response = newResponse;
        triggers[index].editedBy = message.author.id;
        triggers[index].editedAt = Date.now();

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Trigger Updated`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Trigger:** \`${triggers[index].trigger}\`\n` +
                `**New Response:** ${newResponse.length > 100 ? newResponse.substring(0, 100) + '...' : newResponse}`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async setMatchMode(message, args, client) {
        const triggerText = args.slice(0, -1).join(' ').trim();
        const mode = args[args.length - 1]?.toLowerCase();

        if (!triggerText || !mode) {
            return this.sendError(message, 'Usage: `.trigger matchmode <trigger> <mode>`\nModes: `exact`, `startswith`, `endswith`, `includes`, `regex`');
        }

        const validModes = Object.values(MATCH_MODES);
        if (!validModes.includes(mode)) {
            return this.sendError(message, `Invalid match mode! Valid modes: ${validModes.join(', ')}`);
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const index = triggers.findIndex(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (index === -1) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        triggers[index].matchMode = mode;

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } }
        );

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Match Mode Updated`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Trigger:** \`${triggers[index].trigger}\`\n` +
                `**New Match Mode:** ${MATCH_MODE_NAMES[mode]}`
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async toggleTrigger(message, args, client) {
        const triggerText = args.join(' ').trim();

        if (!triggerText) {
            return this.sendError(message, 'Please specify the trigger to toggle.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const index = triggers.findIndex(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (index === -1) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        triggers[index].enabled = !triggers[index].enabled;

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } }
        );

        const status = triggers[index].enabled ? 'Enabled' : 'Disabled';
        const emoji = triggers[index].enabled ? '✅' : '❌';

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${emoji} Trigger ${status}`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Trigger \`${triggers[index].trigger}\` has been ${status.toLowerCase()}.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async showTriggerInfo(message, args, client) {
        const triggerText = args.join(' ').trim();

        if (!triggerText) {
            return this.sendError(message, 'Please specify the trigger to view.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const trigger = triggers.find(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (!trigger) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.info || 'ℹ️'} Trigger Info`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Trigger:** \`${trigger.trigger}\`\n` +
                `**Status:** ${trigger.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
                `**Match Mode:** ${MATCH_MODE_NAMES[trigger.matchMode] || 'Exact'}\n` +
                `**Plain Text:** ${trigger.plainText ? 'Yes' : 'No (Components V2)'}\n` +
                `**Created by:** <@${trigger.createdBy}>\n` +
                `**Created:** <t:${Math.floor(trigger.createdAt / 1000)}:R>\n\n` +
                `**Response:**\n\`\`\`\n${trigger.response}\n\`\`\``
            )
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async togglePlainText(message, args, client) {
        const triggerText = args.join(' ').trim();

        if (!triggerText) {
            return this.sendError(message, 'Please specify the trigger.');
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        const triggers = guildData.triggers || [];

        const index = triggers.findIndex(t => t.trigger.toLowerCase() === triggerText.toLowerCase());

        if (index === -1) {
            return this.sendError(message, `No trigger found with text \`${triggerText}\`.`);
        }

        triggers[index].plainText = !triggers[index].plainText;

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { triggers } }
        );

        const mode = triggers[index].plainText ? 'Plain Text' : 'Components V2';

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ✅ Response Mode Updated`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`Trigger \`${triggers[index].trigger}\` will now respond with **${mode}**.`)
        );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
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
