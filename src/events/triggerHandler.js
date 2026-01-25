import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';

const MATCH_MODES = {
    EXACT: 'exact',
    STARTSWITH: 'startswith',
    ENDSWITH: 'endswith',
    INCLUDES: 'includes',
    REGEX: 'regex'
};

export { MATCH_MODES };

export default function registerTriggerHandler(client) {
    client.on('messageCreate', async (message) => {

        if (message.author.bot || !message.guild) return;

        try {

            const guildData = await client.db.findOne({ guildId: message.guildId });

            if (guildData?.channelReactions?.length > 0) {
                const channelReaction = guildData.channelReactions.find(cr => cr.channelId === message.channelId);
                if (channelReaction?.emojis?.length > 0) {
                    for (const emojiData of channelReaction.emojis) {
                        try {

                            const emoji = typeof emojiData === 'string' ? emojiData : emojiData.emoji;
                            if (emoji) {
                                await message.react(emoji);
                            }
                        } catch (e) {

                        }
                    }
                }
            }

            if (guildData?.reactionTriggers?.length > 0) {
                const content = message.content;
                const contentLower = content.toLowerCase();

                for (const rt of guildData.reactionTriggers) {
                    const triggerLower = rt.trigger.toLowerCase();
                    const matchMode = rt.matchMode || MATCH_MODES.INCLUDES;
                    let matched = false;

                    switch (matchMode) {
                        case MATCH_MODES.EXACT:
                            matched = contentLower === triggerLower;
                            break;
                        case MATCH_MODES.STARTSWITH:
                            matched = contentLower.startsWith(triggerLower);
                            break;
                        case MATCH_MODES.ENDSWITH:
                            matched = contentLower.endsWith(triggerLower);
                            break;
                        case MATCH_MODES.INCLUDES:
                            matched = contentLower.includes(triggerLower);
                            break;
                        case MATCH_MODES.REGEX:
                            try {
                                const regex = new RegExp(rt.trigger, 'i');
                                matched = regex.test(content);
                            } catch (e) {

                            }
                            break;
                    }

                    if (matched) {
                        try {
                            await message.react(rt.emoji);
                        } catch (e) {

                        }
                    }
                }
            }

            if (!guildData?.triggers || guildData.triggers.length === 0) return;

            const content = message.content;
            const contentLower = content.toLowerCase();

            for (const trigger of guildData.triggers) {
                if (!trigger.enabled) continue;

                if (trigger.channels && trigger.channels.length > 0) {
                    if (!trigger.channels.includes(message.channelId)) continue;
                }

                if (trigger.allowedRoles && trigger.allowedRoles.length > 0) {
                    const hasRole = trigger.allowedRoles.some(roleId =>
                        message.member?.roles.cache.has(roleId)
                    );
                    if (!hasRole) continue;
                }

                if (trigger.blacklistedRoles && trigger.blacklistedRoles.length > 0) {
                    const hasBlacklistedRole = trigger.blacklistedRoles.some(roleId =>
                        message.member?.roles.cache.has(roleId)
                    );
                    if (hasBlacklistedRole) continue;
                }

                const triggerLower = trigger.trigger.toLowerCase();
                let matched = false;
                let args = '';

                switch (trigger.matchMode || MATCH_MODES.EXACT) {
                    case MATCH_MODES.EXACT:
                        matched = contentLower === triggerLower;
                        break;

                    case MATCH_MODES.STARTSWITH:
                        if (contentLower.startsWith(triggerLower)) {
                            matched = true;
                            args = content.slice(trigger.trigger.length).trim();
                        }
                        break;

                    case MATCH_MODES.ENDSWITH:
                        matched = contentLower.endsWith(triggerLower);
                        break;

                    case MATCH_MODES.INCLUDES:
                        matched = contentLower.includes(triggerLower);
                        break;

                    case MATCH_MODES.REGEX:
                        try {
                            const regex = new RegExp(trigger.trigger, 'i');
                            matched = regex.test(content);
                        } catch (e) {

                            continue;
                        }
                        break;
                }

                if (matched) {

                    await sendTriggerResponse(message, trigger, args, client);

                }
            }
        } catch (error) {
            console.error('[Trigger] Error processing message:', error);
        }
    });

    console.log('[Trigger] Handler registered');
}

function processPlaceholders(response, message, args) {
    const member = message.member;
    const guild = message.guild;
    const channel = message.channel;
    const user = message.author;

    return response

        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{user_id}/g, user.id)
        .replace(/{user_name}/g, user.username)
        .replace(/{user_tag}/g, user.tag || user.username)
        .replace(/{user_displayname}/g, member?.displayName || user.username)
        .replace(/{user_avatar}/g, user.displayAvatarURL({ size: 4096 }))
        .replace(/{user_nick}/g, member?.nickname || user.username)

        .replace(/{server}/g, guild.name)
        .replace(/{server_id}/g, guild.id)
        .replace(/{server_icon}/g, guild.iconURL({ size: 4096 }) || '')
        .replace(/{server_members}/g, guild.memberCount.toString())

        .replace(/{channel}/g, `<#${channel.id}>`)
        .replace(/{channel_id}/g, channel.id)
        .replace(/{channel_name}/g, channel.name)

        .replace(/{args}/g, args || '')
        .replace(/{message}/g, message.content)
        .replace(/{message_id}/g, message.id)

        .replace(/{time}/g, new Date().toLocaleTimeString())
        .replace(/{date}/g, new Date().toLocaleDateString())
        .replace(/{timestamp}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`);
}

async function sendTriggerResponse(message, trigger, args, client) {
    try {
        const processedResponse = processPlaceholders(trigger.response, message, args);

        if (trigger.useComponentsV2) {

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(processedResponse));

            await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: ['users', 'roles'] }
            });
        } else {

            await message.channel.send({
                content: processedResponse,
                allowedMentions: { parse: ['users', 'roles'] }
            });
        }

        if (trigger.deleteMessage) {
            await message.delete().catch(() => {});
        }

    } catch (error) {
        console.error('[Trigger] Error sending response:', error);
    }
}
