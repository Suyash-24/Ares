import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

export default function registerAfkHandler(client) {
    client.on('messageCreate', async (message) => {

        if (!message.guild || message.author.bot) return;

        try {
            const guildId = message.guild.id;
            const userId = message.author.id;

            const guildData = await client.db.findOne({ guildId }) || {};
            const afkUsers = guildData.afkUsers || {};

            if (afkUsers[userId]) {
                const afkData = afkUsers[userId];
                const duration = formatDuration(Date.now() - afkData.timestamp);
                const mentionsCount = afkData.mentions?.length || 0;

                try {
                    const member = message.member;
                    if (member && member.manageable && afkData.originalNickname !== undefined) {
                        await member.setNickname(afkData.originalNickname || null).catch(() => {});
                    }
                } catch (e) {}

                if (mentionsCount > 0) {
                    await client.db.updateOne(
                        { guildId },
                        { $set: { [`afkMentionsHistory.${userId}`]: { mentions: afkData.mentions, storedAt: Date.now() } } },
                        { upsert: true }
                    );
                }

                delete afkUsers[userId];
                await client.db.updateOne(
                    { guildId },
                    { $set: { afkUsers } },
                    { upsert: true }
                );

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afkremoved || '👋'} Welcome Back, ${message.author.username}!`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                let content = `You were AFK for **${duration}**`;
                if (mentionsCount > 0) {
                    content += `\nYou received **${mentionsCount}** mention${mentionsCount > 1 ? 's' : ''}. Use \`.afk mentions\` to view.`;
                }
                container.addTextDisplayComponents(td => td.setContent(content));

                message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                }).catch(() => {});
            }

            const mentionedUsers = message.mentions.users;
            if (mentionedUsers.size > 0) {
                const afkMentioned = [];

                for (const [mentionedId, mentionedUser] of mentionedUsers) {
                    if (afkUsers[mentionedId] && mentionedId !== userId) {
                        const afkData = afkUsers[mentionedId];
                        const duration = formatDuration(Date.now() - afkData.timestamp);

                        afkMentioned.push({
                            user: mentionedUser,
                            reason: afkData.reason,
                            duration
                        });

                        if (!afkData.mentions) afkData.mentions = [];
                        afkData.mentions.push({
                            userId: userId,
                            channelId: message.channel.id,
                            timestamp: Date.now(),
                            messageUrl: message.url
                        });
                    }
                }

                if (afkMentioned.length > 0) {
                    await client.db.updateOne(
                        { guildId },
                        { $set: { afkUsers } },
                        { upsert: true }
                    );

                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afk || '💤'} User is AFK`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    const lines = afkMentioned.map(m => {
                        let line = `**${m.user.username}**`;
                        if (m.reason) line += `: ${m.reason}`;
                        line += `\n-# AFK for ${m.duration}`;
                        return line;
                    });

                    container.addTextDisplayComponents(td => td.setContent(lines.join('\n\n')));

                    message.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { repliedUser: false }
                    }).catch(() => {});
                }
            }
        } catch (error) {
            console.error('[AFK Handler] Error:', error);
        }
    });

    console.log('[AFK Handler] Registered');
}
