/**
 * Snipe Cache - Stores deleted messages, edits, and removed reactions
 * Each guild has its own cache with size limits and automatic cleanup
 */

// Configuration - generous limits that won't feel restrictive
const CONFIG = {
    MAX_SNIPES_PER_CHANNEL: 20,           // 20 snipes per channel (very generous)
    MAX_REACTION_HISTORY_PER_MESSAGE: 100, // 100 reaction events per message
    MAX_MESSAGES_WITH_REACTION_HISTORY: 200, // 200 messages can have reaction history
    CACHE_EXPIRY_MS: 6 * 60 * 60 * 1000,  // 6 hours - plenty of time to snipe
    CLEANUP_INTERVAL_MS: 15 * 60 * 1000,  // Cleanup every 15 minutes (less frequent)
};

// Structure: Map<guildId, Map<channelId, Array<{message data}>>>
const deletedMessages = new Map();
const editedMessages = new Map();
const removedReactions = new Map();

// Structure: Map<messageId, { guildId, channelId, history: Array }>
const reactionHistory = new Map();

// Track when caches were last accessed (for LRU-style cleanup)
const lastAccessTime = new Map();

/**
 * Update last access time for a guild
 */
function touchGuild(guildId) {
    lastAccessTime.set(guildId, Date.now());
}

/**
 * Clean old entries from a cache map
 */
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

/**
 * Clean old reaction history entries
 */
function cleanReactionHistory() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [messageId, data] of reactionHistory) {
        // Filter old entries
        const filtered = data.history.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
        
        if (filtered.length === 0) {
            reactionHistory.delete(messageId);
            cleanedCount++;
        } else if (filtered.length !== data.history.length) {
            data.history = filtered;
            cleanedCount += data.history.length - filtered.length;
        }
    }
    
    // If we have too many messages with reaction history, remove oldest
    if (reactionHistory.size > CONFIG.MAX_MESSAGES_WITH_REACTION_HISTORY) {
        const entries = Array.from(reactionHistory.entries());
        // Sort by most recent activity (newest last)
        entries.sort((a, b) => {
            const aTime = a[1].history[0]?.timestamp || 0;
            const bTime = b[1].history[0]?.timestamp || 0;
            return aTime - bTime;
        });
        
        // Remove oldest entries until we're under the limit
        const toRemove = entries.slice(0, entries.length - CONFIG.MAX_MESSAGES_WITH_REACTION_HISTORY);
        for (const [messageId] of toRemove) {
            reactionHistory.delete(messageId);
            cleanedCount++;
        }
    }
    
    return cleanedCount;
}

/**
 * Perform full cleanup of all caches (silent - no console logs)
 */
function performCleanup() {
    cleanOldEntries(deletedMessages);
    cleanOldEntries(editedMessages);
    cleanOldEntries(removedReactions);
    cleanReactionHistory();
}

/**
 * Start the automatic cleanup interval
 */
let cleanupInterval = null;

export function startCleanupInterval() {
    if (cleanupInterval) return;
    
    cleanupInterval = setInterval(() => {
        performCleanup();
    }, CONFIG.CLEANUP_INTERVAL_MS);
    
    // Silent start - no console log
}

export function stopCleanupInterval() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

/**
 * Add a deleted message to the cache
 */
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
    
    // Add to the beginning (most recent first)
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
    
    // Keep only the last N messages
    if (channelCache.length > CONFIG.MAX_SNIPES_PER_CHANNEL) {
        channelCache.pop();
    }
}

/**
 * Add an edited message to the cache
 */
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

/**
 * Add a removed reaction to the cache
 */
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
    
    // Also add to reaction history for this message
    addReactionHistoryEntry(reaction.message.id, user, reaction.emoji, 'remove', reaction.message.url, guildId, channelId);
}

/**
 * Add a reaction to the history (for reactionhistory command)
 */
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
        action: action, // 'add' or 'remove'
        messageUrl: messageUrl,
        timestamp: Date.now()
    });
    
    if (data.history.length > CONFIG.MAX_REACTION_HISTORY_PER_MESSAGE) {
        data.history.pop();
    }
}

/**
 * Get deleted messages for a channel
 */
export function getDeletedMessages(guildId, channelId) {
    touchGuild(guildId);
    const entries = deletedMessages.get(guildId)?.get(channelId) || [];
    // Filter expired on access
    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

/**
 * Get edited messages for a channel
 */
export function getEditedMessages(guildId, channelId) {
    touchGuild(guildId);
    const entries = editedMessages.get(guildId)?.get(channelId) || [];
    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

/**
 * Get removed reactions for a channel
 */
export function getRemovedReactions(guildId, channelId) {
    touchGuild(guildId);
    const entries = removedReactions.get(guildId)?.get(channelId) || [];
    const now = Date.now();
    return entries.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

/**
 * Get reaction history for a message
 */
export function getReactionHistory(messageId) {
    const data = reactionHistory.get(messageId);
    if (!data) return [];
    
    // Filter old entries on access
    const now = Date.now();
    return data.history.filter(e => now - e.timestamp < CONFIG.CACHE_EXPIRY_MS);
}

/**
 * Clear all snipe data for a guild or specific channel
 */
export function clearSnipeData(guildId, channelId = null) {
    if (channelId) {
        // Clear only specific channel
        deletedMessages.get(guildId)?.delete(channelId);
        editedMessages.get(guildId)?.delete(channelId);
        removedReactions.get(guildId)?.delete(channelId);
        
        // Clear reaction history for messages in this channel
        for (const [messageId, data] of reactionHistory) {
            if (data.guildId === guildId && data.channelId === channelId) {
                reactionHistory.delete(messageId);
            }
        }
    } else {
        // Clear entire guild
        deletedMessages.delete(guildId);
        editedMessages.delete(guildId);
        removedReactions.delete(guildId);
        lastAccessTime.delete(guildId);
        
        // Clear reaction history for this guild
        for (const [messageId, data] of reactionHistory) {
            if (data.guildId === guildId) {
                reactionHistory.delete(messageId);
            }
        }
    }
}

/**
 * Clear all reaction history
 */
export function clearReactionHistory() {
    reactionHistory.clear();
}

/**
 * Called when bot leaves a guild - cleanup all data for that guild (silent)
 */
export function onGuildLeave(guildId) {
    clearSnipeData(guildId);
}

/**
 * Called when a channel is deleted - cleanup data for that channel
 */
export function onChannelDelete(guildId, channelId) {
    clearSnipeData(guildId, channelId);
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
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
