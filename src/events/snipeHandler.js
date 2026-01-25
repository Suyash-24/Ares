

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

    startCleanupInterval();

    client.on(Events.MessageDelete, (message) => {

        if (message.author?.bot) return;
        if (!message.guild) return;

        if (!message.content && !message.attachments?.size && !message.stickers?.size) return;

        addDeletedMessage(message);
    });

    client.on(Events.MessageBulkDelete, (messages) => {
        for (const [, message] of messages) {
            if (message.author?.bot) continue;
            if (!message.guild) continue;
            if (!message.content && !message.attachments?.size && !message.stickers?.size) continue;

            addDeletedMessage(message);
        }
    });

    client.on(Events.MessageUpdate, (oldMessage, newMessage) => {

        if (oldMessage.author?.bot) return;
        if (!oldMessage.guild) return;

        if (oldMessage.content === newMessage.content) return;

        if (!oldMessage.content) return;

        addEditedMessage(oldMessage, newMessage);
    });

    client.on(Events.MessageReactionRemove, (reaction, user) => {

        if (user.bot) return;
        if (!reaction.message?.guild) return;

        addRemovedReaction(reaction, user);
    });

    client.on(Events.MessageReactionAdd, (reaction, user) => {

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

    client.on(Events.GuildDelete, (guild) => {
        onGuildLeave(guild.id);
    });

    client.on(Events.ChannelDelete, (channel) => {
        if (!channel.guild) return;
        onChannelDelete(channel.guild.id, channel.id);
    });

    client.on(Events.ThreadDelete, (thread) => {
        if (!thread.guild) return;
        onChannelDelete(thread.guild.id, thread.id);
    });
}

export default { registerSnipeEvents };
