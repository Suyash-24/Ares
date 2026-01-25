

const CONFIG = {
    MAX_SNIPES_PER_CHANNEL: 20,
    MAX_REACTION_HISTORY_PER_MESSAGE: 100,
    MAX_MESSAGES_WITH_REACTION_HISTORY: 200,
    CACHE_EXPIRY_MS: 6 * 60 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 15 * 60 * 1000,
};

const deletedMessages = new Map();
const editedMessages = new Map();
const removedReactions = new Map();

const reactionHistory = new Map();

const lastAccessTime = new Map();

function touchGuild(guildId) {
    lastAccessTime.set(guildId, Date.now());
}

function cleanOldEntries(cache, maxAge = CONFIG.CACHE_EXPIRY_MS) {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [guildId, channelMap] of cache) {
        for (const [channelId, entries] of channelMap) {
            const filtered = entries.filter(e => now - e.timestamp < maxAge);
            if (filtered.length === 0) {
                channelMap.delete(channelId);
                cleanedCount++;
            } else if (filtered.length !== entries.length) {
                channelMap.set(channelId, filtered);
                cleanedCount += entries.length - filtered.length;
            }
        }
        if (channelMap.size === 0) {
            cache.delete(guildId);
        }
    }

    return cleanedCount;
}

function cleanReactionHistory() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [messageId, data] of reactionHistory) {

        const filtered = data.history.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);

        if (filtered.length === 0) {
            reactionHistory.delete(messageId);
            cleanedCount++;
        } else if (filtered.length !== data.history.length) {
            data.history = filtered;
            cleanedCount += data.history.length - filtered.length;
        }
    }

    if (reactionHistory.size > CONFIG.MAX_MESSAGES_WITH_REACTION_HISTORY) {
        const entries = Array.from(reactionHistory.entries());

        entries.sort((a, b) => {
            const aTime = a[1].history[0]?.timestamp || 0;
            const bTime = b[1].history[0]?.timestamp || 0;
            return aTime - bTime;
        });

        const toRemove = entries.slice(0, entries.length - CONFIG.MAX_MESSAGES_WITH_REACTION_HISTORY);
        for (const [messageId] of toRemove) {
            reactionHistory.delete(messageId);
            cleanedCount++;
        }
    }

    return cleanedCount;
}

function performCleanup() {
    cleanOldEntries(deletedMessages);
    cleanOldEntries(editedMessages);
    cleanOldEntries(removedReactions);
    cleanReactionHistory();
}

let cleanupInterval = null;

export function startCleanupInterval() {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
        performCleanup();
    }, CONFIG.CLEANUP_INTERVAL_MS);

}

export function stopCleanupInterval() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

export function addDeletedMessage(message) {
    if (!message.guild || (!message.content && !message.attachments?.size)) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    touchGuild(guildId);

    if (!deletedMessages.has(guildId)) {
        deletedMessages.set(guildId, new Map());
    }

    const guildCache = deletedMessages.get(guildId);
    if (!guildCache.has(channelId)) {
        guildCache.set(channelId, []);
    }

    const channelCache = guildCache.get(channelId);

    channelCache.unshift({
        author: {
            id: message.author?.id,
            tag: message.author?.tag,
            username: message.author?.username,
            displayAvatarURL: message.author?.displayAvatarURL?.() || null
        },
        content: message.content || '',
        attachments: message.attachments?.map(a => ({
            url: a.url,
            name: a.name,
            contentType: a.contentType
        })) || [],
        embeds: message.embeds?.length || 0,
        stickers: message.stickers?.map(s => s.name) || [],
        messageId: message.id,
        timestamp: Date.now()
    });

    if (channelCache.length > CONFIG.MAX_SNIPES_PER_CHANNEL) {
        channelCache.pop();
    }
}

