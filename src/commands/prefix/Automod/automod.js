import { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const MODULES = {
    antiinvite: { name: 'Anti-Invite', description: 'Blocks Discord server invite links', emoji: '🔗', defaultPunishment: 'delete', strikes: 1 },
    antilink: { name: 'Anti-Link', description: 'Blocks external URLs and links', emoji: '🌐', defaultPunishment: 'delete', strikes: 1 },
    antispam: { name: 'Anti-Spam', description: 'Prevents rapid/duplicate messages', emoji: '📨', defaultPunishment: 'warn', strikes: 1 },
    anticaps: { name: 'Anti-Caps', description: 'Blocks excessive capital letters', emoji: '🔠', defaultPunishment: 'delete', strikes: 0 },
    antimention: { name: 'Anti-Mass-Mention', description: 'Blocks mass user mentions', emoji: '📢', defaultPunishment: 'warn', strikes: 2 },
    antiemoji: { name: 'Anti-Emoji', description: 'Blocks excessive emoji spam', emoji: '😀', defaultPunishment: 'delete', strikes: 0 },
    badwords: { name: 'Bad Words', description: 'Filters custom banned words/phrases', emoji: '🤬', defaultPunishment: 'delete', strikes: 1 },
    maxlines: { name: 'Max Lines', description: 'Limits message line count', emoji: '📏', defaultPunishment: 'delete', strikes: 0 },
    antieveryone: { name: 'Anti-Mention', description: 'Blocks @everyone/@here and mentions of roles with 5%+ of server members', emoji: '📣', defaultPunishment: 'delete', strikes: 2 },
    antirole: { name: 'Anti-Role Mention', description: 'Blocks mentions of large roles', emoji: '🎭', defaultPunishment: 'warn', strikes: 2 },
    antizalgo: { name: 'Anti-Zalgo', description: 'Blocks zalgo/glitched text', emoji: '👾', defaultPunishment: 'delete', strikes: 0 },
    antinewlines: { name: 'Anti-Newlines', description: 'Blocks excessive blank lines', emoji: '↕️', defaultPunishment: 'delete', strikes: 0 },
    anticopypasta: { name: 'Anti-Copypasta', description: 'Blocks known spam copypastas', emoji: '📋', defaultPunishment: 'delete', strikes: 2 },
    antiai: { name: 'AI Toxicity', description: 'Checks messages & offensive nicknames', emoji: '🧪', defaultPunishment: 'delete', strikes: 1 }
};

const PUNISHMENTS = {
    warn: { name: 'Warn', description: 'Adds a warning to the user', emoji: '⚠️' },
    delete: { name: 'Delete', description: 'Deletes the message', emoji: '🗑️' },
    mute: { name: 'Mute', description: 'Mutes the user for 10 minutes', emoji: '🔇' },
    kick: { name: 'Kick', description: 'Kicks the user from server', emoji: '👢' },
    ban: { name: 'Ban', description: 'Bans the user from server', emoji: '🔨' },
    protocol: { name: 'Protocol', description: 'Removes all roles and applies 28-day timeout', emoji: '🚨' }
};

const PRESETS = {
    strict: {
        name: 'Strict',
        description: 'Maximum protection - punishes most violations',
        modules: ['antiinvite', 'antilink', 'antispam', 'anticaps', 'antimention', 'antiemoji', 'antieveryone', 'antirole', 'antizalgo', 'antinewlines', 'anticopypasta']
    },
    moderate: {
        name: 'Moderate',
        description: 'Balanced protection for most servers',
        modules: ['antiinvite', 'antispam', 'antimention', 'antieveryone', 'antirole', 'badwords']
    },
    light: {
        name: 'Light',
        description: 'Basic protection - only critical filters',
        modules: ['antiinvite', 'antieveryone', 'antispam']
    }
};

const getDefaultConfig = () => ({
    enabled: false,
    logChannel: null,
    modules: Object.fromEntries(
        Object.entries(MODULES).map(([key, mod]) => [key, {
            enabled: false,
            punishments: [mod.defaultPunishment],
            strikes: mod.strikes || 0,
            threshold: key === 'anticaps' ? 70 : key === 'antispam' ? 5 : key === 'antimention' ? 5 : key === 'antiemoji' ? 10 : key === 'maxlines' ? 15 : key === 'antinewlines' ? 5 : key === 'antirole' ? 5 : key === 'antieveryone' ? 5 : 1,
            window: key === 'antispam' ? 5 : undefined,
            words: key === 'badwords' ? [] : undefined,
            usePercent: (key === 'antirole' || key === 'antieveryone') ? true : undefined,
            ignore: { channels: [], roles: [] }
        }])
    ),
    ignore: { channels: [], roles: [], users: [] },
    notifyUser: true,
    strikes: {},
    strikeActions: {
        3: { action: 'mute', duration: '10m' },
        5: { action: 'mute', duration: '1h' },
        7: { action: 'kick' },
        10: { action: 'ban' }
    },
    strikeExpiry: 24
});

const buildWizardContainer = (config, disabled = false, currentPage = 'main') => {
    const container = new ContainerBuilder();
    const enabledModules = Object.entries(config?.modules || {}).filter(([_, m]) => m.enabled).length;
    const totalModules = Object.keys(MODULES).length;
    const activePreset = config?.activePreset || null;

    if (currentPage === 'main') {
        container.addTextDisplayComponents(td =>
            td.setContent(
                `${EMOJIS.automod || '🛡️'} **AUTOMOD CONTROL CENTER**${disabled ? ' *(Expired)*' : ''}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `${disabled ? '⏰ *Session expired. Run command again.*\n\n' : ''}` +
                `${config?.enabled ? `${EMOJIS.success} **ACTIVE**` : `${EMOJIS.error} **INACTIVE**`} • ` +
                `**${enabledModules}**/${totalModules} modules • ` +
                `${config?.logChannel ? `<#${config.logChannel}>` : '*No logs*'}\n` +
                `${activePreset ? `${EMOJIS.success} Using **${activePreset.charAt(0).toUpperCase() + activePreset.slice(1)}** preset` : '*Custom configuration*'}`
            )
        );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(td => td.setContent(`**QUICK PRESETS** • Select protection level`));

        const presetRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('automod_preset_strict')
                .setLabel('Strict')
                .setEmoji(EMOJIS.strict || '🔒')
                .setStyle(activePreset === 'strict' ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled || activePreset === 'strict'),
            new ButtonBuilder()
                .setCustomId('automod_preset_moderate')
                .setLabel('Moderate')
                .setEmoji(EMOJIS.moderate || '⚖️')
                .setStyle(activePreset === 'moderate' ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled || activePreset === 'moderate'),
            new ButtonBuilder()
                .setCustomId('automod_preset_light')
                .setLabel('Light')
                .setEmoji(EMOJIS.feather || '🪶')
                .setStyle(activePreset === 'light' ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(disabled || activePreset === 'light')
        );
        container.addActionRowComponents(presetRow);

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(td => td.setContent(`**CONFIGURATION** • Customize settings`));

        const configRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('automod_page_modules')
                .setLabel('Modules')
                .setEmoji('📦')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('automod_page_punishments')
                .setLabel('Punishments')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('automod_page_ignore')
                .setLabel('Ignore Rules')
                .setEmoji(EMOJIS.ignorerules || '🚫')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('automod_page_words')
                .setLabel('Bad Words')
                .setEmoji('🤬')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled)
        );
        container.addActionRowComponents(configRow);

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`automod_toggle_${config?.enabled ? 'off' : 'on'}`)
                .setLabel(config?.enabled ? 'Disable' : 'Enable')
                .setEmoji(config?.enabled ? EMOJIS.disabletoggle || '🔴' : EMOJIS.enabletoggle || '🟢')
                .setStyle(config?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('automod_logchannel')
                .setLabel('Log Channel')
                .setEmoji(EMOJIS.enabledisablelogging || '📋')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('automod_page_strikes')
                .setLabel('Strikes')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );
        container.addActionRowComponents(actionRow);
    }

    return container;
};

const buildModulesPage = (config, disabled = false) => {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.automod || '🛡️'} **MODULE CONFIGURATION**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Toggle protection modules on/off`
        )
    );

    let moduleList = '';
    for (const [key, mod] of Object.entries(MODULES)) {
        const cfg = config.modules?.[key] || {};
        const status = cfg.enabled ? EMOJIS.success : EMOJIS.error;
        moduleList += `${status} **${mod.name}** • ${mod.description}\n`;
    }

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(moduleList.trim()));

    const moduleSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_module_toggle')
        .setPlaceholder('Select modules to toggle...')
        .setMinValues(1)
        .setMaxValues(Object.keys(MODULES).length)
        .addOptions(
            Object.entries(MODULES).map(([key, mod]) => ({
                label: mod.name,
                value: key,
                description: config.modules?.[key]?.enabled ? '✓ Enabled' : '✗ Disabled',
                emoji: mod.emoji
            }))
        );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_modules_all_on')
            .setLabel('Enable All')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_modules_all_off')
            .setLabel('Disable All')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    ));

    return container;
};

