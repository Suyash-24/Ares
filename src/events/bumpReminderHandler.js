import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

const DISBOARD_BOT_ID = '302050872383242240';
const BUMP_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export default function registerBumpReminderHandler(client) {
    // Handle message creation for bump detection
    client.on('messageCreate', async (message) => {
        if (!message.guild) return;
        
        try {
            const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
            const config = guildData.bumpReminder;
            
            if (!config || !config.enabled || !config.channel) return;
            if (message.channelId !== config.channel) return;

            // Auto-clean non-bump messages if enabled
            if (config.autoClean && message.author.id !== DISBOARD_BOT_ID && message.author.id !== client.user.id) {
                // Don't delete if it's a command
                const prefix = '.';
                if (!message.content.startsWith(prefix) && !message.content.startsWith('/')) {
                    setTimeout(() => {
                        message.delete().catch(() => {});
                    }, 3000);
                    return;
                }
            }

            // Detect successful bump from Disboard
            if (message.author.id === DISBOARD_BOT_ID && message.interaction) {
                // Check if this is a bump command response
                if (message.interaction.commandName === 'bump') {
                    const userId = message.interaction.user.id;
                    await handleSuccessfulBump(client, message.guild, config, userId);
                }
            }
        } catch (error) {
            console.error(`[Bump Reminder] Error in messageCreate (Guild: ${message.guild?.name || 'Unknown'}):`, error);
        }
    });

    // Schedule reminder checks every minute
    setInterval(async () => {
        try {
            let checkedCount = 0;
            let remindersSent = 0;
            
            // Iterate through all cached guilds
            for (const guild of client.guilds.cache.values()) {
                const guildData = await client.db.findOne({ guildId: guild.id });
                if (!guildData) continue;
                
                const config = guildData.bumpReminder;
                
                if (!config || !config.enabled || !config.channel || !config.nextBump) continue;
                
                checkedCount++;
                const now = Date.now();
                
                if (now >= config.nextBump) {
                    await sendBumpReminder(client, guild, config);
                    remindersSent++;
                }
            }
        } catch (error) {
            console.error('[Bump Reminder] Error in reminder check:', error);
        }
    }, 60 * 1000); // Check every minute
}

async function handleSuccessfulBump(client, guild, config, userId) {
    try {
        const channel = guild.channels.cache.get(config.channel);
        if (!channel) return;

        const now = Date.now();
        const nextBump = now + BUMP_COOLDOWN;

        // Update database
        config.lastBump = now;
        config.nextBump = nextBump;
        config.lastBumpUser = userId;
        
        await client.db.updateOne(
            { guildId: guild.id },
            { $set: { bumpReminder: config } },
            { upsert: true }
        );

        // Send thank you message
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

        // Lock channel if auto-lock is enabled
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
        if (!channel) return;

        // Clear nextBump so we don't spam reminders
        config.nextBump = null;
        await client.db.updateOne(
            { guildId: guild.id },
            { $set: { bumpReminder: config } },
            { upsert: true }
        );

        // Unlock channel if it was locked
        if (config.autoLock) {
            await unlockChannel(guild, channel);
        }

        // Send reminder
        const reminderMsg = (config.reminderMessage || 'It\'s time to bump the server! Use `/bump`')
            .replace('{user}', config.lastBumpUser ? `<@${config.lastBumpUser}>` : '@here')
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
            content: config.lastBumpUser ? `<@${config.lastBumpUser}>` : '@here',
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: ['users', 'everyone', 'roles'] }
        }).catch(() => {});
    } catch (error) {
        console.error('[Bump Reminder] Error sending reminder:', error);
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
