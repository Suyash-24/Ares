import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export const DEFAULT_CONFIG = {
    enabled: false,
    channel: null,
    emojis: [],
    selfStar: false,
    color: '#FFD700',
    timestamp: true,
    jumpUrl: true,
    attachments: true,
    ignoredChannels: [],
    ignoredRoles: [],
    ignoredMembers: [],
    starredMessages: []
};

const getStarboardTip = (guildData) => {
    const config = guildData.starboard || DEFAULT_CONFIG;

    if (config.enabled && !config.channel) {
        return `**TIP:** Set a starboard channel to start using the system! \`.starboard set #channel\``;
    }

    if (config.enabled && (!config.emojis || config.emojis.length === 0)) {
        return `**TIP:** Add star emojis with \`.starboard emoji add <emoji> [threshold]\``;
    }

    if (Math.random() > 0.5) return null;

    const tips = [
        "Add multiple emojis with different thresholds using `.starboard emoji add`",
        "Each emoji can have its own reaction threshold",
        "Enable self-starring with `.starboard selfstar on`",
        "Customize the embed color with `.starboard color`",
        "Ignore specific channels or roles with `.starboard ignore`",
        "Toggle timestamps with `.starboard timestamp`",
        "Toggle jump URLs with `.starboard jumpurl`",
        "View your current configuration with `.starboard config`"
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return `**TIP:** ${randomTip}`;
};

const buildNotice = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(title));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

const buildTipContainer = (tip) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.tips} ${tip}`));
    return container;
};

export const buildWizardContainer = (guildData, disabled = false) => {
    const config = guildData.starboard || DEFAULT_CONFIG;
    const container = new ContainerBuilder();

    const emojiList = config.emojis && config.emojis.length > 0
        ? config.emojis.map(e => `${e.emoji} (${e.threshold}+)`).join(', ')
        : '*None set*';

    container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.star} Starboard Setup Wizard${disabled ? ' (Expired)' : ''}\n` +
            `${disabled ? '⏰ **This wizard has expired. Run the command again to create a new one.**\n\n' : ''}` +
            `Highlight interesting messages in a dedicated channel.`)
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`**Status:** ${config.enabled ? `${EMOJIS.success || '✅'} Active` : `${EMOJIS.error || '❌'} Inactive`}\n` +
            `**Channel:** ${config.channel ? `<#${config.channel}>` : 'Not Set'}\n` +
            `**Emojis:** ${emojiList}\n` +
            `**Self-Star:** ${config.selfStar ? 'Enabled' : 'Disabled'}`)
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`### Quick Setup\nGet started with one command:`)
    );

    const quickSetupRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starboard_quick_setup')
            .setLabel('Quick Setup')
            .setEmoji('⚡')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || !config.channel),
        new ButtonBuilder()
            .setCustomId('starboard_set_channel')
            .setLabel(config.channel ? 'Change Channel' : 'Set Channel')
            .setEmoji('📌')
            .setStyle(config.channel ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(quickSetupRow);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`### Configuration`)
    );

    const configRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starboard_emoji')
            .setLabel('Emoji (Add/Remove)')
            .setEmoji(`${EMOJIS.star}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_selfstar')
            .setLabel(`Self-Star: ${config.selfStar ? 'ON' : 'OFF'}`)
            .setEmoji('👤')
            .setStyle(config.selfStar ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_ignore')
            .setLabel('Ignore List')
            .setEmoji('🚫')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(configRow);

    const displayRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starboard_color')
            .setLabel('Color')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_timestamp')
            .setLabel(`Timestamp: ${config.timestamp ? 'ON' : 'OFF'}`)
            .setEmoji('🕒')
            .setStyle(config.timestamp ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_jumpurl')
            .setLabel(`Jump URL: ${config.jumpUrl ? 'ON' : 'OFF'}`)
            .setEmoji('🔗')
            .setStyle(config.jumpUrl ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_attachments')
            .setLabel(`Attachments: ${config.attachments ? 'ON' : 'OFF'}`)
            .setEmoji('📎')
            .setStyle(config.attachments ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(displayRow);

    const toggleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`starboard_toggle_${config.enabled ? 'off' : 'on'}`)
            .setLabel(config.enabled ? 'Lock Starboard' : 'Unlock Starboard')
            .setEmoji(config.enabled ? '🔒' : '🔓')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_view_config')
            .setLabel('View Config')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('starboard_reset')
            .setLabel('Reset')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(toggleRow);

    return container;
};

export const buildEmojiManagementContainer = (guildData, disabled = false) => {
    const config = guildData.starboard || DEFAULT_CONFIG;
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.star} Emoji Management`)
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    let emojiList = '**Current Emojis:**\n';
    if (config.emojis && config.emojis.length > 0) {
        config.emojis.forEach((e, idx) => {
            emojiList += `${idx + 1}. ${e.emoji} → **${e.threshold}+** reactions\n`;
        });
    } else {
        emojiList += '*No emojis configured*';
    }

    container.addTextDisplayComponents(td => td.setContent(emojiList));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`**Commands:**\n\`\`.starboard emoji add <emoji> [threshold]\`\` - Add emoji\n\`\`.starboard emoji remove <emoji>\`\` - Remove emoji\n\nDefault threshold is 3 if not specified.`)
    );

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starboard_back_to_wizard')
            .setLabel('Back to Wizard')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(actionRow);

    return container;
};

