import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

const DISBOARD_BOT_ID = '302050872383242240';
const BUMP_COOLDOWN = 2 * 60 * 60 * 1000;

export default function registerBumpReminderHandler(client) {

    client.on('messageCreate', async (message) => {
        if (!message.guild) return;

        try {
            const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
            const config = guildData.bumpReminder;

            if (!config || !config.enabled || !config.channel) return;
            if (message.channelId !== config.channel) return;

            if (config.autoClean && message.author.id !== DISBOARD_BOT_ID && message.author.id !== client.user.id) {

                const prefix = '.';
                if (!message.content.startsWith(prefix) && !message.content.startsWith('/')) {
                    setTimeout(() => {
                        message.delete().catch(() => {});
                    }, 3000);
                    return;
                }
            }

            if (message.author.id === DISBOARD_BOT_ID && message.interaction) {

                if (message.interaction.commandName === 'bump') {
                    const userId = message.interaction.user.id;
                    await handleSuccessfulBump(client, message.guild, config, userId);
                }
            }
        } catch (error) {
            console.error(`[Bump Reminder] Error in messageCreate (Guild: ${message.guild?.name || 'Unknown'}):`, error);
        }
    });

    setTimeout(async () => {
        console.log('[Bump Reminder] Running startup check for pending reminders...');
        await checkAndSendReminders(client);
    }, 10000);

    setInterval(async () => {
        await checkAndSendReminders(client);
    }, 60 * 1000);

    console.log('[Bump Reminder] Handler registered');
}

async function checkAndSendReminders(client) {
    try {
        const now = Date.now();
        let pendingCount = 0;

        for (const guild of client.guilds.cache.values()) {
            try {
                const guildData = await client.db.findOne({ guildId: guild.id });
                if (!guildData) continue;

                const config = guildData.bumpReminder;

                if (!config || !config.enabled || !config.channel) continue;

                if (!config.nextBump) {

                    continue;
                }

                pendingCount++;

                if (now >= config.nextBump) {
                    console.log(`[Bump Reminder] Time to send reminder to ${guild.name} (nextBump: ${new Date(config.nextBump).toISOString()}, now: ${new Date(now).toISOString()})`);
                    await sendBumpReminder(client, guild, config);
                }
            } catch (guildError) {
                console.error(`[Bump Reminder] Error checking guild ${guild.name}:`, guildError);
            }
        }
    } catch (error) {
        console.error('[Bump Reminder] Error in reminder check:', error);
    }
}

async function handleSuccessfulBump(client, guild, config, userId) {
    try {
        const channel = guild.channels.cache.get(config.channel);
        if (!channel) return;

        const now = Date.now();
        const nextBump = now + BUMP_COOLDOWN;

        config.lastBump = now;
        config.nextBump = nextBump;
        config.lastBumpUser = userId;

        await client.db.updateOne(
            { guildId: guild.id },
            { $set: { bumpReminder: config } },
            { upsert: true }
        );

        const thankyouMsg = (config.thankyouMessage || 'Thanks {user} for bumping! I\'ll remind you in 2 hours.')
            .replace('{user}', `<@${userId}>`)
            .replace('{server}', guild.name);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# 💚 Bump Successful!`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(thankyouMsg + `\n\n**Next Bump:** <t:${Math.floor(nextBump / 1000)}:R>`)
        );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => {});

        if (config.autoLock) {
            await lockChannel(guild, channel);
        }
    } catch (error) {
        console.error('[Bump Reminder] Error handling successful bump:', error);
    }
}

async function sendBumpReminder(client, guild, config) {
    try {
        const channel = guild.channels.cache.get(config.channel);
        if (!channel) {
            console.log(`[Bump Reminder] Channel ${config.channel} not found in ${guild.name}, skipping reminder`);
            return;
        }

        config.nextBump = null;
        await client.db.updateOne(
            { guildId: guild.id },
            { $set: { bumpReminder: config } },
            { upsert: true }
        );

        if (config.autoLock) {
            await unlockChannel(guild, channel);
        }

        const mentionText = config.lastBumpUser ? `<@${config.lastBumpUser}>` : '@here';
        const reminderMsg = (config.reminderMessage || '{user} it\'s time to bump the server! Use `/bump`')
            .replace('{user}', mentionText)
            .replace('{server}', guild.name);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ⏰ Bump Reminder`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(reminderMsg)
        );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: ['users', 'everyone', 'roles'] }
        });

        console.log(`[Bump Reminder] Successfully sent reminder in ${guild.name} (#${channel.name})`);
    } catch (error) {
        console.error(`[Bump Reminder] Error sending reminder to ${guild.name}:`, error);
    }
}

async function lockChannel(guild, channel) {
    try {
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return false;

        const botMember = await guild.members.fetch(guild.members.me.id);
        const channelPermissions = channel.permissionsFor(botMember);

        if (!channelPermissions.has(PermissionFlagsBits.ManageChannels)) return false;

        const everyoneRole = guild.roles.everyone;
        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
            AddReactions: false
        });
        return true;
    } catch (error) {
        return false;
    }
}

async function unlockChannel(guild, channel) {
    try {
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return false;

        const botMember = await guild.members.fetch(guild.members.me.id);
        const channelPermissions = channel.permissionsFor(botMember);

        if (!channelPermissions.has(PermissionFlagsBits.ManageChannels)) return false;

        const everyoneRole = guild.roles.everyone;
        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null,
            AddReactions: null
        });
        return true;
    } catch (error) {
        return false;
    }
}
