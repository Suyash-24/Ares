import { ContainerBuilder, SeparatorSpacingSize, MessageFlags, TextDisplayBuilder, MediaGalleryBuilder } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

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

const buildWishContainer = (config, context) => {
    const msg = config.wishMessage || {};
    const container = new ContainerBuilder();

    if (msg.accentColor && msg.accentColor !== 'none') {
        const colorInt = parseInt(msg.accentColor.replace('#', ''), 16);
        if (!isNaN(colorInt)) {
            container.setAccentColor(colorInt);
        }
    }

    let thumbUrl = null;
    if (msg.thumbnail) {
        thumbUrl = msg.thumbnail === 'avatar' ? context.avatar : replaceVariables(msg.thumbnail, context);
    }

    if (msg.title) {
        container.addTextDisplayComponents(td => td.setContent(`**${replaceVariables(msg.title, context)}**`));
    }

    if (msg.title && (msg.description || thumbUrl)) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }

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

    if (msg.image && (msg.description || thumbUrl)) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }

    if (msg.image) {
        const gallery = new MediaGalleryBuilder().addItems(item =>
            item.setURL(replaceVariables(msg.image, context))
        );
        container.addMediaGalleryComponents(gallery);
    }

    if (msg.footer) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`-# ${replaceVariables(msg.footer, context)}`));
    }

    return container;
};

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

    const wishedToday = new Map();

    const checkBirthdays = async () => {
        if (!client.db) return;

        try {

            for (const guild of client.guilds.cache.values()) {
                try {
                    const guildData = await client.db.findOne({ guildId: guild.id });
                    if (!guildData) continue;

                    const config = guildData.birthday_config;
                    if (!config?.enabled || !config.wishChannel) continue;

                    const timezone = config.timezone || 'GMT';

                    if (!isMidnightInTimezone(timezone)) continue;

                    const { day, month } = getTodayInTimezone(timezone);
                    const birthdays = guildData.birthdays || {};

                    const wishChannel = guild.channels.cache.get(config.wishChannel);
                    if (!wishChannel) continue;

                    if (!wishedToday.has(guild.id)) {
                        wishedToday.set(guild.id, new Set());
                    }
                    const wished = wishedToday.get(guild.id);

                    for (const [userId, bday] of Object.entries(birthdays)) {
                        const bDayVal = parseInt(bday.day, 10);
                        const bMonthVal = parseInt(bday.month, 10);

                        if (bDayVal !== day || bMonthVal !== month) continue;
                        if (wished.has(userId)) continue;

                        try {
                            const member = await guild.members.fetch(userId).catch(() => null);
                            if (!member) continue;

                            const context = {
                                userMention: `<@${userId}>`,
                                username: member.user.username,
                                avatar: member.user.displayAvatarURL({ size: 512 }),
                                serverName: guild.name,
                                serverAvatar: guild.iconURL({ size: 512 }) || ''
                            };

                            const wishMsg = config.wishMessage || { content: 'Happy Birthday {user}! ❤️', thumbnail: 'avatar' };
                            const content = replaceVariables(wishMsg.content, context);

                            const container = buildWishContainer(config, context);

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

                            if (config.birthdayRole) {
                                const bdayRole = guild.roles.cache.get(config.birthdayRole);
                                if (bdayRole && bdayRole.position < guild.members.me.roles.highest.position) {
                                    await member.roles.add(bdayRole).catch(() => {});
                                    console.log(`[Birthday] Gave role ${bdayRole.name} to ${member.user.tag}`);

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
                                    }, 24 * 60 * 60 * 1000);
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

    setInterval(checkBirthdays, 15 * 60 * 1000);

    setTimeout(checkBirthdays, 30 * 1000);

    setInterval(() => {
        const now = new Date();
        if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
            wishedToday.clear();
        }
    }, 5 * 60 * 1000);

    console.log('[Birthday] Handler registered');
}

export { replaceVariables, buildWishContainer, getTodayInTimezone };
