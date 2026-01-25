import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const DEFAULT_CONFIG = {
    enabled: false,
    channel: null,
    thankyouMessage: 'Thanks {user} for bumping! I\'ll remind you in 2 hours.',
    reminderMessage: 'It\'s time to bump the server! Use /bump',
    autoLock: false,
    autoClean: false,
    lastBump: null,
    nextBump: null,
    lastBumpUser: null
};

const buildNotice = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(title));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

export default {
    name: 'bumpreminder',
    aliases: ['br', 'bumpr'],
    description: 'Get reminders to /bump your server on Disboard',
    usage: 'bumpreminder [subcommand]',
    category: 'BumpReminder',

    async execute(message, args, client) {
        const guildData = await this.getGuildData(client, message.guildId);

        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Permission Denied`, 'You need **Manage Channels** permission to use bump reminder commands.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help' || subcommand === 'setup') {
            return this.showConfig(message, client, guildData);
        }

        switch (subcommand) {
            case 'channel':
                return this.handleChannel(message, args, client, guildData);
            case 'enable':
                return this.handleEnable(message, args, client, guildData);
            case 'disable':
                return this.handleDisable(message, args, client, guildData);
            case 'thankyou':
                return this.handleThankyou(message, args, client, guildData);
            case 'message':
                return this.handleMessage(message, args, client, guildData);
            case 'autolock':
                return this.handleAutolock(message, args, client, guildData);
            case 'autoclean':
                return this.handleAutoclean(message, args, client, guildData);
            case 'config':
                return this.showConfig(message, client, guildData);
            default:
                return this.showConfig(message, client, guildData);
        }
    },

    async getGuildData(client, guildId) {
        const data = await client.db.findOne({ guildId }) || { guildId };
        if (!data.bumpReminder) {
            data.bumpReminder = { ...DEFAULT_CONFIG };
        }
        return data;
    },

    async saveGuildData(client, guildId, bumpData) {
        await client.db.updateOne(
            { guildId },
            { $set: { bumpReminder: bumpData } },
            { upsert: true }
        );
    },

    async showConfig(message, client, guildData) {
        const config = guildData.bumpReminder || DEFAULT_CONFIG;
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(td =>
            td.setContent(`# 📣 Bump Reminder Configuration`)
        );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let statusText = `**Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        statusText += `**Channel:** ${config.channel ? `<#${config.channel}>` : 'Not Set'}\n`;
        statusText += `**Auto-Lock:** ${config.autoLock ? 'Enabled' : 'Disabled'}\n`;
        statusText += `**Auto-Clean:** ${config.autoClean ? 'Enabled' : 'Disabled'}`;

        if (config.lastBump) {
            statusText += `\n**Last Bump:** <t:${Math.floor(config.lastBump / 1000)}:R>`;
        }
        if (config.nextBump) {
            statusText += `\n**Next Bump:** <t:${Math.floor(config.nextBump / 1000)}:R>`;
        }

        container.addTextDisplayComponents(td => td.setContent(statusText));

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Available Commands:**\n` +
                `.bumpreminder channel <#channel> - Set bump channel\n` +
                `.bumpreminder enable - Enable bump reminder system\n` +
                `.bumpreminder disable - Disable bump reminder system\n` +
                `.bumpreminder thankyou [message] - Set/view thank you message\n` +
                `.bumpreminder message [message] - Set/view reminder message\n` +
                `.bumpreminder autolock <on|off> - Lock channel until bump is ready\n` +
                `.bumpreminder autoclean <on|off> - Auto-delete non-bump messages`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleChannel(message, args, client, guildData) {
        if (args.length < 2) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Usage`, 'Usage: `bumpreminder channel <#channel>`')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        let channel = message.mentions.channels.first();

        if (!channel) {

            const channelId = args[1].replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(channelId);
        }

        if (!channel) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Please mention a valid channel.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (!channel.isTextBased()) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Channel Type`, 'Bump reminder channel must be a text channel.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (guildData.bumpReminder.channel === channel.id) {
            return message.reply({
                components: [buildNotice(`# ℹ️ Already Set`, `Bump reminder is already using ${channel}.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.bumpReminder.channel = channel.id;
        guildData.bumpReminder.enabled = true;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(`# ${EMOJIS.success} Channel Set`, `Bump reminder channel set to ${channel}\n\n**Note:** Bump reminder is now enabled. Use \`.bumpreminder disable\` to turn it off.`)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleEnable(message, args, client, guildData) {
        if (!guildData.bumpReminder.channel) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} No Channel Set`, 'Please set a bump channel first using `.bumpreminder channel <#channel>`')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (guildData.bumpReminder.enabled) {
            return message.reply({
                components: [buildNotice(`# ℹ️ Already Enabled`, 'Bump reminder system is already enabled!')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.bumpReminder.enabled = true;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(`# ${EMOJIS.success} Bump Reminder Enabled`, `Bump reminder system has been enabled in <#${guildData.bumpReminder.channel}>`)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleDisable(message, args, client, guildData) {
        if (!guildData.bumpReminder.enabled) {
            return message.reply({
                components: [buildNotice(`# ℹ️ Already Disabled`, 'Bump reminder system is already disabled!')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.bumpReminder.enabled = false;

        guildData.bumpReminder.nextBump = null;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(`# ${EMOJIS.success} Bump Reminder Disabled`, `Bump reminder system has been disabled. Your settings have been saved and you can re-enable it anytime with \`.bumpreminder enable\``)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleThankyou(message, args, client, guildData) {

        if (args.length === 1 || args[1]?.toLowerCase() === 'view') {
            const currentMessage = guildData.bumpReminder.thankyouMessage || DEFAULT_CONFIG.thankyouMessage;
            return message.reply({
                components: [buildNotice(
                    `# 💚 Current Thank You Message`,
                    `**Message:** ${currentMessage}\n\n**Variables:**\n{user} - User who bumped\n{server} - Server name`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const newMessage = args.slice(1).join(' ');

        if (!newMessage || newMessage.length < 5) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Message`, 'Please provide a thank you message (minimum 5 characters).')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (newMessage.length > 500) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Message Too Long`, 'Thank you message must be 500 characters or less.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.bumpReminder.thankyouMessage = newMessage;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(`# ${EMOJIS.success} Thank You Message Updated`, `**New Message:** ${newMessage}`)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleMessage(message, args, client, guildData) {

        if (args.length === 1 || args[1]?.toLowerCase() === 'view') {
            const currentMessage = guildData.bumpReminder.reminderMessage || DEFAULT_CONFIG.reminderMessage;
            return message.reply({
                components: [buildNotice(
                    `# ⏰ Current Reminder Message`,
                    `**Message:** ${currentMessage}\n\n**Variables:**\n{user} - User who bumped\n{server} - Server name`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const newMessage = args.slice(1).join(' ');

        if (!newMessage || newMessage.length < 5) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Message`, 'Please provide a reminder message (minimum 5 characters).')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (newMessage.length > 500) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Message Too Long`, 'Reminder message must be 500 characters or less.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        guildData.bumpReminder.reminderMessage = newMessage;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(`# ${EMOJIS.success} Reminder Message Updated`, `**New Message:** ${newMessage}`)],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleAutolock(message, args, client, guildData) {
        if (args.length < 2) {
            const currentStatus = guildData.bumpReminder.autoLock ? 'Enabled' : 'Disabled';
            return message.reply({
                components: [buildNotice(
                    `# 🔒 Auto-Lock Status`,
                    `**Current Status:** ${currentStatus}\n\nUsage: .bumpreminder autolock <on|off>`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const choice = args[1].toLowerCase();

        if (!['on', 'off', 'enable', 'disable', 'true', 'false'].includes(choice)) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Choice`, 'Usage: `bumpreminder autolock <on|off>`')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const enabled = ['on', 'enable', 'true'].includes(choice);
        guildData.bumpReminder.autoLock = enabled;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(
                `# ${EMOJIS.success} Auto-Lock ${enabled ? 'Enabled' : 'Disabled'}`,
                enabled
                    ? 'The bump channel will be locked after a bump until the next bump is ready.'
                    : 'The bump channel will no longer be automatically locked.'
            )],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },

    async handleAutoclean(message, args, client, guildData) {
        if (args.length < 2) {
            const currentStatus = guildData.bumpReminder.autoClean ? 'Enabled' : 'Disabled';
            return message.reply({
                components: [buildNotice(
                    `# 🧹 Auto-Clean Status`,
                    `**Current Status:** ${currentStatus}\n\nUsage: .bumpreminder autoclean <on|off>`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const choice = args[1].toLowerCase();

        if (!['on', 'off', 'enable', 'disable', 'true', 'false'].includes(choice)) {
            return message.reply({
                components: [buildNotice(`# ${EMOJIS.error} Invalid Choice`, 'Usage: `bumpreminder autoclean <on|off>`')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const enabled = ['on', 'enable', 'true'].includes(choice);
        guildData.bumpReminder.autoClean = enabled;
        await this.saveGuildData(client, message.guildId, guildData.bumpReminder);

        return message.reply({
            components: [buildNotice(
                `# ${EMOJIS.success} Auto-Clean ${enabled ? 'Enabled' : 'Disabled'}`,
                enabled
                    ? 'Messages that aren\'t /bump will be automatically deleted.'
                    : 'Messages will no longer be automatically deleted.'
            )],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