const buildPunishmentsPage = (config, selectedModule = null, disabled = false) => {
    const container = new ContainerBuilder();

    if (!selectedModule) {
        container.addTextDisplayComponents(td =>
            td.setContent(
                `⚡ **PUNISHMENT CONFIGURATION**\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Select a module to configure its punishments`
            )
        );

        let punishList = '';
        for (const [key, mod] of Object.entries(MODULES)) {
            const cfg = config.modules?.[key] || {};
            const punishments = cfg.punishments || [mod.defaultPunishment];
            punishList += `**${mod.name}** → ${punishments.join(' + ')}\n`;
        }

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(punishList.trim()));

        const moduleSelect = new StringSelectMenuBuilder()
            .setCustomId('automod_punishment_select_module')
            .setPlaceholder('Select module to configure...')
            .addOptions(
                Object.entries(MODULES).map(([key, mod]) => ({
                    label: mod.name,
                    value: key,
                    emoji: mod.emoji
                }))
            );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));
    } else {
        const mod = MODULES[selectedModule];
        const cfg = config.modules?.[selectedModule] || {};
        const currentPunishments = cfg.punishments || [mod.defaultPunishment];

        container.addTextDisplayComponents(td =>
            td.setContent(
                `⚡ **${mod.name.toUpperCase()} PUNISHMENTS**\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Current: **${currentPunishments.join(' + ')}**\n` +
                `Select multiple punishments to combine them`
            )
        );

        const punishmentSelect = new StringSelectMenuBuilder()
            .setCustomId(`automod_punishment_set_${selectedModule}`)
            .setPlaceholder('Select punishments...')
            .setMinValues(1)
            .setMaxValues(Object.keys(PUNISHMENTS).length)
            .addOptions(
                Object.entries(PUNISHMENTS).map(([key, p]) => ({
                    label: p.name,
                    value: key,
                    description: p.description,
                    emoji: p.emoji,
                    default: currentPunishments.includes(key)
                }))
            );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(punishmentSelect));
    }

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(selectedModule ? 'automod_page_punishments' : 'automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));

    return container;
};

