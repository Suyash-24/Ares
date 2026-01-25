import { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { sendAntinukeLog } from '../../../utils/antinukeLogger.js';

const MODULES = {
    ban: { name: 'Anti Ban', description: 'Prevents mass banning of members', emoji: '🔨' },
    kick: { name: 'Anti Kick', description: 'Prevents mass kicking of members', emoji: '👢' },
    role: { name: 'Anti Role', description: 'Prevents mass deletion/creation of roles', emoji: '🎭' },
    channel: { name: 'Anti Channel', description: 'Prevents mass deletion/creation of channels', emoji: '📁' },
    webhook: { name: 'Anti Webhook', description: 'Prevents mass creation of webhooks', emoji: '🪝' },
    emoji: { name: 'Anti Emoji', description: 'Prevents mass deletion of emojis', emoji: '😀' },
    botadd: { name: 'Anti Bot', description: 'Prevents unauthorized bot additions', emoji: '🤖' },
    vanity: { name: 'Anti Vanity', description: 'Prevents vanity URL changes', emoji: '🔗' },
    prune: { name: 'Anti Prune', description: 'Prevents mass member pruning', emoji: '✂️' },
    permissions: { name: 'Anti Permissions', description: 'Monitors dangerous permission grants', emoji: '⚠️' }
};

const PUNISHMENTS = {
    protocol: { name: 'Protocol', description: 'Removes all roles and applies timeout', severity: 1 },
    strip: { name: 'Strip Roles', description: 'Removes all dangerous roles', severity: 2 },
    kick: { name: 'Kick', description: 'Kicks the user from server', severity: 3 },
    ban: { name: 'Ban', description: 'Permanently bans the user', severity: 4 },
    timeout: { name: 'Timeout', description: 'Times out for 28 days', severity: 2 }
};

const DANGEROUS_PERMISSIONS = [
    'Administrator', 'BanMembers', 'KickMembers', 'ManageGuild',
    'ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageEmojisAndStickers',
    'MentionEveryone', 'ModerateMembers', 'ManageNicknames', 'ViewAuditLog'
];

const PRESETS = {
    recommended: {
        name: 'Recommended',
        description: 'Balanced protection for most servers',
        threshold: 3,
        window: 60,
        punishment: 'ban',
        modules: ['ban', 'kick', 'role', 'channel', 'webhook', 'botadd']
    },
    strict: {
        name: 'Strict',
        description: 'Maximum protection for high-risk servers',
        threshold: 2,
        window: 60,
        punishment: 'ban',
        modules: ['ban', 'kick', 'role', 'channel', 'webhook', 'emoji', 'botadd', 'vanity', 'prune', 'permissions']
    },
    light: {
        name: 'Light',
        description: 'Basic protection with higher tolerance',
        threshold: 5,
        window: 60,
        punishment: 'kick',
        modules: ['ban', 'kick', 'channel']
    }
};

const cleanId = (raw) => (typeof raw === 'string' ? raw.replace(/[<@!>]/g, '').trim() : null);

const fetchUserOrMember = async (client, guild, raw) => {
    const id = cleanId(raw);
    if (!id) return null;

    const member = await guild.members.fetch(id).catch(() => null);
    if (member) return { user: member.user, member };

    const user = await client.users.fetch(id).catch(() => null);
    if (user) return { user, member: guild.members.cache.get(user.id) || null };

    return null;
};

const buildWizardContainer = (guildData, viewMode = null, disabled = false) => {
    const container = new ContainerBuilder();

    const status = guildData.antinuke?.enabled;
    const enabledModules = Object.entries(guildData.antinuke?.modules || {})
        .filter(([_, m]) => m.enabled).length;
    const totalModules = Object.keys(MODULES).length;

    container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.antinukeemoji || '🛡️'} Antinuke Setup Wizard${disabled ? ' (Expired)' : ''}\n` +
            `${disabled ? '⏰ **This wizard has expired. Run the command again to create a new one.**\n\n' : ''}` +
            `Configure your server's protection system with ease.\n\n` +
            `**Current Status:** ${status ? `${EMOJIS.success || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}\n` +
            `**Active Modules:** ${enabledModules}/${totalModules}\n` +
            `**Punishment:** ${guildData.antinuke?.defaultPunishment || 'ban'}\n` +
            `**Threshold:** ${guildData.antinuke?.defaultThreshold || 3} actions`)
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`### Quick Setup Presets\nChoose a preset to quickly configure protection:`)
    );

    const getPresetKey = () => {

        if (guildData.antinuke?.appliedPreset === 'custom') {
            console.log(`[BuildWizard] Custom config detected (manual changes made)`);
            return null;
        }

        if (guildData.antinuke?.appliedPreset && guildData.antinuke.appliedPreset !== 'custom') {
            return guildData.antinuke.appliedPreset;
        }

        const enabledModules = Object.keys(guildData.antinuke?.modules || {}).filter(m => guildData.antinuke.modules[m]?.enabled);
        const enabledKeys = new Set(enabledModules);

        console.log(`[BuildWizard] Enabled modules:`, enabledModules);
        console.log(`[BuildWizard] Enabled keys:`, Array.from(enabledKeys));

        const recommendedKeys = new Set(['ban', 'kick', 'role', 'channel', 'webhook', 'botadd']);
        const strictKeys = new Set(['ban', 'kick', 'role', 'channel', 'webhook', 'emoji', 'botadd', 'vanity', 'prune', 'permissions']);
        const lightKeys = new Set(['ban', 'kick', 'channel']);

        console.log(`[BuildWizard] Recommended keys:`, Array.from(recommendedKeys));
        console.log(`[BuildWizard] Strict keys:`, Array.from(strictKeys));
        console.log(`[BuildWizard] Light keys:`, Array.from(lightKeys));

        if (enabledKeys.size === recommendedKeys.size && [...enabledKeys].every(k => recommendedKeys.has(k))) {
            console.log(`[BuildWizard] Detected preset: recommended`);
            return 'recommended';
        }
        if (enabledKeys.size === strictKeys.size && [...enabledKeys].every(k => strictKeys.has(k))) {
            console.log(`[BuildWizard] Detected preset: strict`);
            return 'strict';
        }
        if (enabledKeys.size === lightKeys.size && [...enabledKeys].every(k => lightKeys.has(k))) {
            console.log(`[BuildWizard] Detected preset: light`);
            return 'light';
        }
        console.log(`[BuildWizard] No preset detected (custom config)`);
        return null;
    };

    const currentPreset = getPresetKey();

    const presetRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('antinuke_preset_recommended')
            .setLabel('Recommended')
            .setEmoji('⚖️')
            .setStyle(currentPreset === 'recommended' ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(disabled || currentPreset === 'recommended'),
        new ButtonBuilder()
            .setCustomId('antinuke_preset_strict')
            .setLabel('Strict')
            .setEmoji('🔒')
            .setStyle(currentPreset === 'strict' ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(disabled || currentPreset === 'strict'),
        new ButtonBuilder()
            .setCustomId('antinuke_preset_light')
            .setLabel('Light')
            .setEmoji('🪶')
            .setStyle(currentPreset === 'light' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled || currentPreset === 'light')
    );

    container.addActionRowComponents(presetRow);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(`### Manual Configuration`)
    );

    const configRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('antinuke_modules')
            .setLabel('Modules')
            .setEmoji('📦')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('antinuke_punishment_menu')
            .setLabel('Punishment')
            .setEmoji('⚡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('antinuke_thresholds')
            .setLabel('Thresholds')
            .setEmoji('📊')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('antinuke_whitelist_view')
            .setLabel('Whitelist')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('antinuke_admins_view')
            .setLabel('Admins')
            .setEmoji('👤')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(configRow);

    const toggleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`antinuke_toggle_${status ? 'off' : 'on'}`)
            .setLabel(status ? 'Disable Antinuke' : 'Enable Antinuke')
            .setEmoji(status ? '🔴' : '🟢')
            .setStyle(status ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('antinuke_view_config')
            .setLabel('View Full Config')
            .setEmoji('📊')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    container.addActionRowComponents(toggleRow);

    return container;
};

