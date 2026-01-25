import { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const getDefaultConfig = () => ({
    enabled: false,
    raidState: false,
    logChannel: null,
    massjoin: {
        enabled: false,
        threshold: 5,
        action: 'kick',
        lockChannels: false
    },
    avatar: {
        enabled: false,
        action: 'kick'
    },
    newaccounts: {
        enabled: false,
        threshold: 7,
        action: 'kick'
    },
    whitelist: []
});

const parseFlags = (args) => {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2).toLowerCase();
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
            flags[key] = value;
            if (value !== 'true') i++;
        }
    }
    return flags;
};

const buildConfigContainer = (config) => {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.antiraidemoji || '🛡️'} **ANTI-RAID CONFIGURATION**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    const raidStatus = config.raidState ? `${EMOJIS.error || '🚨'} **RAID MODE ACTIVE**` : `${EMOJIS.success || '✅'} Normal`;

    container.addTextDisplayComponents(td =>
        td.setContent(
            `**System Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
            `**Raid State:** ${raidStatus}\n` +
            `**Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '*Not set*'}`
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    container.addTextDisplayComponents(td =>
        td.setContent(
            `🚨 **Mass Join Detection**\n` +
            `├ Status: ${config.massjoin?.enabled ? '`Enabled`' : '`Disabled`'}\n` +
            `├ Threshold: \`${config.massjoin?.threshold || 5}\` joins/10s\n` +
            `├ Action: \`${config.massjoin?.action || 'kick'}\`\n` +
            `└ Lock Channels: ${config.massjoin?.lockChannels ? '`Yes`' : '`No`'}`
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(
            `🖼️ **Avatar Check**\n` +
            `├ Status: ${config.avatar?.enabled ? '`Enabled`' : '`Disabled`'}\n` +
            `└ Action: \`${config.avatar?.action || 'kick'}\``
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td =>
        td.setContent(
            `📅 **New Account Filter**\n` +
            `├ Status: ${config.newaccounts?.enabled ? '`Enabled`' : '`Disabled`'}\n` +
            `├ Minimum Age: \`${config.newaccounts?.threshold || 7}\` days\n` +
            `└ Action: \`${config.newaccounts?.action || 'kick'}\``
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    const whitelistCount = config.whitelist?.length || 0;
    container.addTextDisplayComponents(td =>
        td.setContent(`📋 **Whitelist:** ${whitelistCount} user${whitelistCount !== 1 ? 's' : ''}`)
    );

    return container;
};

const buildSuccessContainer = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

const buildErrorContainer = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

export { getDefaultConfig };

export default {
    name: 'antiraid',
    aliases: ['ar'],
    description: 'Configure protection against raids',
    usage: '.antiraid <subcommand>',
    category: 'Anti Raid',

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({
                components: [buildErrorContainer('Permission Denied', 'You need **Manage Server** permission.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
        let config = guildData.antiraid || getDefaultConfig();

        const saveConfig = async () => {
            await client.db.updateOne(
                { guildId: message.guildId },
                { $set: { antiraid: config } },
                { upsert: true }
            );
        };

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand || subcommand === 'config') {
            return message.reply({
                components: [buildConfigContainer(config)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'enable' || subcommand === 'on') {
            config.enabled = true;
            await saveConfig();
            return message.reply({
                components: [buildSuccessContainer('Anti-Raid Enabled', 'The anti-raid system is now active.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'disable' || subcommand === 'off') {
            config.enabled = false;
            await saveConfig();
            return message.reply({
                components: [buildSuccessContainer('Anti-Raid Disabled', 'The anti-raid system is now inactive.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'massjoin') {
            const setting = args[1]?.toLowerCase();
            const flags = parseFlags(args.slice(2));

            if (setting === 'on' || setting === 'enable') {
                config.massjoin.enabled = true;
            } else if (setting === 'off' || setting === 'disable') {
                config.massjoin.enabled = false;
            }

            if (flags.threshold) {
                const t = parseInt(flags.threshold);
                if (t >= 2 && t <= 20) config.massjoin.threshold = t;
            }
            if (flags.do) {
                if (['ban', 'kick'].includes(flags.do.toLowerCase())) {
                    config.massjoin.action = flags.do.toLowerCase();
                }
            }
            if (flags.lock !== undefined) {
                config.massjoin.lockChannels = flags.lock === 'true' || flags.lock === true;
            }

            await saveConfig();
            return message.reply({
                components: [buildSuccessContainer('Mass Join Updated',
                    `**Status:** ${config.massjoin.enabled ? 'Enabled' : 'Disabled'}\n` +
                    `**Threshold:** ${config.massjoin.threshold} joins/10s\n` +
                    `**Action:** ${config.massjoin.action}\n` +
                    `**Lock Channels:** ${config.massjoin.lockChannels ? 'Yes' : 'No'}`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'avatar') {
            const setting = args[1]?.toLowerCase();
            const flags = parseFlags(args.slice(2));

            if (setting === 'on' || setting === 'enable') {
                config.avatar.enabled = true;
            } else if (setting === 'off' || setting === 'disable') {
                config.avatar.enabled = false;
            }

            if (flags.do) {
                if (['ban', 'kick'].includes(flags.do.toLowerCase())) {
                    config.avatar.action = flags.do.toLowerCase();
                }
            }

            await saveConfig();
            return message.reply({
                components: [buildSuccessContainer('Avatar Check Updated',
                    `**Status:** ${config.avatar.enabled ? 'Enabled' : 'Disabled'}\n` +
                    `**Action:** ${config.avatar.action}`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'newaccounts' || subcommand === 'age') {
            const setting = args[1]?.toLowerCase();
            const flags = parseFlags(args.slice(2));

            if (setting === 'on' || setting === 'enable') {
                config.newaccounts.enabled = true;
            } else if (setting === 'off' || setting === 'disable') {
                config.newaccounts.enabled = false;
            }

            if (flags.threshold) {
                const t = parseInt(flags.threshold);
                if (t >= 1 && t <= 90) config.newaccounts.threshold = t;
            }
            if (flags.do) {
                if (['ban', 'kick'].includes(flags.do.toLowerCase())) {
                    config.newaccounts.action = flags.do.toLowerCase();
                }
            }

            await saveConfig();
            return message.reply({
                components: [buildSuccessContainer('New Accounts Filter Updated',
                    `**Status:** ${config.newaccounts.enabled ? 'Enabled' : 'Disabled'}\n` +
                    `**Minimum Age:** ${config.newaccounts.threshold} days\n` +
                    `**Action:** ${config.newaccounts.action}`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'state') {
            config.raidState = !config.raidState;
            await saveConfig();

            if (config.raidState) {
                return message.reply({
                    components: [buildErrorContainer('🚨 RAID MODE ACTIVATED',
                        'The server is now in raid mode.\n' +
                        '• New members will be punished based on your settings.\n' +
                        '• Use `.antiraid state` again to disable.'
                    )],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            } else {
                return message.reply({
                    components: [buildSuccessContainer('Raid Mode Deactivated', 'The server is no longer in raid mode.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }
        }

        if (subcommand === 'whitelist') {
            const action = args[1]?.toLowerCase();

            if (action === 'view') {
                const whitelist = config.whitelist || [];
                if (whitelist.length === 0) {
                    return message.reply({
                        components: [buildSuccessContainer('Whitelist Empty', 'No users are currently whitelisted.')],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { repliedUser: false }
                    });
                }

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`📋 **ANTIRAID WHITELIST**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td =>
                    td.setContent(whitelist.map((id, i) => `\`${i + 1}\` <@${id}>`).join('\n'))
                );
                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const userMatch = args[1]?.match(/<@!?(\d+)>/) || args[1]?.match(/^(\d{17,19})$/);
            if (!userMatch) {
                return message.reply({
                    components: [buildErrorContainer('Invalid User', 'Please mention a user or provide their ID.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const userId = userMatch[1];
            if (!config.whitelist) config.whitelist = [];

            if (config.whitelist.includes(userId)) {
                return message.reply({
                    components: [buildErrorContainer('Already Whitelisted', `<@${userId}> is already on the whitelist.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            config.whitelist.push(userId);
            await saveConfig();

            return message.reply({
                components: [buildSuccessContainer('User Whitelisted',
                    `<@${userId}> has been added to the whitelist.\n` +
                    `*They can join once without being checked. The whitelist entry is one-time use.*`
                )],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'log' || subcommand === 'logs') {
            const channelMatch = args[1]?.match(/<#(\d+)>/) || args[1]?.match(/^(\d{17,19})$/);

            if (args[1]?.toLowerCase() === 'off' || args[1]?.toLowerCase() === 'none') {
                config.logChannel = null;
                await saveConfig();
                return message.reply({
                    components: [buildSuccessContainer('Logs Disabled', 'Anti-raid logging has been disabled.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            if (!channelMatch) {
                return message.reply({
                    components: [buildErrorContainer('Invalid Channel', 'Please mention a channel or use `off` to disable.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            config.logChannel = channelMatch[1];
            await saveConfig();

            return message.reply({
                components: [buildSuccessContainer('Log Channel Set', `Anti-raid events will be logged to <#${config.logChannel}>.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const helpContainer = new ContainerBuilder();
        helpContainer.addTextDisplayComponents(td =>
            td.setContent(
                `${EMOJIS.antiraidemoji || '🛡️'} **ANTI-RAID COMMANDS**\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
        );
        helpContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        helpContainer.addTextDisplayComponents(td =>
            td.setContent(
                `\`.antiraid config\` - View current configuration\n` +
                `\`.antiraid enable/disable\` - Toggle system\n` +
                `\`.antiraid massjoin <on|off> [--threshold] [--do] [--lock]\`\n` +
                `\`.antiraid avatar <on|off> [--do]\`\n` +
                `\`.antiraid newaccounts <on|off> [--threshold] [--do]\`\n` +
                `\`.antiraid state\` - Toggle raid mode\n` +
                `\`.antiraid whitelist <user>\` - One-time bypass\n` +
                `\`.antiraid whitelist view\` - View whitelist\n` +
                `\`.antiraid log <#channel|off>\` - Set log channel`
            )
        );

        return message.reply({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