const buildIgnorePage = (config, selectedModule = null, disabled = false) => {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.ignorerules || '🚫'} **IGNORE RULES**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Configure channels, roles, and users to bypass automod`
        )
    );

    const globalIgnore = config.ignore || { channels: [], roles: [], users: [] };
    const ignoreCount = globalIgnore.channels.length + globalIgnore.roles.length + globalIgnore.users.length;

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td =>
        td.setContent(
            `**Global Ignores:** ${ignoreCount}\n` +
            `• Channels: ${globalIgnore.channels.length > 0 ? globalIgnore.channels.slice(0, 3).map(id => `<#${id}>`).join(', ') + (globalIgnore.channels.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Roles: ${globalIgnore.roles.length > 0 ? globalIgnore.roles.slice(0, 3).map(id => `<@&${id}>`).join(', ') + (globalIgnore.roles.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Users: ${globalIgnore.users.length > 0 ? globalIgnore.users.slice(0, 3).map(id => `<@${id}>`).join(', ') + (globalIgnore.users.length > 3 ? '...' : '') : '*None*'}`
        )
    );

    const typeSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_ignore_type')
        .setPlaceholder('What do you want to ignore?')
        .addOptions([
            { label: 'Add Channel', value: 'add_channel', emoji: '📝', description: 'Ignore a channel globally' },
            { label: 'Add Role', value: 'add_role', emoji: '🎭', description: 'Ignore a role globally' },
            { label: 'Add User', value: 'add_user', emoji: '👤', description: 'Ignore a user globally' },
            { label: 'Per-Module Ignore', value: 'per_module', emoji: '📦', description: 'Ignore for specific module' },
            { label: 'Clear All Ignores', value: 'clear_all', emoji: '🗑️', description: 'Remove all ignore rules' }
        ]);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(typeSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));

    return container;
};

const buildModuleIgnorePage = (config, selectedModule, disabled = false) => {
    const container = new ContainerBuilder();
    const mod = MODULES[selectedModule];

    if (!mod) {
        container.addTextDisplayComponents(td => td.setContent(`❌ **Error:** Invalid module configuration.`));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('automod_page_ignore')
                .setLabel('Back')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        ));
        return container;
    }

    const moduleConfig = config.modules?.[selectedModule] || { ignore: { channels: [], roles: [] } };
    const ignoreConfig = moduleConfig.ignore || { channels: [], roles: [] };

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${mod.emoji} **${mod.name.toUpperCase()} IGNORE RULES**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Configure ignores specifically for this module`
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td =>
        td.setContent(
            `**Module Ignores:**\n` +
            `• Channels: ${ignoreConfig.channels?.length > 0 ? ignoreConfig.channels.slice(0, 3).map(id => `<#${id}>`).join(', ') + (ignoreConfig.channels.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Roles: ${ignoreConfig.roles?.length > 0 ? ignoreConfig.roles.slice(0, 3).map(id => `<@&${id}>`).join(', ') + (ignoreConfig.roles.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Users: ${ignoreConfig.users?.length > 0 ? ignoreConfig.users.slice(0, 3).map(id => `<@${id}>`).join(', ') + (ignoreConfig.users.length > 3 ? '...' : '') : '*None*'}`
        )
    );

    const typeSelect = new StringSelectMenuBuilder()
        .setCustomId(`automod_ignore_module_${selectedModule}`)
        .setPlaceholder('Add ignore rule...')
        .addOptions([
            { label: 'Add Channel', value: 'add_channel', emoji: '📝', description: `Ignore channel for ${mod.name}` },
            { label: 'Add Role', value: 'add_role', emoji: '🎭', description: `Ignore role for ${mod.name}` },
            { label: 'Add User', value: 'add_user', emoji: '👤', description: `Ignore user for ${mod.name}` },
            { label: 'Clear Module Ignores', value: 'clear', emoji: '🗑️', description: 'Remove ignores for this module' }
        ]);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(typeSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_page_ignore')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));

    return container;
};

const buildWordsPage = (config, disabled = false) => {
    const container = new ContainerBuilder();

    const words = config.modules?.badwords?.words || [];

    container.addTextDisplayComponents(td =>
        td.setContent(
            `🤬 **BAD WORDS FILTER**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Manage banned words and phrases\n\n` +
            `**Total Words:** ${words.length}`
        )
    );

    if (words.length > 0) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`**Current Words:**\n${words.slice(0, 15).map((w, i) => `\`${i + 1}\` ||${w}||`).join('\n')}${words.length > 15 ? `\n*...and ${words.length - 15} more*` : ''}`)
        );
    }

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_words_add')
            .setLabel('Add Words')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_words_remove')
            .setLabel('Remove')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0),
        new ButtonBuilder()
            .setCustomId('automod_words_bulk_remove')
            .setLabel('Bulk Remove')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0)
    ));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
         new ButtonBuilder()
            .setCustomId('automod_words_clear')
            .setLabel('Clear All')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0)
    ));

    return container;
};

const buildStrikesPage = (config, disabled = false) => {
    const container = new ContainerBuilder();

    const strikesEnabled = config.strikesEnabled !== false;
    const strikeActions = config.strikeActions || { 3: { action: 'mute', duration: '10m' }, 5: { action: 'mute', duration: '1h' }, 7: { action: 'kick' }, 10: { action: 'ban' } };
    const actionsText = Object.entries(strikeActions)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([strikes, cfg]) => `**${strikes}** strikes → ${cfg.action}${cfg.duration ? ` (${cfg.duration})` : ''}`)
        .join('\n');

    container.addTextDisplayComponents(td =>
        td.setContent(
            `⚠️ **STRIKE SYSTEM**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**Status:** ${strikesEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
            `Strikes accumulate per user. Actions trigger at thresholds.\n\n` +
            `**Expiry:** ${config.strikeExpiry || 24} hours\n\n` +
            `**Current Actions:**\n${actionsText}`
        )
    );

    const actionSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_strike_threshold')
        .setPlaceholder('Configure strike thresholds...')
        .addOptions([
            { label: '3 Strikes', value: '3', description: 'First warning level' },
            { label: '5 Strikes', value: '5', description: 'Second warning level' },
            { label: '7 Strikes', value: '7', description: 'Third warning level' },
            { label: '10 Strikes', value: '10', description: 'Maximum tolerance' },
            { label: 'Set Expiry Time', value: 'expiry', description: 'Change strike expiry hours' }
        ]);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(actionSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_strikes_toggle')
            .setLabel(strikesEnabled ? 'Disable Strikes' : 'Enable Strikes')
            .setEmoji(strikesEnabled ? '🔴' : '🟢')
            .setStyle(strikesEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(disabled)
    ));

    return container;
};

export { MODULES, PUNISHMENTS, PRESETS, getDefaultConfig, buildWizardContainer, buildModulesPage, buildPunishmentsPage, buildIgnorePage, buildModuleIgnorePage, buildWordsPage, buildStrikesPage };