export default {
    name: 'antinuke',
    aliases: ['antiwizard'],
    description: 'Advanced server protection system inspired by Bleed & Wick',
    usage: '.antinuke [subcommand]',
    category: 'Antinuke',

    async execute(message, args, client) {
        const guildData = await this.getGuildData(client, message.guildId);

        const isOwner = message.guild.ownerId === message.author.id;
        const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
        const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
        const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

        if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
            return this.sendError(
                message,
                'Permission Denied',
                'You need Discord Administrator permission **and** to be a configured antinuke admin/extra owner (or the server owner) to use antinuke.'
            );
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help') {
            return this.showHelp(message, guildData);
        }

        const ownerOnlyCommands = ['extraowner', 'extraowners', 'reset'];
        if (ownerOnlyCommands.includes(subcommand) && !isOwner) {
            return this.sendError(message, 'Owner Only', 'Only the server owner can use this command.');
        }

        switch (subcommand) {
            case 'wizard':
            case 'setup':
                return this.showSetupWizard(message, client, guildData);
            case 'on':
            case 'enable':
                return this.handleEnable(message, client, guildData);
            case 'off':
            case 'disable':
                return this.handleDisable(message, client, guildData);
            case 'preset':
                return this.handlePreset(message, args, client, guildData);
            case 'admin':
                return this.handleAdmin(message, args, client, guildData, isOwner);
            case 'admins':
                return this.handleAdminsList(message, guildData);
            case 'extraowner':
                return this.handleExtraOwner(message, args, client, guildData);
            case 'extraowners':
                return this.handleExtraOwnersList(message, guildData);
            case 'whitelist':
            case 'wl':
                return this.handleWhitelist(message, args, client, guildData);
            case 'list':
                return this.handleList(message, guildData);
            case 'config':
            case 'settings':
                return this.handleConfig(message, guildData);
            case 'protocol':
                return this.handleProtocol(message, args, client, guildData);
            case 'unprotocol':
            case 'unp':
                return this.handleUnprotocol(message, args, client, guildData);
            case 'protocol-list':
                return this.handleProtocolList(message, client, guildData);
            case 'logs':
            case 'logchannel':
                return this.handleLogChannel(message, args, client, guildData);
            case 'punishment':
            case 'punish':
                return this.handlePunishment(message, args, client, guildData);
            case 'threshold':
            case 'limit':
                return this.handleThreshold(message, args, client, guildData);
            case 'strictbot':
            case 'strict-bot':
            case 'botverify':
                return this.handleStrictBot(message, args, client, guildData);
            case 'reset':
                return this.handleReset(message, client, guildData);
            default:
                if (MODULES[subcommand]) {
                    return this.handleModule(message, args, client, guildData, subcommand);
                }
                return this.showHelp(message, guildData);
        }
    },

    async getGuildData(client, guildId) {
        const data = await client.db.findOne({ guildId }) || { guildId };
        if (!data.antinuke) {
            data.antinuke = {
                enabled: false,
                admins: [],
                extraOwners: [],
                whitelist: [],
                modules: {},
                quarantineRole: null,
                logChannel: null,
                defaultPunishment: 'ban',
                defaultThreshold: 3,
                defaultWindow: 60,
                protocol: [],
                strictBotVerification: true
            };
        }

        if (data.antinuke.strictBotVerification === undefined) {
            data.antinuke.strictBotVerification = true;
        }

        if (data.antinuke.defaultPunishment === 'quarantine') {
            data.antinuke.defaultPunishment = 'protocol';
        }
        for (const [module, cfg] of Object.entries(data.antinuke.modules || {})) {
            if (cfg?.punishment === 'quarantine') {
                cfg.punishment = 'protocol';
            }
        }

        return data;
    },

    async saveGuildData(client, guildId, antinuke) {
        await client.db.updateOne(
            { guildId },
            { $set: { antinuke } },
            { upsert: true }
        );
    },

    async showSetupWizard(message, client, guildData) {
        const container = buildWizardContainer(guildData);
        const reply = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        if (!client.antinukeWizards) client.antinukeWizards = new Map();
        client.antinukeWizards.set(reply.id, {
            authorId: message.author.id,
            createdAt: Date.now(),
            guildId: message.guildId
        });

        setTimeout(async () => {
            try {
                const disabledContainer = buildWizardContainer(guildData, null, true);
                await reply.edit({ components: [disabledContainer] }).catch(() => {});
                client.antinukeWizards.delete(reply.id);
            } catch (e) {

            }
        }, 5 * 60 * 1000);

        return reply;
    },

    async handleEnable(message, client, guildData) {
        if (guildData.antinuke?.enabled) {
            return this.sendInfo(message, 'Already Enabled', 'Antinuke protection is already active on this server.');
        }

        guildData.antinuke.enabled = true;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: 'System Enabled',
            details: 'Antinuke protection system has been activated'
        });

        return this.sendSuccess(message, 'Antinuke Enabled',
            'Server protection is now **active**.\n\n' +
            `Use \`.antinuke wizard\` to configure modules or \`.antinuke preset recommended\` for quick setup.`);
    },

    async handleDisable(message, client, guildData) {
        if (!guildData.antinuke?.enabled) {
            return this.sendInfo(message, 'Already Disabled', 'Antinuke protection is already disabled.');
        }

        guildData.antinuke.enabled = false;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: 'System Disabled',
            details: '⚠️ Antinuke protection system has been deactivated'
        });

        return this.sendSuccess(message, 'Antinuke Disabled',
            'Server protection has been **disabled**.\n⚠️ Your server is now vulnerable to nuke attacks.');
    },

    async handlePreset(message, args, client, guildData) {
        const presetName = args[1]?.toLowerCase();

        if (!presetName || !PRESETS[presetName]) {
            let content = '**Available Presets:**\n\n';
            for (const [key, preset] of Object.entries(PRESETS)) {
                content += `**${preset.name}** - \`.antinuke preset ${key}\`\n`;
                content += `└ ${preset.description}\n`;
                content += `└ Threshold: ${preset.threshold} | Punishment: ${preset.punishment}\n`;
                content += `└ Modules: ${preset.modules.length}\n\n`;
            }
            return this.sendInfo(message, 'Setup Presets', content);
        }

        const preset = PRESETS[presetName];

        guildData.antinuke.enabled = true;
        guildData.antinuke.defaultThreshold = preset.threshold;
        guildData.antinuke.defaultWindow = preset.window;
        guildData.antinuke.defaultPunishment = preset.punishment;
        guildData.antinuke.modules = {};

        for (const mod of preset.modules) {
            guildData.antinuke.modules[mod] = {
                enabled: true,
                threshold: preset.threshold,
                window: preset.window,
                punishment: preset.punishment
            };
        }

        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: `Preset Applied: ${preset.name}`,
            details: `Modules enabled: ${preset.modules.map(m => MODULES[m].name).join(', ')}`,
            changes: {
                'Threshold': `${preset.threshold}`,
                'Punishment': preset.punishment,
                'Modules': `${preset.modules.length} enabled`
            }
        });

        return this.sendSuccess(message, `${preset.name} Preset Applied`,
            `Antinuke is now **enabled** with the ${preset.name} preset!\n\n` +
            `**Modules Enabled:** ${preset.modules.map(m => MODULES[m].name).join(', ')}\n` +
            `**Threshold:** ${preset.threshold} actions in ${preset.window}s\n` +
            `**Punishment:** ${preset.punishment}\n\n` +
            `*Use \`.antinuke config\` to view full configuration*`);
    },

    async handleAdmin(message, args, client, guildData, isOwner) {
        const rawTarget = ['add', 'remove', 'toggle'].includes(args[1]?.toLowerCase()) ? args[2] : args[1];
        const target = (message.mentions.users.first() || (await fetchUserOrMember(client, message.guild, rawTarget))?.user);

        if (!target) {
            return this.sendError(message, 'Invalid Usage',
                'Usage: `.antinuke admin @user` or `.antinuke admin <userId>`\n' +
                'Toggles antinuke admin status for the user.\n\n' +
                '*Admins can configure antinuke settings but cannot manage other admins or extra owners.*');
        }

        if (target.id === message.guild.ownerId) {
            return this.sendError(message, 'Invalid Target', 'The server owner is always an admin.');
        }

        if (target.id === client.user.id) {
            return this.sendError(message, 'Invalid Target', 'Cannot modify bot permissions.');
        }

        if (!guildData.antinuke.admins) guildData.antinuke.admins = [];

        const index = guildData.antinuke.admins.indexOf(target.id);
        let action;

        if (index === -1) {
            guildData.antinuke.admins.push(target.id);
            action = 'added to';
        } else {
            guildData.antinuke.admins.splice(index, 1);
            action = 'removed from';
        }

        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: action === 'added to' ? 'Admin Added' : 'Admin Removed',
            details: `${target.tag}\n(ID: ${target.id})`,
            changes: {
                'User': target.username,
                'Status': action === 'added to' ? 'Added as Admin' : 'Removed from Admins'
            }
        });

        return this.sendSuccess(message, 'Admin Updated',
            `**${target.username}** has been ${action} antinuke admins.\n` +
            `They can now ${action === 'added to' ? 'configure' : 'no longer configure'} antinuke settings.`);
    },

    async handleAdminsList(message, guildData) {
        const admins = guildData.antinuke?.admins || [];

        if (admins.length === 0) {
            return this.sendInfo(message, 'Antinuke Admins',
                'No antinuke admins configured.\n' +
                'The server owner always has full access.\n\n' +
                '*Add admins with `.antinuke admin @user`*');
        }

        const adminList = admins.map((id, i) => `\`${i + 1}\` <@${id}>`).join('\n');
        return this.sendInfo(message, `Antinuke Admins (${admins.length})`,
            `${adminList}\n\n*The server owner and extra owners always have full access.*`);
    },

    async handleExtraOwner(message, args, client, guildData) {
        const rawTarget = ['add', 'remove', 'toggle'].includes(args[1]?.toLowerCase()) ? args[2] : args[1];
        const target = (message.mentions.users.first() || (await fetchUserOrMember(client, message.guild, rawTarget))?.user);

        if (!target) {
            return this.sendError(message, 'Invalid Usage',
                'Usage: `.antinuke extraowner @user` or `.antinuke extraowner <userId>`\n' +
                'Toggles extra owner status for the user.\n\n' +
                '⚠️ **Warning:** Extra owners have FULL control over antinuke, equivalent to the server owner.');
        }

        if (target.id === message.guild.ownerId) {
            return this.sendError(message, 'Invalid Target', 'The server owner cannot be an extra owner.');
        }

        if (!guildData.antinuke.extraOwners) guildData.antinuke.extraOwners = [];

        const index = guildData.antinuke.extraOwners.indexOf(target.id);
        let action;

        if (index === -1) {
            guildData.antinuke.extraOwners.push(target.id);
            action = 'added as';
        } else {
            guildData.antinuke.extraOwners.splice(index, 1);
            action = 'removed from';
        }

        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: action === 'added as' ? 'Extra Owner Added' : 'Extra Owner Removed',
            details: `${target.tag}\n(ID: ${target.id})\n\n⚠️ Extra owners have full antinuke control`,
            changes: {
                'User': target.username,
                'Status': action === 'added as' ? 'Granted Extra Owner' : 'Revoked Extra Owner'
            }
        });

        return this.sendSuccess(message, 'Extra Owner Updated',
            `**${target.username}** has been ${action} extra owner.\n` +
            `They now have ${action === 'added as' ? 'full antinuke control' : 'standard permissions'}.`);
    },

    async handleExtraOwnersList(message, guildData) {
        const owners = guildData.antinuke?.extraOwners || [];

        if (owners.length === 0) {
            return this.sendInfo(message, 'Extra Owners',
                'No extra owners configured.\n\n' +
                '*Add extra owners with `.antinuke extraowner @user`*\n' +
                '⚠️ Use this sparingly - extra owners have full control.');
        }

        const ownerList = owners.map((id, i) => `\`${i + 1}\` <@${id}>`).join('\n');
        return this.sendInfo(message, `Extra Owners (${owners.length})`, ownerList);
    },

    async handleWhitelist(message, args, client, guildData) {
        const action = args[1]?.toLowerCase();
        const targetArg = ['add', 'remove'].includes(action) ? args[2] : args[1];
        const target = (message.mentions.users.first() || (await fetchUserOrMember(client, message.guild, targetArg))?.user);

        if (!action || action === 'list') {
            const whitelist = guildData.antinuke?.whitelist || [];
            if (whitelist.length === 0) {
                return this.sendInfo(message, 'Antinuke Whitelist',
                    'No users are whitelisted.\n\n' +
                    '**Commands:**\n' +
                    '`.antinuke whitelist add @user` - Add to whitelist\n' +
                    '`.antinuke whitelist remove @user` - Remove from whitelist');
            }
            const wlList = whitelist.map((id, i) => `\`${i + 1}\` <@${id}>`).join('\n');
            return this.sendInfo(message, `Antinuke Whitelist (${whitelist.length})`,
                `${wlList}\n\n*Whitelisted users are immune to antinuke checks.*`);
        }

        if ((action === 'add' || action === 'remove') && target) {
            if (!guildData.antinuke.whitelist) guildData.antinuke.whitelist = [];

            if (action === 'add') {
                if (guildData.antinuke.whitelist.includes(target.id)) {
                    return this.sendError(message, 'Already Whitelisted', `**${target.username}** is already whitelisted.`);
                }
                guildData.antinuke.whitelist.push(target.id);
            } else {
                const index = guildData.antinuke.whitelist.indexOf(target.id);
                if (index === -1) {
                    return this.sendError(message, 'Not Whitelisted', `**${target.username}** is not in the whitelist.`);
                }
                guildData.antinuke.whitelist.splice(index, 1);
            }

            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: action === 'add' ? 'Whitelist Added' : 'Whitelist Removed',
                details: `${target.tag}\n(ID: ${target.id})`,
                changes: {
                    'User': target.username,
                    'Status': action === 'add' ? 'Added to Whitelist' : 'Removed from Whitelist'
                }
            });
            return this.sendSuccess(message, 'Whitelist Updated',
                `**${target.username}** has been ${action === 'add' ? 'added to' : 'removed from'} the whitelist.`);
        }

        if (target) {
            if (!guildData.antinuke.whitelist) guildData.antinuke.whitelist = [];

            const index = guildData.antinuke.whitelist.indexOf(target.id);
            let resultAction;

            if (index === -1) {
                guildData.antinuke.whitelist.push(target.id);
                resultAction = 'added to';
            } else {
                guildData.antinuke.whitelist.splice(index, 1);
                resultAction = 'removed from';
            }

            await this.saveGuildData(client, message.guildId, guildData.antinuke);
            return this.sendSuccess(message, 'Whitelist Updated',
                `**${target.username}** has been ${resultAction} the whitelist.`);
        }

        return this.sendError(message, 'Invalid Usage',
            '**Usage:**\n' +
            '`.antinuke whitelist` - View whitelist\n' +
            '`.antinuke whitelist @user` - Toggle whitelist\n' +
            '`.antinuke whitelist add @user` - Add to whitelist\n' +
            '`.antinuke whitelist remove @user` - Remove from whitelist');
    },

    async handleList(message, guildData) {
        const modules = guildData.antinuke?.modules || {};
        const whitelist = guildData.antinuke?.whitelist || [];
        const admins = guildData.antinuke?.admins || [];
        const trustedAdmins = guildData.antinuke?.trustedAdmins || [];

        const enabledModules = Object.entries(modules)
            .filter(([_, config]) => config.enabled)
            .map(([name, config]) => `${EMOJIS.success || '✅'} **${MODULES[name]?.name || name}** → ${config.threshold}/${config.punishment}`);

        const disabledModules = Object.keys(MODULES)
            .filter(name => !modules[name]?.enabled)
            .map(name => `${EMOJIS.error || '❌'} **${MODULES[name].name}**`);

        let content = `**Status:** ${guildData.antinuke?.enabled ? `${EMOJIS.success || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}\n`;
        content += `**Default Punishment:** ${guildData.antinuke?.defaultPunishment || 'ban'}\n`;
        content += `**Default Threshold:** ${guildData.antinuke?.defaultThreshold || 3}\n\n`;

        content += `**Enabled Modules (${enabledModules.length})**\n`;
        content += enabledModules.length > 0 ? enabledModules.join('\n') : '*No modules enabled*';

        content += `\n\n**Disabled Modules (${disabledModules.length})**\n`;
        content += disabledModules.length > 0 ? disabledModules.slice(0, 5).join('\n') : '*All modules enabled*';
        if (disabledModules.length > 5) content += `\n*...and ${disabledModules.length - 5} more*`;

        content += `\n\n**Users:** ${whitelist.length} whitelisted | ${admins.length} admins | ${trustedAdmins.length} trusted`;

        return this.sendInfo(message, 'Antinuke Overview', content);
    },

    async handleConfig(message, guildData) {
        const an = guildData.antinuke || {};
        const modules = an.modules || {};

        let content = `**System Status:** ${an.enabled ? `${EMOJIS.success || '✅'} Active` : `${EMOJIS.error || '❌'} Inactive`}\n`;
        content += `**Log Channel:** ${an.logChannel ? `<#${an.logChannel}>` : 'Not set'}\n`;
        content += `**Protocol Role (legacy):** ${an.quarantineRole ? `<@&${an.quarantineRole}>` : 'Not used'}\n\n`;

        content += `**Defaults:**\n`;
        content += `• Punishment: \`${an.defaultPunishment || 'ban'}\`\n`;
        content += `• Threshold: \`${an.defaultThreshold || 3}\` actions\n`;
        content += `• Time Window: \`${an.defaultWindow || 60}s\`\n\n`;

        content += `**Module Status:**\n`;
        for (const [name, info] of Object.entries(MODULES)) {
            const config = modules[name];
            if (config?.enabled) {
                content += `${EMOJIS.success || '✅'} **${info.name}** - T:${config.threshold} | P:${config.punishment}\n`;
            } else {
                content += `${EMOJIS.error || '❌'} **${info.name}**\n`;
            }
        }

        content += `\n**Permission Tiers:**\n`;
        content += `• Extra Owners: ${(an.extraOwners || []).length}\n`;
        content += `• Trusted Admins: ${(an.trustedAdmins || []).length}\n`;
        content += `• Admins: ${(an.admins || []).length}\n`;
        content += `• Whitelisted: ${(an.whitelist || []).length}\n\n`;

        content += `**Bot Protection:**\n`;
        content += `• Strict Bot Verification: ${an.strictBotVerification !== false ? '✅ Enabled' : '❌ Disabled'}`;

        return this.sendInfo(message, 'Full Configuration', content);
    },

    async handleProtocol(message, args, client, guildData) {
        const target = (message.mentions.members.first() || (await fetchUserOrMember(client, message.guild, args[1]))?.member);

        if (!target) {
            return this.sendError(message, 'Invalid Usage',
                'Usage: `.antinuke protocol @user [reason]`\n' +
                'Manually apply protocol to a suspicious user.');
        }

        if (target.id === message.guild.ownerId) {
            return this.sendError(message, 'Cannot Protocol', 'Cannot apply protocol to the server owner.');
        }

        if (target.id === client.user.id) {
            return this.sendError(message, 'Cannot Protocol', 'Cannot apply protocol to myself.');
        }

        const reason = args.slice(2).join(' ') || 'Manual protocol by antinuke admin';
        const TIMEOUT_MS = 27 * 24 * 60 * 60 * 1000;

        if (!target.moderatable || !target.manageable) {
            return this.sendError(message, 'Cannot Protocol', 'I cannot modify this member due to role hierarchy or permissions.');
        }

        try {
            const rolesToRemove = target.roles.cache.filter(r => r.id !== message.guild.id && r.editable);
            const removedRoles = rolesToRemove.map(r => r.id);

            await target.roles.remove(rolesToRemove, reason);

            let timeoutApplied = false;
            let timeoutError = null;
            try {
                await target.timeout(TIMEOUT_MS, reason);
                timeoutApplied = true;
            } catch (tErr) {
                timeoutError = tErr;
            }

            if (!guildData.antinuke.protocol) guildData.antinuke.protocol = [];

            const existing = guildData.antinuke.protocol.find(p => p.id === target.id);
            if (existing) {
                existing.roles = [...new Set([...existing.roles, ...removedRoles])];
            } else {
                guildData.antinuke.protocol.push({
                    id: target.id,
                    roles: removedRoles,
                    by: message.author.id,
                    at: Date.now(),
                    reason
                });
            }

            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            const timeoutLine = timeoutApplied
                ? '• 27-day timeout applied'
                : `• Timeout not applied (Discord rejected request${timeoutError ? `: ${timeoutError.message}` : ''})`;

            return this.sendSuccess(message, 'User Protocol Applied',
                `**${target.user.username}** has been placed under protocol.\n` +
                `• ${removedRoles.length} roles removed\n` +
                `${timeoutLine}\n` +
                `• Reason: ${reason}\n\n` +
                `*Use \`.antinuke unprotocol @user\` to restore their roles.*`);
        } catch (error) {
            return this.sendError(message, 'Protocol Failed', `Could not apply protocol: ${error.message}`);
        }
    },

    async handleUnprotocol(message, args, client, guildData) {
        const target = (message.mentions.members.first() || (await fetchUserOrMember(client, message.guild, args[1]))?.member);

        if (!target) {
            return this.sendError(message, 'Invalid Usage',
                'Usage: `.antinuke unprotocol @user`\n' +
                'Restore a protocol user\'s roles.');
        }

        if (!guildData.antinuke.protocol) guildData.antinuke.protocol = [];

        const protocolRecord = guildData.antinuke.protocol.find(p => p.id === target.id);

        if (!protocolRecord) {
            return this.sendError(message, 'Not Under Protocol',
                `**${target.user.username}** is not under protocol.`);
        }

        try {
            const rolesToRestore = protocolRecord.roles
                .map(id => message.guild.roles.cache.get(id))
                .filter(r => r && r.editable);

            await target.timeout(null, 'Protocol removed by antinuke admin');

            await target.roles.add(rolesToRestore, 'Protocol removed by antinuke admin');

            guildData.antinuke.protocol = guildData.antinuke.protocol.filter(p => p.id !== target.id);
            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: 'Protocol Removed',
                details: `${target.user.tag}\n(ID: ${target.id})\n\nRoles restored: ${rolesToRestore.length}`,
                changes: {
                    'User': target.user.username,
                    'Status': 'Released from Protocol'
                }
            });

            return this.sendSuccess(message, 'Protocol Removed',
                `**${target.user.username}** has been removed from protocol.\n` +
                `• ${rolesToRestore.length} roles restored\n` +
                `• Timeout removed`);
        } catch (error) {
            return this.sendError(message, 'Protocol Removal Failed', `Could not remove protocol: ${error.message}`);
        }
    },

    async handleProtocolList(message, client, guildData) {
        const protocol = guildData.antinuke?.protocol || [];

        if (protocol.length === 0) {
            return this.sendInfo(message, 'Protocol Users', 'No users are currently under protocol.');
        }

        const list = protocol.slice(0, 10).map((p, i) => {
            const time = Math.floor(p.at / 1000);
            return `\`${i + 1}\` <@${p.id}> - <t:${time}:R>\n   └ ${p.roles.length} roles | By: <@${p.by}>`;
        }).join('\n');

        return this.sendInfo(message, `Protocol Users (${protocol.length})`,
            `${list}${protocol.length > 10 ? `\n\n*...and ${protocol.length - 10} more*` : ''}`);
    },

    async handleLogChannel(message, args, client, guildData) {
        const channel = message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]);

        if (!channel && args[1]?.toLowerCase() !== 'off' && args[1]?.toLowerCase() !== 'disable') {
            if (guildData.antinuke?.logChannel) {
                return this.sendInfo(message, 'Log Channel',
                    `Current log channel: <#${guildData.antinuke.logChannel}>\n\n` +
                    `*Change with \`.antinuke logs #channel\`*\n` +
                    `*Disable with \`.antinuke logs off\`*`);
            }
            return this.sendError(message, 'Invalid Usage',
                'Usage: `.antinuke logs #channel`\n' +
                'Set the channel for antinuke logs.');
        }

        if (args[1]?.toLowerCase() === 'off' || args[1]?.toLowerCase() === 'disable') {
            const oldChannel = guildData.antinuke.logChannel;
            guildData.antinuke.logChannel = null;
            await this.saveGuildData(client, message.guildId, guildData.antinuke);
            if (oldChannel) {
                const oldCh = message.guild.channels.cache.get(oldChannel);
                if (oldCh) {
                    await sendAntinukeLog(client, guildData, message.guild, {
                        eventType: 'configChange',
                        executor: { id: message.author.id, tag: message.author.tag },
                        action: 'Log Channel Disabled',
                        details: 'Antinuke logging has been turned off'
                    });
                }
            }
            return this.sendSuccess(message, 'Logs Disabled', 'Antinuke logging has been disabled.');
        }

        guildData.antinuke.logChannel = channel.id;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: 'Log Channel Updated',
            details: `New log channel: ${channel.name}`,
            changes: {
                'Channel': `#${channel.name}`,
                'Channel ID': channel.id
            }
        });

        return this.sendSuccess(message, 'Log Channel Set',
            `Antinuke logs will now be sent to ${channel}.`);
    },

    async handlePunishment(message, args, client, guildData) {
        let punishment = args[1]?.toLowerCase();
        if (punishment === 'quarantine') punishment = 'protocol';

        if (!punishment) {
            let content = `**Current Default:** ${guildData.antinuke?.defaultPunishment || 'ban'}\n\n`;
            content += '**Available Punishments:**\n';
            for (const [key, info] of Object.entries(PUNISHMENTS)) {
                content += `• \`${key}\` - ${info.description}\n`;
            }
            content += '\n*Usage: `.antinuke punishment <type>`*';
            return this.sendInfo(message, 'Punishment Settings', content);
        }

        if (!PUNISHMENTS[punishment]) {
            return this.sendError(message, 'Invalid Punishment',
                `Valid punishments: ${Object.keys(PUNISHMENTS).join(', ')}`);
        }

        const modules = guildData.antinuke?.modules || {};
        const currentDefaultPunish = guildData.antinuke?.defaultPunishment || 'ban';
        const hasCustomModulePunish = Object.values(modules).some(cfg => cfg?.enabled && cfg.punishment && cfg.punishment !== currentDefaultPunish);

        if (hasCustomModulePunish) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.warning || '⚠️'} Override Module Punishments?`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `Per-module punishments are configured.
