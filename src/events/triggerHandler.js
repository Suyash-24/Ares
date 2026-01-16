import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';

/**
 * Trigger System Event Handler
 * Listens for messages and responds based on configured triggers
 */

// Match modes for triggers
const MATCH_MODES = {
    EXACT: 'exact',         // Message must be exactly the trigger
    STARTSWITH: 'startswith', // Message must start with trigger
    ENDSWITH: 'endswith',   // Message must end with trigger
    INCLUDES: 'includes',   // Message must contain trigger anywhere
    REGEX: 'regex'          // Custom regex pattern
};

export { MATCH_MODES };

export default function registerTriggerHandler(client) {
    client.on('messageCreate', async (message) => {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;
        
        try {
            // Fetch guild data
            const guildData = await client.db.findOne({ guildId: message.guildId });
            
            // Handle channel reactions (react to every message in specific channels)
            if (guildData?.channelReactions?.length > 0) {
                const channelReaction = guildData.channelReactions.find(cr => cr.channelId === message.channelId);
                if (channelReaction?.emojis?.length > 0) {
                    for (const emojiData of channelReaction.emojis) {
                        try {
                            // emojiData might be stored as { emoji, display } or just a string
                            const emoji = typeof emojiData === 'string' ? emojiData : emojiData.emoji;
                            if (emoji) {
                                await message.react(emoji);
                            }
                        } catch (e) {
                            // Emoji might be invalid or bot lacks permissions
                        }
                    }
                }
            }
            
            // Handle reaction triggers (react when message matches trigger)
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
                                // Invalid regex, skip
                            }
                            break;
                    }
                    
                    if (matched) {
                        try {
                            await message.react(rt.emoji);
                        } catch (e) {
                            // Emoji might be invalid
                        }
                    }
                }
            }
            
            // Handle text triggers
            if (!guildData?.triggers || guildData.triggers.length === 0) return;
            
            const content = message.content;
            const contentLower = content.toLowerCase();
            
            // Check each trigger
            for (const trigger of guildData.triggers) {
                if (!trigger.enabled) continue;
                
                // Check channel restrictions
                if (trigger.channels && trigger.channels.length > 0) {
                    if (!trigger.channels.includes(message.channelId)) continue;
                }
                
                // Check role restrictions
                if (trigger.allowedRoles && trigger.allowedRoles.length > 0) {
                    const hasRole = trigger.allowedRoles.some(roleId => 
                        message.member?.roles.cache.has(roleId)
                    );
                    if (!hasRole) continue;
                }
                
                // Check blacklisted roles
                if (trigger.blacklistedRoles && trigger.blacklistedRoles.length > 0) {
                    const hasBlacklistedRole = trigger.blacklistedRoles.some(roleId => 
                        message.member?.roles.cache.has(roleId)
                    );
                    if (hasBlacklistedRole) continue;
                }
                
                // Check if message matches trigger
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
                            // Invalid regex, skip
                            continue;
                        }
                        break;
                }
                
                if (matched) {
                    // Process and send response
                    await sendTriggerResponse(message, trigger, args, client);
                    
                    // Continue checking other triggers (respond to all matches)
                }
            }
        } catch (error) {
            console.error('[Trigger] Error processing message:', error);
        }
    });
    
    console.log('[Trigger] Handler registered');
}

/**
 * Process placeholders in the response
 */
function processPlaceholders(response, message, args) {
    const member = message.member;
    const guild = message.guild;
    const channel = message.channel;
    const user = message.author;
    
    return response
        // User placeholders
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{user_id}/g, user.id)
        .replace(/{user_name}/g, user.username)
        .replace(/{user_tag}/g, user.tag || user.username)
        .replace(/{user_displayname}/g, member?.displayName || user.username)
        .replace(/{user_avatar}/g, user.displayAvatarURL({ size: 4096 }))
        .replace(/{user_nick}/g, member?.nickname || user.username)
        
        // Server placeholders
        .replace(/{server}/g, guild.name)
        .replace(/{server_id}/g, guild.id)
        .replace(/{server_icon}/g, guild.iconURL({ size: 4096 }) || '')
        .replace(/{server_members}/g, guild.memberCount.toString())
        
        // Channel placeholders
        .replace(/{channel}/g, `<#${channel.id}>`)
        .replace(/{channel_id}/g, channel.id)
        .replace(/{channel_name}/g, channel.name)
        
        // Message placeholders
        .replace(/{args}/g, args || '')
        .replace(/{message}/g, message.content)
        .replace(/{message_id}/g, message.id)
        
        // Time placeholders
        .replace(/{time}/g, new Date().toLocaleTimeString())
        .replace(/{date}/g, new Date().toLocaleDateString())
        .replace(/{timestamp}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`);
}

/**
 * Send the trigger response
 */
async function sendTriggerResponse(message, trigger, args, client) {
    try {
        const processedResponse = processPlaceholders(trigger.response, message, args);
        
        // Default is plain text, Components V2 is opt-in
        if (trigger.useComponentsV2) {
            // Components V2 response (opt-in)
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(processedResponse));
            
            await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: ['users', 'roles'] }
            });
        } else {
            // Plain text response (default)
            await message.channel.send({
                content: processedResponse,
                allowedMentions: { parse: ['users', 'roles'] }
            });
        }
        
        // Delete trigger message if configured
        if (trigger.deleteMessage) {
            await message.delete().catch(() => {});
        }
        
    } catch (error) {
        console.error('[Trigger] Error sending response:', error);
    }
}
