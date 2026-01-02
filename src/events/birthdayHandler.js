import { ContainerBuilder, SeparatorSpacingSize, MessageFlags, TextDisplayBuilder, MediaGalleryBuilder } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

// Variable replacer
const replaceVariables = (text, context) => {
    if (!text) return text;
    return text
        .replace(/{user}/g, context.userMention)
        .replace(/{username}/g, context.username)
        .replace(/{avatar}/g, context.avatar)
        .replace(/{servername}/g, context.serverName)
        .replace(/{serveravatar}/g, context.serverAvatar)
        .replace(/{timestamp}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`);
};

// Build wish container with improved aesthetics
const buildWishContainer = (config, context) => {
    const msg = config.wishMessage || {};
    const container = new ContainerBuilder();
    
    // Set accent color if configured (and not 'none')
    if (msg.accentColor && msg.accentColor !== 'none') {
        const colorInt = parseInt(msg.accentColor.replace('#', ''), 16);
        if (!isNaN(colorInt)) {
            container.setAccentColor(colorInt);
        }
    }
    
    // Resolve thumbnail URL
    let thumbUrl = null;
    if (msg.thumbnail) {
        thumbUrl = msg.thumbnail === 'avatar' ? context.avatar : replaceVariables(msg.thumbnail, context);
    }
    
    // Section 1: Title
    if (msg.title) {
        container.addTextDisplayComponents(td => td.setContent(`**${replaceVariables(msg.title, context)}**`));
    }
    
    // Separator after title
    if (msg.title && (msg.description || thumbUrl)) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }
    
    // Section 2: Description with thumbnail accessory
    if (msg.description || thumbUrl) {
        container.addSectionComponents(section => {
            const descText = msg.description ? replaceVariables(msg.description, context) : '\u200b';
            section.addTextDisplayComponents(td => td.setContent(descText));
            if (thumbUrl) {
                section.setThumbnailAccessory(thumb => thumb.setURL(thumbUrl));
            }
            return section;
        });
    }
    
    // Separator before image
    if (msg.image && (msg.description || thumbUrl)) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }
    
    // Section 3: Large Image
    if (msg.image) {
        const gallery = new MediaGalleryBuilder().addItems(item => 
            item.setURL(replaceVariables(msg.image, context))
        );
        container.addMediaGalleryComponents(gallery);
    }
    
    // Footer at bottom
    if (msg.footer) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`-# ${replaceVariables(msg.footer, context)}`));
    }

    return container;
};

// Check if it's midnight in the given timezone
const isMidnightInTimezone = (timezone) => {
    try {
        const now = new Date();
        const options = { timeZone: timezone, hour: 'numeric', hour12: false };
        const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now), 10);
        return hour === 0;
    } catch {
        return false;
    }
};

// Get today's date in timezone
const getTodayInTimezone = (timezone) => {
    try {
        const now = new Date();
        const options = { timeZone: timezone };
        const formatter = new Intl.DateTimeFormat('en-US', { ...options, day: 'numeric', month: 'numeric' });
        const parts = formatter.formatToParts(now);
        const day = parseInt(parts.find(p => p.type === 'day')?.value, 10);
        const month = parseInt(parts.find(p => p.type === 'month')?.value, 10);
        return { day, month };
    } catch {
        const now = new Date();
        return { day: now.getDate(), month: now.getMonth() + 1 };
    }
};

