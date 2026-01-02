import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Starboard Event Handler
 * Handles messageReactionAdd and messageReactionRemove to manage starboard posts
 */

export default function registerStarboardHandler(client) {
    // Handle reaction add
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        try {
            // Fetch partial reaction if needed
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    console.error('[Starboard] Could not fetch partial reaction:', err);
                    return;
                }
            }

            // Ignore DMs
            if (!reaction.message.guild) return;

            // Ignore bots
            if (user.bot) return;

            await handleStarboardReaction(client, reaction, user, 'add');
        } catch (error) {
            console.error('[Starboard] Error handling reaction add:', error);
        }
    });

    // Handle reaction remove
    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        try {
            // Fetch partial reaction if needed
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (err) {
                    console.error('[Starboard] Could not fetch partial reaction:', err);
                    return;
                }
            }

            // Ignore DMs
            if (!reaction.message.guild) return;

            // Ignore bots
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

    // Fetch full message if partial
    if (message.partial) {
        try {
            await message.fetch();
        } catch (err) {
            console.error('[Starboard] Could not fetch partial message:', err);
            return;
        }
    }

    // Get guild data
    const guildData = await client.db.findOne({ guildId: guild.id }) || {};
    const config = guildData.starboard;

    // Check if starboard is configured and enabled
    if (!config || !config.enabled || !config.channel) return;

    // Check if any configured emoji matches
    if (!config.emojis || config.emojis.length === 0) return;
    
    const reactionEmoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const matchingEmoji = config.emojis.find(e => 
        e.emoji === reactionEmoji || e.emoji === reaction.emoji.name
    );
    
    if (!matchingEmoji) return;

    // Check if channel is ignored
    if (config.ignoredChannels?.includes(message.channel.id)) return;

    // Check if message is in the starboard channel (prevent starring starboard posts)
    if (message.channel.id === config.channel) return;

    // Check if author is ignored
    if (config.ignoredMembers?.includes(message.author.id)) return;

    // Check if author has ignored role
    if (message.member) {
        const hasIgnoredRole = config.ignoredRoles?.some(roleId => 
            message.member.roles.cache.has(roleId)
        );
        if (hasIgnoredRole) return;
    }

    // Check self-star setting
    if (!config.selfStar && user.id === message.author.id) {
        // Remove the reaction if self-starring is disabled
        if (action === 'add') {
            try {
                await reaction.users.remove(user.id);
            } catch (err) {
                // Can't remove reaction, permission issue
            }
        }
        return;
    }

    // Get star count (excluding bot reactions and self-star if disabled)
    let starCount = reaction.count;
    
    // Fetch reaction users to check for self-star
    try {
        const reactedUsers = await reaction.users.fetch();
        
        // If self-star is disabled, don't count the author's reaction
        if (!config.selfStar && reactedUsers.has(message.author.id)) {
            starCount = Math.max(0, starCount - 1);
        }
        
        // Don't count bot reactions
        const botReactions = reactedUsers.filter(u => u.bot).size;
        starCount = Math.max(0, starCount - botReactions);
    } catch (err) {
        // Can't fetch users, use raw count
    }

    // Check if message already has a starboard entry
    const existingEntry = config.starredMessages?.find(entry => entry.originalId === message.id);

    // Use the matching emoji's threshold
    const threshold = matchingEmoji.threshold;

    if (starCount >= threshold) {
        // Get starboard channel
        const starboardChannel = guild.channels.cache.get(config.channel);
        if (!starboardChannel) return;

        // Check bot permissions
        const botMember = guild.members.me;
        if (!botMember) return;

        const permissions = starboardChannel.permissionsFor(botMember);
        if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return;

        if (existingEntry) {
            // Update existing starboard message
            await updateStarboardMessage(client, starboardChannel, existingEntry, message, starCount, config, matchingEmoji);
        } else {
            // Create new starboard message
            await createStarboardMessage(client, starboardChannel, message, starCount, config, guildData, matchingEmoji);
        }
    } else if (existingEntry && starCount < threshold) {
        // Remove from starboard if below threshold
        await removeStarboardMessage(client, guild, existingEntry, config, guildData);
    }
}

async function createStarboardMessage(client, starboardChannel, originalMessage, starCount, config, guildData, matchingEmoji) {
    try {
        // Build the starboard embed
        const embed = buildStarboardEmbed(originalMessage, starCount, config);

        // Build action row with jump button
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

        // Send the starboard message
        const starboardPost = await starboardChannel.send({
            content: `${matchingEmoji.emoji} **#${starCount}** | <#${originalMessage.channel.id}>`,
            embeds: [embed],
            components
        });

        // Save to database
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
        // Fetch the starboard message
        const starboardMessage = await starboardChannel.messages.fetch(entry.starboardId).catch(() => null);
        
        if (!starboardMessage) {
            // Starboard message was deleted, remove entry
            await removeEntryFromDatabase(client, originalMessage.guild.id, entry.originalId);
            return;
        }

        // Update the embed
        const embed = buildStarboardEmbed(originalMessage, starCount, config);

        // Build action row with jump button
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

        // Edit the starboard message
        await starboardMessage.edit({
            content: `${matchingEmoji.emoji} **${starCount}** | <#${originalMessage.channel.id}>`,
            embeds: [embed],
            components
        });

        // Update star count in database
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
                // Message already deleted
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

    // Add message content
    let description = '';
    
    if (message.content) {
        description += message.content;
    }

    // Add referenced message (if reply)
    if (message.reference) {
        description = `*[Replying to a message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.reference.messageId})*\n\n${description}`;
    }

    if (description) {
        // Limit description length
        if (description.length > 4096) {
            description = description.substring(0, 4093) + '...';
        }
        embed.setDescription(description);
    }

    // Add image from attachment
    if (config.attachments !== false && message.attachments.size > 0) {
        const imageAttachment = message.attachments.find(att => 
            att.contentType?.startsWith('image/') || 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)
        );
        
        if (imageAttachment) {
            embed.setImage(imageAttachment.url);
        }

        // Add video/other attachment info
        const otherAttachments = message.attachments.filter(att => 
            !att.contentType?.startsWith('image/') && 
            !/\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)
        );
        
        if (otherAttachments.size > 0) {
            const attachmentList = otherAttachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: '📎 Attachments', value: attachmentList, inline: false });
        }
    }

    // Add embed image if message has embeds with images
    if (config.attachments !== false && message.embeds.length > 0) {
        const embedWithImage = message.embeds.find(e => e.image || e.thumbnail);
        if (embedWithImage && !embed.data.image) {
            embed.setImage(embedWithImage.image?.url || embedWithImage.thumbnail?.url);
        }
    }

    // Add sticker preview
    if (message.stickers.size > 0) {
        const sticker = message.stickers.first();
        if (sticker.format !== 3) { // Not Lottie
            embed.setThumbnail(sticker.url);
        }
    }

    // Add footer with star info
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

// Export helper for getting star count
export async function getStarCount(client, guildId, messageId) {
    const guildData = await client.db.findOne({ guildId }) || {};
    const entry = guildData.starboard?.starredMessages?.find(e => e.originalId === messageId);
    return entry?.starCount || 0;
}