export default {
    name: 'automod',
    aliases: ['am'],
    description: 'Automatic message moderation system',
    usage: '.automod [subcommand]',
    category: 'Automod',

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return this.sendError(message, 'Permission Denied', 'You need the **Manage Server** permission to configure automod.');
        }

        const config = await this.getConfig(client, message.guildId);
        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'help') {
            return this.showHelp(message, config);
        }

        switch (subcommand) {
            case 'wizard':
            case 'setup':
                return this.showWizard(message, client, config);
            case 'on':
            case 'enable':
                return this.handleToggle(message, client, config, true);
            case 'off':
            case 'disable':
                return this.handleToggle(message, client, config, false);
            case 'preset':
                return this.handlePreset(message, args, client, config);
            case 'module':
                return this.handleModule(message, args, client, config);
            case 'punishment':
            case 'punish':
                return this.handlePunishment(message, args, client, config);
            case 'threshold':
            case 'limit':
                return this.handleThreshold(message, args, client, config);
            case 'ignore':
                return this.handleIgnore(message, args, client, config);
            case 'unignore':
                return this.handleUnignore(message, args, client, config);
            case 'words':
            case 'badwords':
                return this.handleWords(message, args, client, config);
            case 'logs':
            case 'logchannel':
                return this.handleLogChannel(message, args, client, config);
            case 'config':
            case 'settings':
                return this.handleConfig(message, config);
            case 'stats':
                return this.handleStats(message, config);
            case 'strikes':
                return this.handleStrikes(message, args, client, config);
            case 'notify':
                return this.handleNotify(message, args, client, config);
            case 'reset':
                return this.handleReset(message, client);
            default:
                if (MODULES[subcommand]) {
                    return this.handleModuleToggle(message, client, config, subcommand);
                }
                return this.showHelp(message, config);
        }
    },

    async getConfig(client, guildId) {
        const data = await client.db.findOne({ guildId }) || {};
        if (!data.automod) {
            data.automod = getDefaultConfig();
        }
        return data.automod;
    },

    async saveConfig(client, guildId, config) {
        await client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });
    },

    async showHelp(message, config) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.security || '🛡️'} Automod Commands`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Quick Setup:**\n` +
                `\`.automod wizard\` - Interactive setup wizard\n` +
                `\`.automod preset <strict|moderate|light>\` - Apply preset\n\n` +
                `**Toggle:**\n` +
                `\`.automod on/off\` - Enable/disable system\n` +
                `\`.automod <module>\` - Toggle specific module\n\n` +
                `**Configuration:**\n` +
                `\`.automod module <name> [on|off]\` - Toggle module\n` +
                `\`.automod punishment <module> add/remove <action>\` - Add/remove punishment\n` +
                `\`.automod punishment <module> set <actions>\` - Set punishments (e.g., delete+warn)\n` +
                `\`.automod threshold <module> <number>\`\n` +
                `\`.automod ignore <#channel|@role|@user>\` - Add ignore\n` +
                `\`.automod unignore <#channel|@role|@user>\` - Remove ignore\n` +
                `\`.automod words add/remove/list [word]\` - Manage bad words\n` +
                `\`.automod logchannel <#channel>\` - Set log channel\n` +
                `\`.automod notify <on/off>\` - Toggle user warnings\n\n` +
                `**View:**\n` +
                `\`.automod config\` - View full configuration\n` +
                `\`.automod stats\` - View statistics`
            )
        );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    },

    async showWizard(message, client, config) {
        const container = buildWizardContainer(config);
        const reply = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

        if (!client.automodWizards) client.automodWizards = new Map();
        client.automodWizards.set(reply.id, { authorId: message.author.id, createdAt: Date.now(), guildId: message.guildId });

        setTimeout(async () => {
            try {
                const freshConfig = await this.getConfig(client, message.guildId);
                const disabledContainer = buildWizardContainer(freshConfig, true);
                await reply.edit({ components: [disabledContainer] }).catch(() => {});
                client.automodWizards.delete(reply.id);
            } catch (e) {}
        }, 5 * 60 * 1000);

        return reply;
    },

    async handleToggle(message, client, config, enable) {
        if (config.enabled === enable) {
            return this.sendInfo(message, enable ? 'Already Enabled' : 'Already Disabled', `Automod is already ${enable ? 'enabled' : 'disabled'}.`);
        }

        config.enabled = enable;
        await this.saveConfig(client, message.guildId, config);
        return this.sendSuccess(message, enable ? 'Automod Enabled' : 'Automod Disabled', enable ? 'Automatic message moderation is now **active**.' : 'Automatic message moderation has been **disabled**.');
    },

    async handlePreset(message, args, client, config) {
        const presetName = args[1]?.toLowerCase();
        if (!presetName || !PRESETS[presetName]) {
            let content = '**Available Presets:**\n\n';
            for (const [key, preset] of Object.entries(PRESETS)) {
                content += `**${preset.name}** - \`.automod preset ${key}\`\n└ ${preset.description}\n└ Modules: ${preset.modules.length}\n\n`;
            }
            return this.sendInfo(message, 'Setup Presets', content);
        }

        const preset = PRESETS[presetName];
        for (const modKey of Object.keys(MODULES)) {
            config.modules[modKey].enabled = preset.modules.includes(modKey);
        }
        config.enabled = true;
        await this.saveConfig(client, message.guildId, config);

        return this.sendSuccess(message, `${preset.name} Preset Applied`,
            `Automod is now **enabled** with the ${preset.name} preset!\n\n` +
            `**Modules Enabled:** ${preset.modules.map(m => MODULES[m].name).join(', ')}\n\n` +
            `*Use \`.automod config\` to view full configuration*`);
    },

    async handleModule(message, args, client, config) {
        const modName = args[1]?.toLowerCase();
        const action = args[2]?.toLowerCase();

        if (!modName) {
            let content = '**Available Modules:**\n\n';
            for (const [key, mod] of Object.entries(MODULES)) {
                const status = config.modules[key]?.enabled ? EMOJIS.success || '✅' : EMOJIS.error || '❌';
                content += `${status} **${mod.name}** (\`${key}\`)\n└ ${mod.description}\n`;
            }
            return this.sendInfo(message, 'Automod Modules', content);
        }

        if (!MODULES[modName]) {
            return this.sendError(message, 'Invalid Module', `Module \`${modName}\` not found. Use \`.automod module\` to see available modules.`);
        }

        return this.handleModuleToggle(message, client, config, modName, action);
    },

    async handleModuleToggle(message, client, config, modName, action = null) {
        if (!config.modules[modName]) {
            config.modules[modName] = { enabled: false, punishments: [MODULES[modName].defaultPunishment], threshold: 1, ignore: { channels: [], roles: [] } };
        }
        if (config.modules[modName].punishment && !config.modules[modName].punishments) {
            config.modules[modName].punishments = [config.modules[modName].punishment];
            delete config.modules[modName].punishment;
        }

        const newState = action === 'on' ? true : action === 'off' ? false : !config.modules[modName].enabled;
        config.modules[modName].enabled = newState;
        await this.saveConfig(client, message.guildId, config);

        return this.sendSuccess(message, 'Module Updated', `**${MODULES[modName].name}** has been ${newState ? 'enabled' : 'disabled'}.`);
    },

    async handlePunishment(message, args, client, config) {
        const modName = args[1]?.toLowerCase();
        const action = args[2]?.toLowerCase();
        const punishmentArg = args[3]?.toLowerCase();

        if (!modName || !MODULES[modName]) {
            let content = '**Punishment Commands:**\n\n';
            content += '`.automod punishment <module> add <action>` - Add a punishment\n';
            content += '`.automod punishment <module> remove <action>` - Remove a punishment\n';
            content += '`.automod punishment <module> set <actions>` - Set all (e.g., delete+warn)\n\n';
            content += '**Valid Actions:** `warn`, `delete`, `mute`, `kick`, `ban`\n\n';
            content += '**Example:** `.automod punishment antiinvite set delete+warn`\n';
            content += 'This will delete the message AND add a warning.';
            return this.sendInfo(message, 'Multiple Punishments', content);
        }

        if (!config.modules[modName]) {
            config.modules[modName] = { enabled: false, punishments: [MODULES[modName].defaultPunishment], threshold: 1, ignore: { channels: [], roles: [] } };
        }
        if (config.modules[modName].punishment && !config.modules[modName].punishments) {
            config.modules[modName].punishments = [config.modules[modName].punishment];
            delete config.modules[modName].punishment;
        }
        if (!config.modules[modName].punishments) {
            config.modules[modName].punishments = [MODULES[modName].defaultPunishment];
        }

        if (!action) {
            const current = config.modules[modName].punishments.join(' + ');
            return this.sendInfo(message, `${MODULES[modName].name} Punishments`, `**Current:** ${current}\n\nUse \`.automod punishment ${modName} add/remove/set <action>\``);
        }

        if (action === 'add') {
            if (!punishmentArg || !PUNISHMENTS[punishmentArg]) {
                return this.sendError(message, 'Invalid Punishment', 'Valid: `warn`, `delete`, `mute`, `kick`, `ban`');
            }
            if (config.modules[modName].punishments.includes(punishmentArg)) {
                return this.sendInfo(message, 'Already Added', `**${PUNISHMENTS[punishmentArg].name}** is already in the punishment list.`);
            }
            config.modules[modName].punishments.push(punishmentArg);
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Punishment Added', `**${MODULES[modName].name}** will now: ${config.modules[modName].punishments.map(p => PUNISHMENTS[p].name).join(' + ')}`);
        }

        if (action === 'remove') {
            if (!punishmentArg || !PUNISHMENTS[punishmentArg]) {
                return this.sendError(message, 'Invalid Punishment', 'Valid: `warn`, `delete`, `mute`, `kick`, `ban`');
            }
            const idx = config.modules[modName].punishments.indexOf(punishmentArg);
            if (idx === -1) {
                return this.sendInfo(message, 'Not Found', `**${PUNISHMENTS[punishmentArg].name}** is not in the punishment list.`);
            }
            if (config.modules[modName].punishments.length === 1) {
                return this.sendError(message, 'Cannot Remove', 'At least one punishment must remain. Use `set` to change it.');
            }
            config.modules[modName].punishments.splice(idx, 1);
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Punishment Removed', `**${MODULES[modName].name}** will now: ${config.modules[modName].punishments.map(p => PUNISHMENTS[p].name).join(' + ')}`);
        }

        if (action === 'set') {
            const punishmentList = punishmentArg?.split('+').map(p => p.trim().toLowerCase()).filter(p => PUNISHMENTS[p]);
            if (!punishmentList || punishmentList.length === 0) {
                return this.sendError(message, 'Invalid Format', 'Use format: `.automod punishment <module> set delete+warn`\n\nValid: `warn`, `delete`, `mute`, `kick`, `ban`');
            }
            config.modules[modName].punishments = [...new Set(punishmentList)];
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Punishments Set', `**${MODULES[modName].name}** will now: ${config.modules[modName].punishments.map(p => PUNISHMENTS[p].name).join(' + ')}`);
        }

        if (PUNISHMENTS[action]) {
            config.modules[modName].punishments = [action];
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Punishment Set', `**${MODULES[modName].name}** punishment set to **${PUNISHMENTS[action].name}**.`);
        }

        return this.sendError(message, 'Invalid Action', 'Use `add`, `remove`, or `set`. Example: `.automod punishment antiinvite set delete+warn`');
    },

    async handleThreshold(message, args, client, config) {
        const modName = args[1]?.toLowerCase();
        const threshold = parseInt(args[2]);

        if (!modName || !MODULES[modName]) {
            return this.sendError(message, 'Invalid Usage', 'Usage: `.automod threshold <module> <number>`');
        }

        if (isNaN(threshold) || threshold < 1 || threshold > 100) {
            return this.sendError(message, 'Invalid Threshold', 'Threshold must be a number between 1 and 100.');
        }

        if (!config.modules[modName]) {
            config.modules[modName] = { enabled: false, punishments: [MODULES[modName].defaultPunishment], threshold: threshold, ignore: { channels: [], roles: [] } };
        } else {
            config.modules[modName].threshold = threshold;
        }
        await this.saveConfig(client, message.guildId, config);

        return this.sendSuccess(message, 'Threshold Updated', `**${MODULES[modName].name}** threshold set to **${threshold}**.`);
    },

    async handleIgnore(message, args, client, config) {
        const target = args[1];
        const modName = args[2]?.toLowerCase();

        if (!target) {
            const globalIgnore = config.ignore || { channels: [], roles: [], users: [] };
            let content = '**Global Ignore Rules:**\n';
            content += `Channels: ${globalIgnore.channels.length ? globalIgnore.channels.map(id => `<#${id}>`).join(', ') : '*None*'}\n`;
            content += `Roles: ${globalIgnore.roles.length ? globalIgnore.roles.map(id => `<@&${id}>`).join(', ') : '*None*'}\n`;
            content += `Users: ${globalIgnore.users.length ? globalIgnore.users.map(id => `<@${id}>`).join(', ') : '*None*'}\n\n`;
            content += '**Usage:**\n';
            content += '`.automod ignore <#channel|@role|@user>` - Add global ignore\n';
            content += '`.automod ignore <#channel|@role> <module>` - Add per-module ignore';
            return this.sendInfo(message, 'Ignore Rules', content);
        }

        const channelMatch = target.match(/<#(\d+)>/);
        const roleMatch = target.match(/<@&(\d+)>/);
        const userMatch = target.match(/<@!?(\d+)>/);

        if (modName && MODULES[modName]) {
            if (!config.modules[modName].ignore) config.modules[modName].ignore = { channels: [], roles: [] };
            if (channelMatch) {
                const id = channelMatch[1];
                if (!config.modules[modName].ignore.channels.includes(id)) {
                    config.modules[modName].ignore.channels.push(id);
                    await this.saveConfig(client, message.guildId, config);
                    return this.sendSuccess(message, 'Ignore Added', `<#${id}> is now ignored for **${MODULES[modName].name}**.`);
                }
                return this.sendInfo(message, 'Already Ignored', `<#${id}> is already ignored for **${MODULES[modName].name}**.`);
            }
            if (roleMatch) {
                const id = roleMatch[1];
                if (!config.modules[modName].ignore.roles.includes(id)) {
                    config.modules[modName].ignore.roles.push(id);
                    await this.saveConfig(client, message.guildId, config);
                    return this.sendSuccess(message, 'Ignore Added', `<@&${id}> is now ignored for **${MODULES[modName].name}**.`);
                }
                return this.sendInfo(message, 'Already Ignored', `<@&${id}> is already ignored for **${MODULES[modName].name}**.`);
            }
        }

        if (!config.ignore) config.ignore = { channels: [], roles: [], users: [] };

        if (channelMatch) {
            const id = channelMatch[1];
            if (!config.ignore.channels.includes(id)) {
                config.ignore.channels.push(id);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Added', `<#${id}> is now globally ignored.`);
            }
            return this.sendInfo(message, 'Already Ignored', `<#${id}> is already globally ignored.`);
        }

        if (roleMatch) {
            const id = roleMatch[1];
            if (!config.ignore.roles.includes(id)) {
                config.ignore.roles.push(id);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Added', `<@&${id}> is now globally ignored.`);
            }
            return this.sendInfo(message, 'Already Ignored', `<@&${id}> is already globally ignored.`);
        }

        if (userMatch) {
            const id = userMatch[1];
            if (!config.ignore.users.includes(id)) {
                config.ignore.users.push(id);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Added', `<@${id}> is now globally ignored.`);
            }
            return this.sendInfo(message, 'Already Ignored', `<@${id}> is already globally ignored.`);
        }

        return this.sendError(message, 'Invalid Target', 'Please mention a channel, role, or user.');
    },

    async handleUnignore(message, args, client, config) {
        const target = args[1];
        const modName = args[2]?.toLowerCase();

        if (!target) {
            return this.sendError(message, 'Invalid Usage', 'Usage: `.automod unignore <#channel|@role|@user> [module]`');
        }

        const channelMatch = target.match(/<#(\d+)>/);
        const roleMatch = target.match(/<@&(\d+)>/);
        const userMatch = target.match(/<@!?(\d+)>/);

        if (modName && MODULES[modName] && config.modules[modName]?.ignore) {
            if (channelMatch) {
                const id = channelMatch[1];
                const idx = config.modules[modName].ignore.channels.indexOf(id);
                if (idx > -1) {
                    config.modules[modName].ignore.channels.splice(idx, 1);
                    await this.saveConfig(client, message.guildId, config);
                    return this.sendSuccess(message, 'Ignore Removed', `<#${id}> is no longer ignored for **${MODULES[modName].name}**.`);
                }
            }
            if (roleMatch) {
                const id = roleMatch[1];
                const idx = config.modules[modName].ignore.roles.indexOf(id);
                if (idx > -1) {
                    config.modules[modName].ignore.roles.splice(idx, 1);
                    await this.saveConfig(client, message.guildId, config);
                    return this.sendSuccess(message, 'Ignore Removed', `<@&${id}> is no longer ignored for **${MODULES[modName].name}**.`);
                }
            }
        }

        if (!config.ignore) config.ignore = { channels: [], roles: [], users: [] };

        if (channelMatch) {
            const id = channelMatch[1];
            const idx = config.ignore.channels.indexOf(id);
            if (idx > -1) {
                config.ignore.channels.splice(idx, 1);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Removed', `<#${id}> is no longer globally ignored.`);
            }
            return this.sendInfo(message, 'Not Ignored', `<#${id}> was not in the ignore list.`);
        }

        if (roleMatch) {
            const id = roleMatch[1];
            const idx = config.ignore.roles.indexOf(id);
            if (idx > -1) {
                config.ignore.roles.splice(idx, 1);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Removed', `<@&${id}> is no longer globally ignored.`);
            }
            return this.sendInfo(message, 'Not Ignored', `<@&${id}> was not in the ignore list.`);
        }

        if (userMatch) {
            const id = userMatch[1];
            const idx = config.ignore.users.indexOf(id);
            if (idx > -1) {
                config.ignore.users.splice(idx, 1);
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Ignore Removed', `<@${id}> is no longer globally ignored.`);
            }
            return this.sendInfo(message, 'Not Ignored', `<@${id}> was not in the ignore list.`);
        }

        return this.sendError(message, 'Invalid Target', 'Please mention a channel, role, or user.');
    },

    async handleWords(message, args, client, config) {
        const action = args[1]?.toLowerCase();
        const word = args.slice(2).join(' ').toLowerCase();

        if (!config.modules.badwords) {
            config.modules.badwords = { enabled: false, punishment: 'delete', words: [], ignore: { channels: [], roles: [] } };
        }

        if (!action || action === 'list') {
            const words = config.modules.badwords.words || [];
            if (!words.length) {
                return this.sendInfo(message, 'Bad Words List', 'No bad words configured.\n\nUse `.automod words add <word>` to add words.');
            }
            return this.sendInfo(message, `Bad Words (${words.length})`, words.map((w, i) => `\`${i + 1}\` ||${w}||`).slice(0, 50).join('\n') + (words.length > 50 ? `\n*...and ${words.length - 50} more*` : ''));
        }

        if (action === 'add') {
            if (!word) return this.sendError(message, 'Missing Word', 'Usage: `.automod words add <word or phrase>`');
            if (!config.modules.badwords.words) config.modules.badwords.words = [];
            if (config.modules.badwords.words.includes(word)) {
                return this.sendInfo(message, 'Already Added', `\`${word}\` is already in the bad words list.`);
            }
            config.modules.badwords.words.push(word);
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Word Added', `||${word}|| has been added to the bad words list.`);
        }

        if (action === 'remove') {
            if (!word) return this.sendError(message, 'Missing Word', 'Usage: `.automod words remove <word or phrase>`');
            const idx = config.modules.badwords.words?.indexOf(word);
            if (idx === undefined || idx === -1) {
                return this.sendInfo(message, 'Not Found', `\`${word}\` is not in the bad words list.`);
            }
            config.modules.badwords.words.splice(idx, 1);
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Word Removed', `||${word}|| has been removed from the bad words list.`);
        }

        if (action === 'clear') {
            config.modules.badwords.words = [];
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Words Cleared', 'All bad words have been removed.');
        }

        return this.sendError(message, 'Invalid Action', 'Valid actions: `add`, `remove`, `list`, `clear`');
    },

    async handleLogChannel(message, args, client, config) {
        const channel = message.mentions.channels.first() || (args[1] ? message.guild.channels.cache.get(args[1].replace(/[<#>]/g, '')) : null);

        if (!channel) {
            if (config.logChannel) {
                return this.sendInfo(message, 'Log Channel', `Current log channel: <#${config.logChannel}>\n\nUse \`.automod logchannel <#channel>\` to change.`);
            }
            return this.sendInfo(message, 'Log Channel', 'No log channel set.\n\nUse `.automod logchannel <#channel>` to set one.');
        }

        config.logChannel = channel.id;
        await this.saveConfig(client, message.guildId, config);
        return this.sendSuccess(message, 'Log Channel Set', `Automod violations will now be logged to ${channel}.`);
    },

    async handleConfig(message, config) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.security || '🛡️'} Automod Configuration`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let moduleStatus = '';
        for (const [key, mod] of Object.entries(MODULES)) {
            const cfg = config.modules?.[key] || {};
            const status = cfg.enabled ? EMOJIS.success || '✅' : EMOJIS.error || '❌';
            const punishments = cfg.punishments || (cfg.punishment ? [cfg.punishment] : [mod.defaultPunishment]);
            const threshold = cfg.threshold || 1;
            moduleStatus += `${status} **${mod.name}** → ${punishments.join('+')} (${threshold})\n`;
        }

        const globalIgnore = config.ignore || { channels: [], roles: [], users: [] };
        const ignoreCount = globalIgnore.channels.length + globalIgnore.roles.length + globalIgnore.users.length;

        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Status:** ${config.enabled ? `${EMOJIS.success || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}\n` +
                `**Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '*Not set*'}\n` +
                `**Global Ignores:** ${ignoreCount}\n\n` +
                `**Modules:**\n${moduleStatus}`
            )
        );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    },

    async handleStats(message, config) {
        const warnings = config.warnings || {};
        const totalWarnings = Object.values(warnings).reduce((sum, u) => sum + (u.count || 0), 0);
        const usersWarned = Object.keys(warnings).length;

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# 📊 Automod Statistics`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**Total Warnings Issued:** ${totalWarnings}\n` +
                `**Users with Warnings:** ${usersWarned}\n\n` +
                `*Statistics are tracked per-guild and persist until manually reset.*`
            )
        );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    },

    async handleStrikes(message, args, client, config) {
        const action = args[1]?.toLowerCase();
        const target = args[2];
        const value = args[3];

        if (!config.strikes) config.strikes = {};
        if (!config.strikeActions) config.strikeActions = { 3: { action: 'mute', duration: '10m' }, 5: { action: 'mute', duration: '1h' }, 7: { action: 'kick' }, 10: { action: 'ban' } };

        if (action === 'on' || action === 'enable') {
            config.strikesEnabled = true;
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Strikes Enabled', 'The strike system is now **enabled**. Users will accumulate strikes for automod violations.');
        }

        if (action === 'off' || action === 'disable') {
            config.strikesEnabled = false;
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Strikes Disabled', 'The strike system is now **disabled**. Users will not accumulate strikes.');
        }

        if (!action || action === 'help') {
            const strikesEnabled = config.strikesEnabled !== false;
            const actionsText = Object.entries(config.strikeActions)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([strikes, cfg]) => `**${strikes} strikes** → ${cfg.action}${cfg.duration ? ` (${cfg.duration})` : ''}`)
                .join('\n');

            let content = `**Strike System**\n\n`;
            content += `**Status:** ${strikesEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n`;
            content += `Strikes accumulate per-user. When thresholds are reached, automated actions trigger.\n\n`;
            content += `**Current Actions:**\n${actionsText || '*None configured*'}\n\n`;
            content += `**Strike Expiry:** ${config.strikeExpiry || 24} hours\n\n`;
            content += `**Commands:**\n`;
            content += `\`.automod strikes on/off\` - Enable/disable strike system\n`;
            content += `\`.automod strikes @user\` - View user's strikes\n`;
            content += `\`.automod strikes give @user [amount]\` - Add strikes\n`;
            content += `\`.automod strikes remove @user [amount]\` - Remove strikes\n`;
            content += `\`.automod strikes clear @user\` - Clear all strikes\n`;
            content += `\`.automod strikes set <threshold> <action> [duration]\`\n`;
            content += `\`.automod strikes expiry <hours>\` - Set expiry time`;
            return this.sendInfo(message, 'Strike System', content);
        }

        const userMatch = target?.match(/<@!?(\d+)>/) || target?.match(/^(\d{17,19})$/);

        if (action === 'give' || action === 'add') {
            if (!userMatch) return this.sendError(message, 'Invalid User', 'Please mention a user or provide their ID.');
            const userId = userMatch[1];
            const amount = parseInt(value) || 1;
            if (!config.strikes[userId]) config.strikes[userId] = { count: 0, history: [] };
            config.strikes[userId].count += amount;
            config.strikes[userId].lastStrike = Date.now();
            config.strikes[userId].history.push({ time: Date.now(), amount, reason: 'Manual', by: message.author.id });
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Strikes Added', `Added **${amount}** strike(s) to <@${userId}>. Total: **${config.strikes[userId].count}**`);
        }

        if (action === 'remove' || action === 'take') {
            if (!userMatch) return this.sendError(message, 'Invalid User', 'Please mention a user or provide their ID.');
            const userId = userMatch[1];
            const amount = parseInt(value) || 1;
            if (!config.strikes[userId]) config.strikes[userId] = { count: 0, history: [] };
            config.strikes[userId].count = Math.max(0, config.strikes[userId].count - amount);
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Strikes Removed', `Removed **${amount}** strike(s) from <@${userId}>. Total: **${config.strikes[userId].count}**`);
        }

        if (action === 'clear') {
            if (!userMatch) return this.sendError(message, 'Invalid User', 'Please mention a user or provide their ID.');
            const userId = userMatch[1];
            delete config.strikes[userId];
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Strikes Cleared', `Cleared all strikes for <@${userId}>.`);
        }

        if (action === 'set') {
            const threshold = parseInt(target);
            const actionType = value?.toLowerCase();
            const duration = args[4];

            if (!threshold || threshold < 1) return this.sendError(message, 'Invalid Threshold', 'Threshold must be a positive number.');
            if (!['mute', 'kick', 'ban', 'clear'].includes(actionType)) return this.sendError(message, 'Invalid Action', 'Valid actions: `mute`, `kick`, `ban`, `clear`');

            if (actionType === 'clear') {
                delete config.strikeActions[threshold];
                await this.saveConfig(client, message.guildId, config);
                return this.sendSuccess(message, 'Action Removed', `Removed action for ${threshold} strikes.`);
            }

            config.strikeActions[threshold] = { action: actionType, duration: duration || undefined };
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Action Set', `At **${threshold} strikes**: ${actionType}${duration ? ` (${duration})` : ''}`);
        }

        if (action === 'expiry') {
            const hours = parseInt(target);
            if (!hours || hours < 1) return this.sendError(message, 'Invalid Hours', 'Expiry must be a positive number of hours.');
            config.strikeExpiry = hours;
            await this.saveConfig(client, message.guildId, config);
            return this.sendSuccess(message, 'Expiry Set', `Strikes will now expire after **${hours} hours**.`);
        }

        if (userMatch) {
            const userId = userMatch[1];
            const userData = config.strikes[userId];
            if (!userData || userData.count === 0) {
                return this.sendInfo(message, 'User Strikes', `<@${userId}> has **0 strikes**.`);
            }
            const history = (userData.history || []).slice(-5).map(h =>
                `• ${h.amount} strike(s) - ${h.reason || 'Unknown'} (<t:${Math.floor(h.time / 1000)}:R>)`
            ).join('\n');
            return this.sendInfo(message, 'User Strikes', `<@${userId}> has **${userData.count} strikes**.\n\n**Recent History:**\n${history || '*No history*'}`);
        }

        return this.sendError(message, 'Invalid Usage', 'Use `.automod strikes` for help.');
    },

    async handleNotify(message, args, client, config) {
        const action = args[1]?.toLowerCase();

        if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
            const status = config.notifyUser !== false ? 'Enabled' : 'Disabled';
            const emoji = config.notifyUser !== false ? EMOJIS.success : EMOJIS.error;
            return this.sendInfo(message, 'Notify Settings',
                `**User Warnings:** ${emoji} **${status}**\n\n` +
                `When enabled, users will receive a temporary message in the channel mentioning them when their message is deleted/moderated.\n\n` +
                `Usage: \`.automod notify on/off\``
            );
        }

        const newState = (action === 'on' || action === 'enable');
        config.notifyUser = newState;
        await this.saveConfig(client, message.guildId, config);

        return this.sendSuccess(message, 'Notify Updated',
            `User warnings have been ${newState ? '**enabled**' : '**disabled**'}.`
        );
    },

    async handleReset(message, client) {
        const config = getDefaultConfig();
        await this.saveConfig(client, message.guildId, config);
        return this.sendSuccess(message, 'Automod Reset', 'All automod settings have been reset to defaults.');
    },

    sendError(message, title, description) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    },

    sendSuccess(message, title, description) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    },

    sendInfo(message, title, description) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ℹ️ ${title}`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(description));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
};
