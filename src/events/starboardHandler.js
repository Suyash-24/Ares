import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default function registerStarboardHandler(client) {

    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        try {

            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    console.error('[Starboard] Could not fetch partial reaction:', err);
                    return;
                }
            }

            if (!reaction.message.guild) return;

            if (user.bot) return;

            await handleStarboardReaction(client, reaction, user, 'add');
        } catch (error) {
            console.error('[Starboard] Error handling reaction add:', error);
        }
    });

    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        try {

            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    console.error('[Starboard] Could not fetch partial reaction:', err);
                    return;
                }
            }

            if (!reaction.message.guild) return;

            if (user.bot) return;

            await handleStarboardReaction(client, reaction, user, 'remove');
        } catch (error) {
            console.error('[Starboard] Error handling reaction remove:', error);
        }
    });

    console.log('⭐ [Starboard] Event handler registered');
}

async function handleStarboardReaction(client, reaction, user, action) {
    const message = reaction.message;
    const guild = message.guild;

    if (message.partial) {
        try {
            await message.fetch();
        } catch (err) {
            console.error('[Starboard] Could not fetch partial message:', err);
            return;
        }
    }

    const guildData = await client.db.findOne({ guildId: guild.id }) || {};
    const config = guildData.starboard;

    if (!config || !config.enabled || !config.channel) return;

    if (!config.emojis || config.emojis.length === 0) return;

    const reactionEmoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const matchingEmoji = config.emojis.find(e =>
        e.emoji === reactionEmoji || e.emoji === reaction.emoji.name
    );

    if (!matchingEmoji) return;

    if (config.ignoredChannels?.includes(message.channel.id)) return;

    if (message.channel.id === config.channel) return;

    if (config.ignoredMembers?.includes(message.author.id)) return;

    if (message.member) {
        const hasIgnoredRole = config.ignoredRoles?.some(roleId =>
            message.member.roles.cache.has(roleId)
        );
        if (hasIgnoredRole) return;
    }

    if (!config.selfStar && user.id === message.author.id) {

        if (action === 'add') {
            try {
                await reaction.users.remove(user.id);
            } catch (err) {

            }
        }
        return;
    }

    let starCount = reaction.count;

    try {
        const reactedUsers = await reaction.users.fetch();

        if (!config.selfStar && reactedUsers.has(message.author.id)) {
            starCount = Math.max(0, starCount - 1);
        }

        const botReactions = reactedUsers.filter(u => u.bot).size;
        starCount = Math.max(0, starCount - botReactions);
    } catch (err) {

    }

    const existingEntry = config.starredMessages?.find(entry => entry.originalId === message.id);

    const threshold = matchingEmoji.threshold;

    if (starCount >= threshold) {

        const starboardChannel = guild.channels.cache.get(config.channel);
        if (!starboardChannel) return;

        const botMember = guild.members.me;
        if (!botMember) return;

        const permissions = starboardChannel.permissionsFor(botMember);
        if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return;

        if (existingEntry) {

            await updateStarboardMessage(client, starboardChannel, existingEntry, message, starCount, config, matchingEmoji);
        } else {

            await createStarboardMessage(client, starboardChannel, message, starCount, config, guildData, matchingEmoji);
        }
    } else if (existingEntry && starCount < threshold) {

        await removeStarboardMessage(client, guild, existingEntry, config, guildData);
    }
}

async function createStarboardMessage(client, starboardChannel, originalMessage, starCount, config, guildData, matchingEmoji) {
    try {

        const embed = buildStarboardEmbed(originalMessage, starCount, config);

        const components = [];
        if (config.jumpUrl !== false) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Jump to Message')
                    .setStyle(ButtonStyle.Link)
                    .setURL(originalMessage.url)
                    .setEmoji('🔗')
            );
            components.push(row);
        }

        const starboardPost = await starboardChannel.send({
            content: `${matchingEmoji.emoji} **#${starCount}** | <#${originalMessage.channel.id}>`,
            embeds: [embed],
            components
        });

        const entry = {
            originalId: originalMessage.id,
            starboardId: starboardPost.id,
            channelId: originalMessage.channel.id,
            authorId: originalMessage.author.id,
            starCount,
            createdAt: Date.now()
        };

        if (!guildData.starboard.starredMessages) {
            guildData.starboard.starredMessages = [];
        }
        guildData.starboard.starredMessages.push(entry);

        await client.db.updateOne(
            { guildId: originalMessage.guild.id },
            { $set: { 'starboard.starredMessages': guildData.starboard.starredMessages } },
            { upsert: true }
        );

    } catch (error) {
        console.error('[Starboard] Error creating starboard message:', error);
    }
}