export const buildIgnoreListContainer = (guildData, disabled = false) => {
    const config = guildData.starboard || DEFAULT_CONFIG;
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(`# 🚫 Ignore List Management`)
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    let content = '**Ignored Channels:**\n';
    content += config.ignoredChannels && config.ignoredChannels.length > 0
        ? config.ignoredChannels.map(id => `<#${id}>`).join(', ')
        : '*None*';

    content += '\n\n**Ignored Roles:**\n';
    content += config.ignoredRoles && config.ignoredRoles.length > 0
        ? config.ignoredRoles.map(id => `<@&${id}>`).join(', ')
        : '*None*';

    content += '\n\n**Ignored Members:**\n';
    content += config.ignoredMembers && config.ignoredMembers.length > 0
        ? config.ignoredMembers.map(id => `<@${id}>`).join(', ')
        : '*None*';

    container.addTextDisplayComponents(td => td.setContent(content));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('starboard_ignore_channel_select')
            .setPlaceholder('Select channels to toggle ignore')
            .setMinValues(1)
            .setMaxValues(5)
            .setDisabled(disabled)
    ));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('starboard_ignore_role_select')
            .setPlaceholder('Select roles to toggle ignore')
            .setMinValues(1)
            .setMaxValues(5)
            .setDisabled(disabled)
    ));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('starboard_ignore_member_select')
            .setPlaceholder('Select members to toggle ignore')
            .setMinValues(1)
            .setMaxValues(5)
            .setDisabled(disabled)
    ));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`**Commands:**\n\`\`.starboard ignore <channel|role|member>\`\` - Add/Remove from ignore list\n\`\`.starboard ignore list\`\` - View ignore list`)
    );

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starboard_back_to_wizard')
            .setLabel('Back to Wizard')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(actionRow);

    return container;
};

