import {
    MessageFlags,
    ContainerBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const TIMEZONES = [
    { label: 'UTC', value: 'UTC' },
    { label: 'India (IST)', value: 'Asia/Kolkata' },
    { label: 'US Eastern', value: 'America/New_York' },
    { label: 'US Pacific', value: 'America/Los_Angeles' },
    { label: 'UK (GMT/BST)', value: 'Europe/London' },
    { label: 'Central Europe', value: 'Europe/Berlin' },
    { label: 'Japan (JST)', value: 'Asia/Tokyo' },
    { label: 'Australia Eastern', value: 'Australia/Sydney' },
    { label: 'Dubai (GST)', value: 'Asia/Dubai' },
    { label: 'Singapore (SGT)', value: 'Asia/Singapore' }
];

const DEFAULT_WISH = {
    content: 'Happy Birthday {user}! ❤️',
    title: '🎂 Happy Birthday!',
    description: 'Wishing you an amazing day filled with joy and happiness!',
    thumbnail: 'avatar',
    image: '',
    footer: ''
};

const getGuildData = async (client, guildId) => {
    return await client.db.findOne({ guildId }) || {};
};

const updateGuildData = async (client, guildId, update) => {
    await client.db.updateOne({ guildId }, update, { upsert: true });
};

const buildError = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

const buildSuccess = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

const buildWizardContainer = (config) => {
    const container = new ContainerBuilder();

    const statusEmoji = config.enabled ? (EMOJIS.success || '✅') : (EMOJIS.error || '❌');
    const statusText = config.enabled ? 'Enabled' : 'Disabled';

    container.addTextDisplayComponents(td => td.setContent(`# 🎂 Birthday System Setup`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    const cmdChannel = config.commandChannel ? `<#${config.commandChannel}>` : '`Not Set`';
    const wishChannel = config.wishChannel ? `<#${config.wishChannel}>` : '`Not Set`';
    const tz = config.timezone || 'GMT';
    const bdayRole = config.birthdayRole ? `<@&${config.birthdayRole}>` : '`Not Set`';

    container.addTextDisplayComponents(td => td.setContent(
        `**Status:** ${statusEmoji} ${statusText}\n` +
        `**Command Channel:** ${cmdChannel}\n` +
        `**Wish Channel:** ${wishChannel}\n` +
        `**Birthday Role:** ${bdayRole} (24h)\n` +
        `**Timezone:** \`${tz}\``
    ));

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    const toggleBtn = new ButtonBuilder()
        .setCustomId('birthday_toggle')
        .setLabel(config.enabled ? 'Disable' : 'Enable')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success);

    const cmdChBtn = new ButtonBuilder()
        .setCustomId('birthday_cmd_channel')
        .setLabel('Command Channel')
        .setStyle(ButtonStyle.Secondary);

    const wishChBtn = new ButtonBuilder()
        .setCustomId('birthday_wish_channel')
        .setLabel('Wish Channel')
        .setStyle(ButtonStyle.Secondary);

    container.addActionRowComponents(row => row.addComponents(toggleBtn, cmdChBtn, wishChBtn));

    const tzBtn = new ButtonBuilder()
        .setCustomId('birthday_timezone')
        .setLabel('Timezone')
        .setStyle(ButtonStyle.Secondary);

    const roleBtn = new ButtonBuilder()
        .setCustomId('birthday_role')
        .setLabel('Birthday Role')
        .setStyle(ButtonStyle.Secondary);

    const customizeBtn = new ButtonBuilder()
        .setCustomId('birthday_customize')
        .setLabel('Customize')
        .setStyle(ButtonStyle.Primary);

    const previewBtn = new ButtonBuilder()
        .setCustomId('birthday_preview')
        .setLabel('Preview')
        .setStyle(ButtonStyle.Success);

    container.addActionRowComponents(row => row.addComponents(tzBtn, roleBtn, customizeBtn, previewBtn));

    return container;
};

export default {
    name: 'birthday',
    aliases: ['bday', 'bd'],
    description: 'Birthday system commands',
    usage: '.birthday set <DD/MM>\n.birthday view [@user]\n.birthday upcoming\n.birthday remove\n.birthday setup (Admin)',
    category: 'Birthday',

    async execute(message, args, client) {
        const guildData = await getGuildData(client, message.guildId);
        const config = guildData.birthday_config || { enabled: false, commandChannel: null, wishChannel: null, timezone: 'GMT', wishMessage: DEFAULT_WISH };
        const birthdays = guildData.birthdays || {};

        const subcommand = args[0]?.toLowerCase();
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.Administrator);

        if (subcommand === 'setup') {
            if (!isAdmin) {
                return message.reply({
                    components: [buildError('Permission Denied', 'You need **Manage Server** permission.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const wizardContainer = buildWizardContainer(config);

            return message.reply({
                components: [wizardContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        if (subcommand === 'check') {
            if (!isAdmin) {
                return message.reply({
                    components: [buildError('Permission Denied', 'You need **Manage Server** permission.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            if (!config.enabled || !config.wishChannel) {
                return message.reply({
                    components: [buildError('Not Configured', 'Birthday system is not enabled or wish channel not set. Use `.birthday setup` first.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const { getTodayInTimezone, replaceVariables, buildWishContainer } = await import('../../../events/birthdayHandler.js');
            const { TextDisplayBuilder } = await import('discord.js');

            const timezone = config.timezone || 'GMT';
            const { day, month } = getTodayInTimezone(timezone);

            const wishChannel = message.guild.channels.cache.get(config.wishChannel);
            if (!wishChannel) {
                return message.reply({
                    components: [buildError('Channel Not Found', 'Wish channel no longer exists.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            let wished = 0;
            let debugInfo = `Today: ${day}/${month} | Birthdays found: ${Object.keys(birthdays).length}`;

            for (const [userId, bday] of Object.entries(birthdays)) {
                const bdayDay = parseInt(bday.day, 10);
                const bdayMonth = parseInt(bday.month, 10);

                debugInfo += `\n- User ${userId}: ${bdayDay}/${bdayMonth}`;

                if (bdayDay !== day || bdayMonth !== month) continue;

                try {
                    debugInfo += ' -> Match found';
                    const member = await message.guild.members.fetch(userId).catch(() => null);
                    if (!member) {
                        debugInfo += ' -> Member not found';
                        continue;
                    }

                    const context = {
                        userMention: `<@${userId}>`,
                        username: member.user.username,
                        avatar: member.user.displayAvatarURL({ size: 512 }),
                        serverName: message.guild.name,
                        serverAvatar: message.guild.iconURL({ size: 512 }) || ''
                    };

                    const wishMsg = config.wishMessage || DEFAULT_WISH;
                    const content = replaceVariables(wishMsg.content, context);
                    const container = buildWishContainer(config, context);

                    const components = [];
                    if (content) {
                        components.push(new TextDisplayBuilder().setContent(content));
                    }
                    components.push(container);

                    try {
                        await wishChannel.send({
                            components,
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { users: [userId] }
                        });
                        debugInfo += ' -> SENT';
                    } catch (err) {
                        debugInfo += ` -> Send Error: ${err.message}`;
                        console.error(err);
                        continue;
                    }

                    if (config.birthdayRole) {
                        const role = message.guild.roles.cache.get(config.birthdayRole);
                        if (role) {
                            await member.roles.add(role).catch(err => {
                                debugInfo += ` -> Role Error: ${err.message}`;
                            });
                            setTimeout(() => member.roles.remove(role).catch(() => {}), 24 * 60 * 60 * 1000);
                        }
                    }

                    wished++;
                } catch (e) {
                    debugInfo += ` -> Critical Error: ${e.message}`;
                    console.error('[Birthday Check]', e);
                }
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Birthday Check Complete`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                wished > 0
                    ? `Wished **${wished}** member(s) happy birthday!`
                    : `No birthdays today.`
            ));

            if (wished === 0 || args.includes('--debug')) {
                 container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(false));
                 container.addTextDisplayComponents(td => td.setContent(`-# Debug: ${debugInfo}`));
            }

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'config') {
            if (!isAdmin) {
                return message.reply({
                    components: [buildError('Permission Denied', 'You need **Manage Server** permission.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const wizardContainer = buildWizardContainer(config);
            return message.reply({
                components: [wizardContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (config.commandChannel && message.channelId !== config.commandChannel) {
            return message.reply({
                components: [buildError('Wrong Channel', `Birthday commands can only be used in <#${config.commandChannel}>.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'set') {
            const dateInput = args[1];
            if (!dateInput) {
                return message.reply({
                    components: [buildError('Invalid Usage', 'Usage: `.birthday set DD/MM` (e.g. `.birthday set 25/12`)')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const parts = dateInput.split(/[\/\-\.]/);
            if (parts.length !== 2) {
                return message.reply({
                    components: [buildError('Invalid Format', 'Use DD/MM format (e.g. `25/12` for December 25th)')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);

            if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
                return message.reply({
                    components: [buildError('Invalid Date', 'Please provide a valid date (DD/MM)')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (day > daysInMonth[month - 1]) {
                return message.reply({
                    components: [buildError('Invalid Date', `Month ${month} doesn't have ${day} days.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            birthdays[message.author.id] = { day, month };
            await updateGuildData(client, message.guildId, { $set: { birthdays } });

            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return message.reply({
                components: [buildSuccess('Birthday Set', `Your birthday has been set to **${day} ${monthNames[month - 1]}** 🎂`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'view' || !subcommand) {
            const targetUser = message.mentions.users.first() || message.author;
            const birthday = birthdays[targetUser.id];

            if (!birthday) {
                const notSetMsg = targetUser.id === message.author.id
                    ? 'You haven\'t set your birthday yet. Use `.birthday set DD/MM`'
                    : `${targetUser.username} hasn't set their birthday.`;
                return message.reply({
                    components: [buildError('No Birthday', notSetMsg)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`🎂 **${targetUser.username}'s Birthday**`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`**${birthday.day} ${monthNames[birthday.month - 1]}**`));

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'upcoming') {
            const page = parseInt(args[1], 10) || 1;
            const perPage = 10;

            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth() + 1;

            const upcoming = [];
            for (const [userId, bday] of Object.entries(birthdays)) {
                let daysUntil;
                const thisYear = now.getFullYear();
                const bdayDate = new Date(thisYear, bday.month - 1, bday.day);

                if (bdayDate < now) {
                    bdayDate.setFullYear(thisYear + 1);
                }

                daysUntil = Math.ceil((bdayDate - now) / (1000 * 60 * 60 * 24));

                if (daysUntil <= 30) {
                    upcoming.push({ userId, day: bday.day, month: bday.month, daysUntil });
                }
            }

            upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

            if (upcoming.length === 0) {
                return message.reply({
                    components: [buildError('No Upcoming', 'No birthdays in the next 30 days.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const totalPages = Math.ceil(upcoming.length / perPage);
            const safePage = Math.max(1, Math.min(page, totalPages));
            const start = (safePage - 1) * perPage;
            const pageItems = upcoming.slice(start, start + perPage);

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const list = pageItems.map((item, i) => {
                const num = start + i + 1;
                const daysText = item.daysUntil === 0 ? '**Today!**' : item.daysUntil === 1 ? 'Tomorrow' : `in ${item.daysUntil} days`;
                return `${num}. <@${item.userId}> - ${item.day} ${monthNames[item.month - 1]} (${daysText})`;
            }).join('\n');

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`🎂 **Upcoming Birthdays**`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(list));

            if (totalPages > 1) {
                const prevBtn = new ButtonBuilder()
                    .setCustomId(`birthday_upcoming_${safePage - 1}`)
                    .setLabel('◀ Prev')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage <= 1);

                const nextBtn = new ButtonBuilder()
                    .setCustomId(`birthday_upcoming_${safePage + 1}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage >= totalPages);

                const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

                return message.reply({
                    components: [container, row],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        if (subcommand === 'remove') {
            if (!birthdays[message.author.id]) {
                return message.reply({
                    components: [buildError('No Birthday', 'You don\'t have a birthday set.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            delete birthdays[message.author.id];
            await updateGuildData(client, message.guildId, { $set: { birthdays } });

            return message.reply({
                components: [buildSuccess('Birthday Removed', 'Your birthday has been removed.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`🎂 **Birthday Commands**`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
            '`.birthday set DD/MM` - Set your birthday\n' +
            '`.birthday view [@user]` - View birthday\n' +
            '`.birthday upcoming` - Upcoming birthdays\n' +
            '`.birthday remove` - Remove your birthday\n' +
            (isAdmin ? '`.birthday setup` - Admin setup wizard' : '')
        ));

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};

export { buildWizardContainer, TIMEZONES, DEFAULT_WISH };