async function updateStarboardMessage(client, starboardChannel, entry, originalMessage, starCount, config, matchingEmoji) {
    try {

        const starboardMessage = await starboardChannel.messages.fetch(entry.starboardId).catch(() => null);

        if (!starboardMessage) {

            await removeEntryFromDatabase(client, originalMessage.guild.id, entry.originalId);
            return;
        }

        const embed = buildStarboardEmbed(originalMessage, starCount, config);

        const components = [];
        if (config.jumpUrl !== false) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Jump to Message')
                    .setStyle(ButtonStyle.Link)
                    .setURL(originalMessage.url)
                    .setEmoji('🔗')
            );
            components.push(row);
        }

        await starboardMessage.edit({
            content: `${matchingEmoji.emoji} **${starCount}** | <#${originalMessage.channel.id}>`,
            embeds: [embed],
            components
        });

        await client.db.updateOne(
            { guildId: originalMessage.guild.id, 'starboard.starredMessages.originalId': entry.originalId },
            { $set: { 'starboard.starredMessages.$.starCount': starCount } }
        );

    } catch (error) {
        console.error('[Starboard] Error updating starboard message:', error);
    }
}

async function removeStarboardMessage(client, guild, entry, config, guildData) {
    try {
        const starboardChannel = guild.channels.cache.get(config.channel);
        if (starboardChannel) {
            try {
                const starboardMessage = await starboardChannel.messages.fetch(entry.starboardId);
                await starboardMessage.delete();
            } catch (err) {

            }
        }

        await removeEntryFromDatabase(client, guild.id, entry.originalId);
    } catch (error) {
        console.error('[Starboard] Error removing starboard message:', error);
    }
}

async function removeEntryFromDatabase(client, guildId, originalId) {
    await client.db.updateOne(
        { guildId },
        { $pull: { 'starboard.starredMessages': { originalId } } }
    );
}

function buildStarboardEmbed(message, starCount, config) {
    const color = config.color || '#FFD700';
    const colorInt = parseInt(color.replace('#', ''), 16);

    const embed = new EmbedBuilder()
        .setColor(colorInt)
        .setAuthor({
            name: message.author.displayName || message.author.username,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

    let description = '';

    if (message.content) {
        description += message.content;
    }

    if (message.reference) {
        description = `*[Replying to a message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})*\n\n${description}`;
    }

    if (description) {

        if (description.length > 4096) {
            description = description.substring(0, 4093) + '...';
        }
        embed.setDescription(description);
    }

    if (config.attachments !== false && message.attachments.size > 0) {
        const imageAttachment = message.attachments.find(att =>
            att.contentType?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)
        );

        if (imageAttachment) {
            embed.setImage(imageAttachment.url);
        }

        const otherAttachments = message.attachments.filter(att =>
            !att.contentType?.startsWith('image/') &&
            !/\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)
        );

        if (otherAttachments.size > 0) {
            const attachmentList = otherAttachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: '📎 Attachments', value: attachmentList, inline: false });
        }
    }

    if (config.attachments !== false && message.embeds.length > 0) {
        const embedWithImage = message.embeds.find(e => e.image || e.thumbnail);
        if (embedWithImage && !embed.data.image) {
            embed.setImage(embedWithImage.image?.url || embedWithImage.thumbnail?.url);
        }
    }

    if (message.stickers.size > 0) {
        const sticker = message.stickers.first();
        if (sticker.format !== 3) {
            embed.setThumbnail(sticker.url);
        }
    }

    let footerText = `⭐ ${starCount}`;
    if (config.timestamp !== false) {
        embed.setTimestamp(message.createdAt);
    }

    embed.setFooter({
        text: `${footerText} • #${message.channel.name}`,
        iconURL: message.guild.iconURL({ dynamic: true })
    });

    return embed;
}

export async function getStarCount(client, guildId, messageId) {
    const guildData = await client.db.findOne({ guildId }) || {};
    const entry = guildData.starboard?.starredMessages?.find(e => e.originalId === messageId);
    return entry?.starCount || 0;
}