export default {
    name: 'starboard',
    description: 'Manage starboard system - highlight interesting messages',
    usage: 'starboard [subcommand]',
    category: 'Starboard',

    async execute(message, args, client) {
        const guildData = await this.getGuildData(client, message.guildId);

        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            const tip = getStarboardTip(guildData);
            const components = [buildNotice(`# ${EMOJIS.error} Permission Denied`, 'You need **Manage Guild** permission to use starboard commands.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help' || subcommand === 'wizard' || subcommand === 'setup') {
            return this.showWizard(message, client, guildData);
        }

        switch (subcommand) {
            case 'unlock':
            case 'enable':
                return this.handleUnlock(message, client, guildData);
            case 'lock':
            case 'disable':
                return this.handleLock(message, client, guildData);
            case 'set':
            case 'channel':
                return this.handleSetChannel(message, args, client, guildData);
            case 'emoji':
            case 'emojis':
                return this.handleEmoji(message, args, client, guildData);
            case 'selfstar':
                return this.handleSelfStar(message, args, client, guildData);
            case 'color':
                return this.handleColor(message, args, client, guildData);
            case 'timestamp':
                return this.handleTimestamp(message, args, client, guildData);
            case 'jumpurl':
                return this.handleJumpUrl(message, args, client, guildData);
            case 'attachments':
                return this.handleAttachments(message, args, client, guildData);
            case 'ignore':
                return this.handleIgnore(message, args, client, guildData);
            case 'config':
            case 'settings':
                return this.showConfig(message, guildData);
            case 'reset':
                return this.handleReset(message, client, guildData);
            default:
                return this.showWizard(message, client, guildData);
        }
    },

    async getGuildData(client, guildId) {
        const data = await client.db.findOne({ guildId }) || { guildId };
        if (!data.starboard) {
            data.starboard = { ...DEFAULT_CONFIG };
        }

        if (!data.starboard.emojis) {
            data.starboard.emojis = [];
        }
        return data;
    },

    async saveGuildData(client, guildId, starboard) {
        await client.db.updateOne(
            { guildId },
            { $set: { starboard } },
            { upsert: true }
        );
    },

    async showWizard(message, client, guildData) {
        const tip = getStarboardTip(guildData);
        const container = buildWizardContainer(guildData);
        const components = [container];
        if (tip) components.push(buildTipContainer(tip));

        const reply = await message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });

        if (!client.starboardWizards) client.starboardWizards = new Map();
        client.starboardWizards.set(reply.id, {
            authorId: message.author.id,
            createdAt: Date.now(),
            guildId: message.guildId
        });

        setTimeout(async () => {
            try {
                const disabledContainer = buildWizardContainer(guildData, true);
                await reply.edit({ components: [disabledContainer] }).catch(() => {});
                client.starboardWizards.delete(reply.id);
            } catch (e) {

            }
        }, 5 * 60 * 1000);

        return reply;
    },

    async handleUnlock(message, client, guildData) {
        const tip = getStarboardTip(guildData);

        if (!guildData.starboard.channel) {
            const components = [buildNotice(`# ${EMOJIS.error} No Channel Set`, 'Please set a starboard channel first using `.starboard set #channel`')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (guildData.starboard.enabled) {
            const components = [buildNotice(`# ${EMOJIS.info} Already Unlocked`, 'Starboard is already active.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.enabled = true;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        let message_text = `Starboard is now active!\n\n**Channel:** <#${guildData.starboard.channel}>`;

        if (guildData.starboard.emojis && guildData.starboard.emojis.length > 0) {
            const emojiList = guildData.starboard.emojis.map(e => `${e.emoji} (${e.threshold}+)`).join(', ');
            message_text += `\n**Emojis:** ${emojiList}`;
        } else {
            message_text += `\n\n⚠️ **No emojis configured!** Use \`.starboard emoji add <emoji> [threshold]\` to add star emojis.`;
        }

        const components = [buildNotice(`# ${EMOJIS.success} Starboard Unlocked`, message_text)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleLock(message, client, guildData) {
        const tip = getStarboardTip(guildData);

        if (!guildData.starboard.enabled) {
            const components = [buildNotice(`# ${EMOJIS.info} Already Locked`, 'Starboard is already inactive.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.enabled = false;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Starboard Locked`, 'Starboard has been disabled. Messages will no longer be added.')];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleSetChannel(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const channel = message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]);

        if (!channel) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Usage: `.starboard set #channel`\n\nPlease mention a valid channel.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Channel Type`, 'Starboard channel must be a text or announcement channel.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.channel = channel.id;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Channel Set`, `Starboard channel set to ${channel}.\n\nUse \`.starboard unlock\` to activate the system.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleEmoji(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const action = args[1]?.toLowerCase();
        const emoji = args[2];
        const threshold = parseInt(args[3]) || 3;

        if (!guildData.starboard.emojis) guildData.starboard.emojis = [];

        if (!action || action === 'list') {
            const emojiList = guildData.starboard.emojis.length > 0
                ? guildData.starboard.emojis.map(e => `${e.emoji} → **${e.threshold}+** reactions`).join('\n')
                : '*No emojis configured*';

            const components = [buildNotice(`# ⭐ Starboard Emojis`, `${emojiList}\n\n**Usage:**\n\`.starboard emoji add <emoji> [threshold]\`\n\`.starboard emoji remove <emoji>\``)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (action === 'add') {
            if (!emoji) {
                const components = [buildNotice(`# ${EMOJIS.error} Missing Emoji`, 'Usage: \`.starboard emoji add <emoji> [threshold]\`\n\nExample: \`.starboard emoji add ⭐ 5\`')];
                if (tip) components.push(buildTipContainer(tip));

                return message.reply({
                    components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            if (threshold < 1 || threshold > 100) {
                const components = [buildNotice(`# ${EMOJIS.error} Invalid Threshold`, 'Threshold must be between **1-100**.')];
                if (tip) components.push(buildTipContainer(tip));

                return message.reply({
                    components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const existing = guildData.starboard.emojis.find(e => e.emoji === emoji);
            if (existing) {
                existing.threshold = threshold;
                await this.saveGuildData(client, message.guildId, guildData.starboard);

                const components = [buildNotice(`# ${EMOJIS.success} Emoji Updated`, `${emoji} threshold updated to **${threshold}+** reactions.`)];
                if (tip) components.push(buildTipContainer(tip));

                return message.reply({
                    components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            guildData.starboard.emojis.push({ emoji, threshold });
            await this.saveGuildData(client, message.guildId, guildData.starboard);

            const components = [buildNotice(`# ${EMOJIS.success} Emoji Added`, `${emoji} added with **${threshold}+** reactions threshold.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (action === 'remove') {
            if (!emoji) {
                const components = [buildNotice(`# ${EMOJIS.error} Missing Emoji`, 'Usage: \`.starboard emoji remove <emoji>\`')];
                if (tip) components.push(buildTipContainer(tip));

                return message.reply({
                    components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const index = guildData.starboard.emojis.findIndex(e => e.emoji === emoji);
            if (index === -1) {
                const components = [buildNotice(`# ${EMOJIS.error} Not Found`, `${emoji} is not in the starboard emoji list.`)];
                if (tip) components.push(buildTipContainer(tip));

                return message.reply({
                    components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            guildData.starboard.emojis.splice(index, 1);
            await this.saveGuildData(client, message.guildId, guildData.starboard);

            const components = [buildNotice(`# ${EMOJIS.success} Emoji Removed`, `${emoji} has been removed from the starboard.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const components = [buildNotice(`# ${EMOJIS.error} Invalid Action`, 'Usage:\n\`.starboard emoji list\`\n\`.starboard emoji add <emoji> [threshold]\`\n\`.starboard emoji remove <emoji>\`')];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleSelfStar(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const setting = args[1]?.toLowerCase();
        const newValue = setting === 'true' || setting === 'yes' || setting === 'on' || setting === 'enable';

        if (!setting || !['true', 'false', 'yes', 'no', 'on', 'off', 'enable', 'disable'].includes(setting)) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Setting`, `**Current:** ${guildData.starboard.selfStar ? 'Enabled' : 'Disabled'}\n\nUsage: \`.starboard selfstar <true|false>\`\n\nAllow or prevent users from starring their own messages.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.selfStar = newValue;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Self-Star Updated`, `Self-starring is now **${newValue ? 'enabled' : 'disabled'}**.\n\nMembers ${newValue ? 'can' : 'cannot'} star their own messages.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleColor(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const color = args[1];

        if (!color) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Color`, `**Current:** ${guildData.starboard.color}\n\nUsage: \`.starboard color <hex>\`\n\nExamples:\n\`\`\`\n.starboard color #FFD700\n.starboard color FFD700\n\`\`\``)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const hex = color.startsWith('#') ? color : `#${color}`;
        if (!/^#[0-9A-F]{6}$/i.test(hex)) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Please provide a valid hex color code.\n\nExample: `#FFD700` or `FFD700`')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.color = hex;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Color Updated`, `Starboard embed color set to **${hex}**.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleTimestamp(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const setting = args[1]?.toLowerCase();
        const newValue = setting === 'true' || setting === 'yes' || setting === 'on' || setting === 'enable';

        if (!setting || !['true', 'false', 'yes', 'no', 'on', 'off', 'enable', 'disable'].includes(setting)) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Setting`, `**Current:** ${guildData.starboard.timestamp ? 'Enabled' : 'Disabled'}\n\nUsage: \`.starboard timestamp <true|false>\`\n\nShow or hide message timestamps.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.timestamp = newValue;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Timestamp Updated`, `Timestamps are now **${newValue ? 'shown' : 'hidden'}** on starboard messages.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleJumpUrl(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const setting = args[1]?.toLowerCase();
        const newValue = setting === 'true' || setting === 'yes' || setting === 'on' || setting === 'enable';

        if (!setting || !['true', 'false', 'yes', 'no', 'on', 'off', 'enable', 'disable'].includes(setting)) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Setting`, `**Current:** ${guildData.starboard.jumpUrl ? 'Enabled' : 'Disabled'}\n\nUsage: \`.starboard jumpurl <true|false>\`\n\nInclude or exclude jump-to-message links.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.jumpUrl = newValue;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Jump URL Updated`, `Jump URLs are now **${newValue ? 'included' : 'excluded'}** in starboard messages.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleAttachments(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const setting = args[1]?.toLowerCase();
        const newValue = setting === 'true' || setting === 'yes' || setting === 'on' || setting === 'enable';

        if (!setting || !['true', 'false', 'yes', 'no', 'on', 'off', 'enable', 'disable'].includes(setting)) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Setting`, `**Current:** ${guildData.starboard.attachments ? 'Enabled' : 'Disabled'}\n\nUsage: \`.starboard attachments <true|false>\`\n\nShow or hide message attachments.`)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.starboard.attachments = newValue;
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Attachments Updated`, `Attachments are now **${newValue ? 'shown' : 'hidden'}** on starboard messages.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleIgnore(message, args, client, guildData) {
        const tip = getStarboardTip(guildData);
        const action = args[1]?.toLowerCase();

        if (!action || action === 'list') {
            const config = guildData.starboard;
            let content = '**Ignored Channels:**\n';
            content += config.ignoredChannels.length > 0
                ? config.ignoredChannels.map(id => `<#${id}>`).join(', ')
                : '*None*';

            content += '\n\n**Ignored Roles:**\n';
            content += config.ignoredRoles.length > 0
                ? config.ignoredRoles.map(id => `<@&${id}>`).join(', ')
                : '*None*';

            content += '\n\n**Ignored Members:**\n';
            content += config.ignoredMembers.length > 0
                ? config.ignoredMembers.map(id => `<@${id}>`).join(', ')
                : '*None*';

            content += '\n\n**Usage:**\n`.starboard ignore <channel|role|member>`';

            const components = [buildNotice(`# 🚫 Ignore List`, content)];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const target = message.mentions.channels.first() ||
                      message.mentions.roles.first() ||
                      message.mentions.members.first() ||
                      message.guild.channels.cache.get(args[1]) ||
                      message.guild.roles.cache.get(args[1]) ||
                      message.guild.members.cache.get(args[1]);

        if (!target) {
            const components = [buildNotice(`# ${EMOJIS.error} Invalid Target`, 'Usage: `.starboard ignore <channel|role|member>`\n\nMention or provide an ID to ignore.')];
            if (tip) components.push(buildTipContainer(tip));

            return message.reply({
                components,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        let list, type;
        if (target.type === ChannelType.GuildText || target.type === ChannelType.GuildAnnouncement || target.type === ChannelType.GuildVoice) {
            list = 'ignoredChannels';
            type = 'channel';
        } else if (target.permissions !== undefined && !target.user) {
            list = 'ignoredRoles';
            type = 'role';
        } else {
            list = 'ignoredMembers';
            type = 'member';
        }

        const index = guildData.starboard[list].indexOf(target.id);
        let actionTaken;

        if (index === -1) {
            guildData.starboard[list].push(target.id);
            actionTaken = 'added to';
        } else {
            guildData.starboard[list].splice(index, 1);
            actionTaken = 'removed from';
        }

        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const targetName = type === 'channel' ? `<#${target.id}>` :
                          type === 'role' ? `<@&${target.id}>` :
                          `<@${target.id}>`;

        const components = [buildNotice(`# ${EMOJIS.success} Ignore List Updated`, `${targetName} has been **${actionTaken}** the starboard ignore list.`)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    showConfig(message, guildData) {
        const tip = getStarboardTip(guildData);
        const config = guildData.starboard;

        let content = `**Status:** ${config.enabled ? '✅ Active' : '❌ Inactive'}\n`;
        content += `**Channel:** ${config.channel ? `<#${config.channel}>` : 'Not Set'}\n\n`;

        const emojiList = config.emojis && config.emojis.length > 0
            ? config.emojis.map(e => `${e.emoji} (${e.threshold}+)`).join(', ')
            : 'None';

        content += `**Settings:**\n`;
        content += `• Emojis: ${emojiList}\n`;
        content += `• Self-Star: ${config.selfStar ? 'Enabled' : 'Disabled'}\n`;
        content += `• Color: ${config.color}\n\n`;

        content += `**Display:**\n`;
        content += `• Timestamp: ${config.timestamp ? 'Shown' : 'Hidden'}\n`;
        content += `• Jump URL: ${config.jumpUrl ? 'Included' : 'Excluded'}\n`;
        content += `• Attachments: ${config.attachments ? 'Shown' : 'Hidden'}\n\n`;

        content += `**Ignored:**\n`;
        content += `• Channels: ${config.ignoredChannels.length}\n`;
        content += `• Roles: ${config.ignoredRoles.length}\n`;
        content += `• Members: ${config.ignoredMembers.length}\n\n`;

        content += `**Stats:**\n`;
        content += `• Starred Messages: ${config.starredMessages.length}`;

        const components = [buildNotice(`# ⭐ Starboard Configuration`, content)];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleReset(message, client, guildData) {
        const tip = getStarboardTip(guildData);
        guildData.starboard = { ...DEFAULT_CONFIG };
        await this.saveGuildData(client, message.guildId, guildData.starboard);

        const components = [buildNotice(`# ${EMOJIS.success} Starboard Reset`, 'All starboard settings have been reset to defaults.\n\nUse `.starboard wizard` to set up again.')];
        if (tip) components.push(buildTipContainer(tip));

        return message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