export default function registerBirthdayHandler(client) {
    // Track which guilds we've already wished today (reset hourly)
    const wishedToday = new Map(); // guildId -> Set of userIds

    const checkBirthdays = async () => {
        if (!client.db) return;

        try {
            // Iterate through cached guilds instead of querying all from DB
            for (const guild of client.guilds.cache.values()) {
                try {
                    const guildData = await client.db.findOne({ guildId: guild.id });
                    if (!guildData) continue;

                    const config = guildData.birthday_config;
                    if (!config?.enabled || !config.wishChannel) continue;

                    const timezone = config.timezone || 'GMT';
                    
                    // Only check at midnight in guild's timezone
                    if (!isMidnightInTimezone(timezone)) continue;

                    const { day, month } = getTodayInTimezone(timezone);
                    const birthdays = guildData.birthdays || {};

                    // Get wish channel
                    const wishChannel = guild.channels.cache.get(config.wishChannel);
                    if (!wishChannel) continue;

                    // Initialize wished set for this guild
                    if (!wishedToday.has(guild.id)) {
                        wishedToday.set(guild.id, new Set());
                    }
                    const wished = wishedToday.get(guild.id);

                    // Check each birthday
                    for (const [userId, bday] of Object.entries(birthdays)) {
                        const bDayVal = parseInt(bday.day, 10);
                        const bMonthVal = parseInt(bday.month, 10);
                        
                        if (bDayVal !== day || bMonthVal !== month) continue;
                        if (wished.has(userId)) continue;

                        try {
                            const member = await guild.members.fetch(userId).catch(() => null);
                            if (!member) continue;

                            // Build context
                            const context = {
                                userMention: `<@${userId}>`,
                                username: member.user.username,
                                avatar: member.user.displayAvatarURL({ size: 512 }),
                                serverName: guild.name,
                                serverAvatar: guild.iconURL({ size: 512 }) || ''
                            };

                            // Build and send wish
                            const wishMsg = config.wishMessage || { content: 'Happy Birthday {user}! ❤️', thumbnail: 'avatar' };
                            const content = replaceVariables(wishMsg.content, context);
                            
                            const container = buildWishContainer(config, context);
                            
                            // Build components array with content as top-level TextDisplay
                            const components = [];
                            if (content) {
                                components.push(new TextDisplayBuilder().setContent(content));
                            }
                            components.push(container);

                            await wishChannel.send({
                                components,
                                flags: MessageFlags.IsComponentsV2,
                                allowedMentions: { users: [userId] }
                            });

                            // Assign birthday role (24h)
                            if (config.birthdayRole) {
                                const bdayRole = guild.roles.cache.get(config.birthdayRole);
                                if (bdayRole && bdayRole.position < guild.members.me.roles.highest.position) {
                                    await member.roles.add(bdayRole).catch(() => {});
                                    console.log(`[Birthday] Gave role ${bdayRole.name} to ${member.user.tag}`);
                                    
                                    // Schedule role removal after 24 hours
                                    setTimeout(async () => {
                                        try {
                                            const freshMember = await guild.members.fetch(userId).catch(() => null);
                                            if (freshMember && freshMember.roles.cache.has(bdayRole.id)) {
                                                await freshMember.roles.remove(bdayRole);
                                                console.log(`[Birthday] Removed role ${bdayRole.name} from ${freshMember.user.tag}`);
                                            }
                                        } catch (err) {
                                            console.error(`[Birthday] Error removing role:`, err);
                                        }
                                    }, 24 * 60 * 60 * 1000); // 24 hours
                                }
                            }

                            wished.add(userId);
                            console.log(`[Birthday] Wished ${member.user.tag} in ${guild.name}`);
                        } catch (err) {
                            console.error(`[Birthday] Error wishing user ${userId}:`, err);
                        }
                    }
                } catch (guildErr) {
                    console.error(`[Birthday] Error processing guild ${guild.id}:`, guildErr);
                }
            }
        } catch (err) {
            console.error('[Birthday] Check error:', err);
        }
    };

    // Run check every 15 minutes for more reliable triggering
    setInterval(checkBirthdays, 15 * 60 * 1000);

    // Also run once on startup (after 30 seconds to let bot initialize)
    setTimeout(checkBirthdays, 30 * 1000);

    // Reset wished list daily at midnight UTC
    setInterval(() => {
        const now = new Date();
        if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
            wishedToday.clear();
        }
    }, 5 * 60 * 1000);

    console.log('[Birthday] Handler registered');
}

export { replaceVariables, buildWishContainer, getTodayInTimezone };
