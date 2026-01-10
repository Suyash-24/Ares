/**
 * Snipe Event Handler
 * Captures deleted messages, edits, and reaction removals for snipe commands
 * Also handles cleanup when bot leaves guilds or channels are deleted
 */

import { Events } from 'discord.js';
import { 
    addDeletedMessage, 
    addEditedMessage, 
    addRemovedReaction,
    addReactionHistoryEntry,
    onGuildLeave,
    onChannelDelete,
    startCleanupInterval
} from '../utils/snipeCache.js';

export function registerSnipeEvents(client) {
    // Start automatic cleanup interval
    startCleanupInterval();

    // Capture deleted messages
    client.on(Events.MessageDelete, (message) => {
        // Ignore bots and DMs
        if (message.author?.bot) return;
        if (!message.guild) return;
        
        // Only cache if there's content or attachments
        if (!message.content && !message.attachments?.size && !message.stickers?.size) return;
        
        addDeletedMessage(message);
    });

    // Capture bulk message deletes
    client.on(Events.MessageBulkDelete, (messages) => {
        for (const [, message] of messages) {
            if (message.author?.bot) continue;
            if (!message.guild) continue;
            if (!message.content && !message.attachments?.size && !message.stickers?.size) continue;
            
            addDeletedMessage(message);
        }
    });

    // Capture message edits
    client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
        // Ignore bots and DMs
        if (oldMessage.author?.bot) return;
        if (!oldMessage.guild) return;
        
        // Ignore if content hasn't changed (e.g., embed updates)
        if (oldMessage.content === newMessage.content) return;
        
        // Only cache if there was previous content
        if (!oldMessage.content) return;
        
        addEditedMessage(oldMessage, newMessage);
    });

    // Capture reaction removals
    client.on(Events.MessageReactionRemove, (reaction, user) => {
        // Ignore bots
        if (user.bot) return;
        if (!reaction.message?.guild) return;
        
        addRemovedReaction(reaction, user);
    });

    // Capture reaction additions for history
    client.on(Events.MessageReactionAdd, (reaction, user) => {
        // Ignore bots
        if (user.bot) return;
        if (!reaction.message?.guild) return;
        
        addReactionHistoryEntry(
            reaction.message.id, 
            user, 
            reaction.emoji, 
            'add',
            reaction.message.url,
            reaction.message.guild.id,
            reaction.message.channel.id
        );
    });

    // Cleanup when bot leaves a guild
    client.on(Events.GuildDelete, (guild) => {
        onGuildLeave(guild.id);
    });

    // Cleanup when a channel is deleted
    client.on(Events.ChannelDelete, (channel) => {
        if (!channel.guild) return;
        onChannelDelete(channel.guild.id, channel.id);
    });

    // Cleanup when threads are deleted
    client.on(Events.ThreadDelete, (thread) => {
        if (!thread.guild) return;
        onChannelDelete(thread.guild.id, thread.id);
    });
}

export default { registerSnipeEvents };