Applying default punishment to **${punishment}** will override all module punishments.

Confirm to proceed.`
            ));
            container.addActionRowComponents(row => row.addComponents(
                new ButtonBuilder().setCustomId(`antinuke_default_punish_confirm_${message.author.id}_${punishment}`).setLabel('Confirm Override').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`antinuke_default_punish_cancel_${message.author.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            ));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
        }

        const oldPunishment = guildData.antinuke.defaultPunishment || 'ban';
        guildData.antinuke.defaultPunishment = punishment;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: 'Default Punishment Changed',
            details: `Changed from \`${oldPunishment}\` to \`${punishment}\``,
            changes: {
                'Old Punishment': oldPunishment,
                'New Punishment': punishment
            }
        });

        return this.sendSuccess(message, 'Default Punishment Updated',
            `Default punishment is now **${punishment}**.\n` +
            `This applies to all newly configured modules.`);
    },

    async handleThreshold(message, args, client, guildData) {
        const threshold = parseInt(args[1]);

        if (!threshold || threshold < 1 || threshold > 20) {
            return this.sendError(message, 'Invalid Threshold',
                `**Current Default:** ${guildData.antinuke?.defaultThreshold || 3}\n\n` +
                'Usage: `.antinuke threshold <1-20>`\n' +
                'Sets the default action limit before punishment.');
        }

        const modules = guildData.antinuke?.modules || {};
        const currentDefaultThreshold = guildData.antinuke?.defaultThreshold || 3;
        const hasCustomModuleThreshold = Object.values(modules).some(cfg => cfg?.enabled && typeof cfg.threshold === 'number' && cfg.threshold !== currentDefaultThreshold);

        if (hasCustomModuleThreshold) {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.warning || '⚠️'} Override Module Thresholds?`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `Per-module thresholds are configured.
Applying default threshold to **${threshold}** will override all module thresholds.

Confirm to proceed.`
            ));
            container.addActionRowComponents(row => row.addComponents(
                new ButtonBuilder().setCustomId(`antinuke_default_threshold_confirm_${message.author.id}_${threshold}`).setLabel('Confirm Override').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`antinuke_default_threshold_cancel_${message.author.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            ));

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
        }

        const oldThreshold = guildData.antinuke.defaultThreshold || 3;
        guildData.antinuke.defaultThreshold = threshold;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: 'Default Threshold Changed',
            details: `Changed from \`${oldThreshold}\` to \`${threshold}\` actions`,
            changes: {
                'Old Threshold': `${oldThreshold}`,
                'New Threshold': `${threshold}`
            }
        });

        return this.sendSuccess(message, 'Default Threshold Updated',
            `Default threshold is now **${threshold}** actions.\n` +
            `Users will be punished after ${threshold} violations.`);
    },

    async handleModule(message, args, client, guildData, moduleName) {
        const action = args[1]?.toLowerCase();
        const moduleInfo = MODULES[moduleName];

        if (!action) {
            const config = guildData.antinuke?.modules?.[moduleName];

            let content = `**Module:** ${moduleInfo.emoji} ${moduleInfo.name}\n`;
            content += `**Description:** ${moduleInfo.description}\n`;
            content += `**Status:** ${config?.enabled ? `${EMOJIS.success || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}\n`;

            if (config?.enabled) {
                content += `**Threshold:** ${config.threshold} actions\n`;
                content += `**Punishment:** ${config.punishment}\n`;
            }

            content += `\n**Commands:**\n`;
            content += `\`.antinuke ${moduleName} on\` - Enable module\n`;
            content += `\`.antinuke ${moduleName} off\` - Disable module\n`;
            content += `\`.antinuke ${moduleName} on --threshold 3 --punishment ban\``;

            return this.sendInfo(message, `${moduleInfo.name} Module`, content);
        }

        if (action === 'on' || action === 'enable') {
            let threshold = guildData.antinuke?.defaultThreshold || 3;
            let punishment = guildData.antinuke?.defaultPunishment || 'ban';
            let window = guildData.antinuke?.defaultWindow || 60;

            const thresholdMatch = args.join(' ').match(/--threshold\s+(\d+)/i);
            const punishmentMatch = args.join(' ').match(/--punishment\s+(\w+)/i);
            const windowMatch = args.join(' ').match(/--window\s+(\d+)/i);

            if (thresholdMatch) threshold = Math.min(20, Math.max(1, parseInt(thresholdMatch[1])));
            if (punishmentMatch) {
                const p = punishmentMatch[1].toLowerCase() === 'quarantine' ? 'protocol' : punishmentMatch[1].toLowerCase();
                if (PUNISHMENTS[p]) punishment = p;
            }
            if (windowMatch) window = Math.min(300, Math.max(10, parseInt(windowMatch[1])));

            if (!guildData.antinuke.modules) guildData.antinuke.modules = {};

            const existing = guildData.antinuke.modules[moduleName];
            if (existing?.enabled) {
                return this.sendInfo(message, 'Module Already Enabled', `${moduleInfo.emoji} **${moduleInfo.name}** is already enabled.`);
            }

            guildData.antinuke.modules[moduleName] = {
                enabled: true,
                threshold,
                punishment,
                window
            };

            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: `Module Enabled: ${moduleInfo.name}`,
                details: `${moduleInfo.emoji} ${moduleInfo.name} protection activated`,
                changes: {
                    'Module': moduleInfo.name,
                    'Threshold': `${threshold}`,
                    'Punishment': punishment,
                    'Window': `${window}s`
                }
            });

            return this.sendSuccess(message, 'Module Enabled',
                `${moduleInfo.emoji} **${moduleInfo.name}** is now **enabled**.\n\n` +
                `• Threshold: ${threshold} actions\n` +
                `• Punishment: ${punishment}\n` +
                `• Window: ${window}s`);
        }

        if (action === 'off' || action === 'disable') {
            if (!guildData.antinuke.modules) guildData.antinuke.modules = {};

            const existing = guildData.antinuke.modules[moduleName];
            if (!existing?.enabled) {
                return this.sendInfo(message, 'Module Already Disabled', `${moduleInfo.emoji} **${moduleInfo.name}** is already disabled.`);
            }

            guildData.antinuke.modules[moduleName].enabled = false;

            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: `Module Disabled: ${moduleInfo.name}`,
                details: `${moduleInfo.emoji} ${moduleInfo.name} protection deactivated`
            });

            return this.sendSuccess(message, 'Module Disabled',
                `${moduleInfo.emoji} **${moduleInfo.name}** has been **disabled**.`);
        }

        if (action === 'punishment') {
            const newPunishmentRaw = args[2]?.toLowerCase();
            const newPunishment = newPunishmentRaw === 'quarantine' ? 'protocol' : newPunishmentRaw;
            if (!newPunishment || !PUNISHMENTS[newPunishment]) {
                return this.sendError(message, 'Invalid Punishment', `Valid punishments: ${Object.keys(PUNISHMENTS).join(', ')}`);
            }
            if (!guildData.antinuke.modules?.[moduleName]?.enabled) {
                return this.sendError(message, 'Module Disabled', `${moduleInfo.emoji} **${moduleInfo.name}** is disabled. Enable it first.`);
            }
            const oldPunishment = guildData.antinuke.modules[moduleName].punishment;
            guildData.antinuke.modules[moduleName].punishment = newPunishment;
            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: `Module Punishment Updated: ${moduleInfo.name}`,
                details: `Changed from \`${oldPunishment}\` to \`${newPunishment}\``,
                changes: {
                    'Module': moduleInfo.name,
                    'Old Punishment': oldPunishment,
                    'New Punishment': newPunishment
                }
            });

            return this.sendSuccess(message, 'Module Punishment Updated', `${moduleInfo.emoji} **${moduleInfo.name}** punishment set to **${newPunishment}**.`);
        }

        if (action === 'threshold') {
            const newThreshold = parseInt(args[2]);
            if (!newThreshold || newThreshold < 1 || newThreshold > 20) {
                return this.sendError(message, 'Invalid Threshold', 'Usage: `.antinuke <module> threshold <1-20>`');
            }
            if (!guildData.antinuke.modules?.[moduleName]?.enabled) {
                return this.sendError(message, 'Module Disabled', `${moduleInfo.emoji} **${moduleInfo.name}** is disabled. Enable it first.`);
            }
            const oldThreshold = guildData.antinuke.modules[moduleName].threshold;
            guildData.antinuke.modules[moduleName].threshold = newThreshold;
            await this.saveGuildData(client, message.guildId, guildData.antinuke);

            await sendAntinukeLog(client, guildData, message.guild, {
                eventType: 'configChange',
                executor: { id: message.author.id, tag: message.author.tag },
                action: `Module Threshold Updated: ${moduleInfo.name}`,
                details: `Changed from \`${oldThreshold}\` to \`${newThreshold}\` actions`,
                changes: {
                    'Module': moduleInfo.name,
                    'Old Threshold': `${oldThreshold}`,
                    'New Threshold': `${newThreshold}`
                }
            });

            return this.sendSuccess(message, 'Module Threshold Updated', `${moduleInfo.emoji} **${moduleInfo.name}** threshold set to **${newThreshold}** actions.`);
        }

        return this.sendError(message, 'Invalid Action',
            'Usage: `.antinuke <module> on/off [--threshold X] [--punishment type]`');
    },

    async handleStrictBot(message, args, client, guildData) {
        const action = args[1]?.toLowerCase();

        if (!action || !['on', 'off', 'enable', 'disable', 'status'].includes(action)) {
            const currentStatus = guildData.antinuke?.strictBotVerification !== false;
            return this.sendInfo(message, 'Strict Bot Verification',
                `**Current Status:** ${currentStatus ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                `When enabled, ALL unverified bots will be kicked automatically, even if added by whitelisted users, admins, or extra owners.\n\n` +
                `**Discord Verified Bots:**\n` +
                `• Have a checkmark badge\n` +
                `• Are verified by Discord\n` +
                `• Meet Discord's bot quality standards\n\n` +
                `**Commands:**\n` +
                `\`.antinuke strictbot on\` - Enable strict verification\n` +
                `\`.antinuke strictbot off\` - Disable strict verification\n` +
                `\`.antinuke strictbot status\` - View current status`);
        }

        if (action === 'status') {
            const currentStatus = guildData.antinuke?.strictBotVerification !== false;
            return this.sendInfo(message, 'Strict Bot Verification Status',
                `**Status:** ${currentStatus ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                `${currentStatus ?
                    '⚠️ Only Discord-verified bots can be added.\nEven admins and whitelisted users cannot add unverified bots.' :
                    'ℹ️ Unverified bots can be added by whitelisted users and admins.\nOnly non-whitelisted users are restricted by the Anti-Bot module.'}`);
        }

        const enable = action === 'on' || action === 'enable';
        const oldStatus = guildData.antinuke?.strictBotVerification !== false;

        if (enable === oldStatus) {
            return this.sendInfo(message, 'No Change',
                `Strict bot verification is already **${enable ? 'enabled' : 'disabled'}**.`);
        }

        guildData.antinuke.strictBotVerification = enable;
        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        await sendAntinukeLog(client, guildData, message.guild, {
            eventType: 'configChange',
            executor: { id: message.author.id, tag: message.author.tag },
            action: enable ? 'Strict Bot Verification Enabled' : 'Strict Bot Verification Disabled',
            details: enable ?
                '⚠️ Only Discord-verified bots can now be added\nThis applies to ALL users including whitelisted users and admins' :
                'Whitelisted users and admins can now add unverified bots',
            changes: {
                'Strict Bot Verification': enable ? 'Enabled' : 'Disabled'
            }
        });

        return this.sendSuccess(message, `Strict Bot Verification ${enable ? 'Enabled' : 'Disabled'}`,
            enable ?
                `⚠️ **Strict mode is now active**\n\n` +
                `• Only Discord-verified bots can be added\n` +
                `• Unverified bots will be kicked automatically\n` +
                `• This applies to ALL users (including whitelisted users and admins)\n\n` +
                `*Use \`.antinuke strictbot off\` to disable*` :
                `ℹ️ **Standard mode is now active**\n\n` +
                `• Whitelisted users and admins can add any bots\n` +
                `• Non-whitelisted users are still monitored by Anti-Bot module\n\n` +
                `*Use \`.antinuke strictbot on\` to enable strict verification*`);
    },

    async handleReset(message, client, guildData) {
        guildData.antinuke = {
            enabled: false,
            admins: [],
            extraOwners: [],
            trustedAdmins: [],
            whitelist: [],
            modules: {},
            quarantineRole: null,
            logChannel: null,
            defaultPunishment: 'ban',
            defaultThreshold: 3,
            defaultWindow: 60,
            quarantined: []
        };

        await this.saveGuildData(client, message.guildId, guildData.antinuke);

        return this.sendSuccess(message, 'Antinuke Reset',
            'All antinuke settings have been reset to defaults.\n' +
            'Use `.antinuke wizard` to set up protection again.');
    },

    showHelp(message, guildData) {
        const status = guildData.antinuke?.enabled;

        let content = `**Status:** ${status ? '🟢 Active' : '🔴 Inactive'}\n\n`;

        content += `**Quick Start:**\n`;
        content += `\`.antinuke wizard\` - Interactive setup wizard\n`;
        content += `\`.antinuke preset recommended\` - Quick balanced setup\n\n`;

        content += `**Core Commands:**\n`;
        content += `\`.antinuke on/off\` - Toggle protection\n`;
        content += `\`.antinuke list\` - View overview\n`;
        content += `\`.antinuke config\` - Full configuration\n\n`;

        content += `**Permission Management:**\n`;
        content += `\`.antinuke admin @user\` - Toggle admin\n`;
        content += `\`.antinuke trustedadmin @user\` - Toggle trusted (immune)\n`;
        content += `\`.antinuke extraowner @user\` - Toggle extra owner\n`;
        content += `\`.antinuke whitelist @user\` - Toggle whitelist\n\n`;

        content += `**Module Configuration:**\n`;
        content += `\`.antinuke <module> on/off\` - Toggle module\n`;
        content += `\`.antinuke punishment <type>\` - Default punishment\n`;
        content += `\`.antinuke threshold <1-20>\` - Default threshold\n\n`;

        content += `**Protocol:**\n`;
        content += `\`.antinuke protocol @user\` - Apply protocol (strip roles + timeout)\n`;
        content += `\`.antinuke unprotocol @user\` - Restore user\n`;
        content += `\`.antinuke protocol-list\` - View protocol users\n\n`;

        content += `**Available Modules:**\n`;
        content += Object.entries(MODULES).map(([k, v]) => `\`${k}\``).join(' • ');

        return this.sendInfo(message, 'Antinuke Help', content);
    },

    sendError(message, title, description) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
    },

    sendSuccess(message, title, description) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
    },

    sendInfo(message, title, description, emoji = null) {
        const container = new ContainerBuilder();
        const displayEmoji = emoji || EMOJIS.antinukeemoji || '🛡️';
        container.addTextDisplayComponents(td => td.setContent(`# ${displayEmoji} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], users: [], roles: [], repliedUser: false } });
    }
};

export { buildWizardContainer, MODULES, PRESETS };