export function addEditedMessage(oldMessage, newMessage) {
    if (!oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const guildId = oldMessage.guild.id;
    const channelId = oldMessage.channel.id;

    touchGuild(guildId);

    if (!editedMessages.has(guildId)) {
        editedMessages.set(guildId, new Map());
    }

    const guildCache = editedMessages.get(guildId);
    if (!guildCache.has(channelId)) {
        guildCache.set(channelId, []);
    }

    const channelCache = guildCache.get(channelId);

    channelCache.unshift({
        author: {
            id: oldMessage.author?.id,
            tag: oldMessage.author?.tag,
            username: oldMessage.author?.username,
            displayAvatarURL: oldMessage.author?.displayAvatarURL?.() || null
        },
        oldContent: oldMessage.content || '',
        newContent: newMessage.content || '',
        messageId: oldMessage.id,
        messageUrl: oldMessage.url,
        timestamp: Date.now()
    });

    if (channelCache.length > CONFIG.MAX_SNIPES_PER_CHANNEL) {
        channelCache.pop();
    }
}

export function addRemovedReaction(reaction, user) {
    if (!reaction.message?.guild) return;

    const guildId = reaction.message.guild.id;
    const channelId = reaction.message.channel.id;

    touchGuild(guildId);

    if (!removedReactions.has(guildId)) {
        removedReactions.set(guildId, new Map());
    }

    const guildCache = removedReactions.get(guildId);
    if (!guildCache.has(channelId)) {
        guildCache.set(channelId, []);
    }

    const channelCache = guildCache.get(channelId);

    channelCache.unshift({
        user: {
            id: user.id,
            tag: user.tag,
            username: user.username,
            displayAvatarURL: user.displayAvatarURL?.() || null
        },
        emoji: reaction.emoji.toString(),
        emojiName: reaction.emoji.name,
        emojiId: reaction.emoji.id,
        messageId: reaction.message.id,
        messageUrl: reaction.message.url,
        timestamp: Date.now()
    });

    if (channelCache.length > CONFIG.MAX_SNIPES_PER_CHANNEL) {
        channelCache.pop();
    }

    addReactionHistoryEntry(reaction.message.id, user, reaction.emoji, 'remove', reaction.message.url, guildId, channelId);
}

export function addReactionHistoryEntry(messageId, user, emoji, action, messageUrl, guildId, channelId) {
    if (!reactionHistory.has(messageId)) {
        reactionHistory.set(messageId, {
            guildId,
            channelId,
            history: []
        });
    }

    const data = reactionHistory.get(messageId);

    data.history.unshift({
        user: {
            id: user.id,
            tag: user.tag,
            username: user.username
        },
        emoji: emoji.toString(),
        emojiName: emoji.name,
        action: action,
        messageUrl: messageUrl,
        timestamp: Date.now()
    });

    if (data.history.length > CONFIG.MAX_REACTION_HISTORY_PER_MESSAGE) {
        data.history.pop();
    }
}

export function getDeletedMessages(guildId, channelId) {
    touchGuild(guildId);
    const entries = deletedMessages.get(guildId)?.get(channelId) || [];

    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

export function getEditedMessages(guildId, channelId) {
    touchGuild(guildId);
    const entries = editedMessages.get(guildId)?.get(channelId) || [];
    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

export function getRemovedReactions(guildId, channelId) {
    touchGuild(guildId);
    const entries = removedReactions.get(guildId)?.get(channelId) || [];
    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

export function getReactionHistory(messageId) {
    const data = reactionHistory.get(messageId);
    if (!data) return [];

    const now = Date.now();
    return data.history.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

export function clearSnipeData(guildId, channelId = null) {
    if (channelId) {

        deletedMessages.get(guildId)?.delete(channelId);
        editedMessages.get(guildId)?.delete(channelId);
        removedReactions.get(guildId)?.delete(channelId);

        for (const [messageId, data] of reactionHistory) {
            if (data.guildId === guildId && data.channelId === channelId) {
                reactionHistory.delete(messageId);
            }
        }
    } else {

        deletedMessages.delete(guildId);
        editedMessages.delete(guildId);
        removedReactions.delete(guildId);
        lastAccessTime.delete(guildId);

        for (const [messageId, data] of reactionHistory) {
            if (data.guildId === guildId) {
                reactionHistory.delete(messageId);
            }
        }
    }
}

export function clearReactionHistory() {
    reactionHistory.clear();
}

export function onGuildLeave(guildId) {
    clearSnipeData(guildId);
}

export function onChannelDelete(guildId, channelId) {
    clearSnipeData(guildId, channelId);
}

export function getCacheStats() {
    let totalDeleted = 0;
    let totalEdited = 0;
    let totalReactions = 0;

    for (const [, channelMap] of deletedMessages) {
        for (const [, entries] of channelMap) {
            totalDeleted += entries.length;
        }
    }

    for (const [, channelMap] of editedMessages) {
        for (const [, entries] of channelMap) {
            totalEdited += entries.length;
        }
    }

    for (const [, channelMap] of removedReactions) {
        for (const [, entries] of channelMap) {
            totalReactions += entries.length;
        }
    }

    return {
        guilds: deletedMessages.size,
        deletedMessages: totalDeleted,
        editedMessages: totalEdited,
        removedReactions: totalReactions,
        reactionHistoryMessages: reactionHistory.size,
        config: CONFIG
    };
}

export default {
    addDeletedMessage,
    addEditedMessage,
    addRemovedReaction,
    addReactionHistoryEntry,
    getDeletedMessages,
    getEditedMessages,
    getRemovedReactions,
    getReactionHistory,
    clearSnipeData,
    clearReactionHistory,
    onGuildLeave,
    onChannelDelete,
    getCacheStats,
    startCleanupInterval,
    stopCleanupInterval,
    performCleanup
};
