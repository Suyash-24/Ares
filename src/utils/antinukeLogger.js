import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const EVENT_COLORS = {
    ban: 0x8B0000,
    kick: 0xFF4500,
    role: 0x9B59B6,
    channel: 0x3498DB,
    webhook: 0xE74C3C,
    emoji: 0xF39C12,
    botadd: 0xE91E63,
    vanity: 0x1ABC9C,
    prune: 0x95A5A6,
    permissions: 0xFF6347,
    protocol: 0x8B0000,
    protocolHold: 0xFF1493,
    strike: 0xFFA500,
    whitelistBypass: 0x2ECC71,
    configChange: 0x3498DB
};

const EVENT_EMOJIS = {
    ban: '🔨',
    kick: '👢',
    role: '🎭',
    channel: '📁',
    webhook: '🪝',
    emoji: '😀',
    botadd: '🤖',
    vanity: '🔗',
    prune: '✂️',
    permissions: '⚠️',
    protocol: '🔒',
    protocolHold: '⛓️',
    strike: '⚡',
    whitelistBypass: '✅',
    configChange: '⚙️'
};

function formatUserMention(userId, tag) {
    return `${tag}\n(ID: ${userId})`;
}

function formatTimestamp(timestamp) {
    return `<t:${Math.floor(timestamp / 1000)}:F>`;
}

async function sendAntinukeLog(client, guildData, guild, logData) {
    const logChannelId = guildData?.antinuke?.logChannel;
    if (!logChannelId) return;

    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;

    try {
        const { embeds, components } = createLogEmbed(logData);
        await channel.send({
            embeds,
            components: components || [],
            allowedMentions: { parse: [] }
        });
    } catch (e) {
        console.error('[Antinuke Logger] Failed to send log:', e.message);
    }
}

function createLogEmbed(data) {
    const {
        eventType,
        executor,
        target,
        action,
        details,
        punishment,
        strikes,
        threshold,
        punished,
        success,
        changes,
        reason
    } = data;

    const color = EVENT_COLORS[eventType] || 0xFF0000;
    const emoji = EVENT_EMOJIS[eventType] || '🛡️';
    const timestamp = Date.now();

    switch (eventType) {
        case 'ban':
        case 'kick':
            return createMemberActionLog(emoji, eventType, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success);

        case 'role':
            return createRoleLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success);

        case 'channel':
            return createChannelLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success);

        case 'webhook':
            return createWebhookLog(emoji, color, executor, details, punishment, punished, strikes, threshold, timestamp, action, success);

        case 'emoji':
            return createEmojiLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success);

        case 'botadd':
            return createBotAddLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success);

        case 'vanity':
        case 'guildUpdate':
            return createServerUpdateLog(emoji, color, executor, changes, punishment, punished, strikes, threshold, timestamp, success);

        case 'permissions':
            return createPermissionLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success);

        case 'protocol':
            return createProtocolLog(emoji, color, executor, target, reason, timestamp, success);

        case 'protocolHold':
            return createProtocolHoldLog(emoji, color, executor, target, punishment, timestamp, success);

        case 'strike':
            return createStrikeLog(emoji, color, executor, action, details, strikes, threshold, timestamp);
        case 'configChange':
            return createConfigChangeLog(emoji, color, executor, action, details, changes, timestamp);

        default:
            return createGenericLog(emoji, color, executor, action, details, punishment, strikes, threshold, timestamp);
    }
}

function createMemberActionLog(emoji, eventType, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Protection`)
        .setDescription(`**Suspicious ${eventType} activity detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🎯 Target',
                value: target || 'Unknown',
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Action Taken',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Successfully executed' : '❌ Execution failed'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Threshold reached: ${strikes || threshold}/${threshold} strikes` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strike Counter',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            },
            {
                name: '⏱️ Status',
                value: `Monitoring...`,
                inline: true
            }
        );
        embed.setFooter({ text: `${threshold - strikes} strikes remaining` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createRoleLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Role Protection`)
        .setDescription(`**Suspicious role activity detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🎭 Action Type',
                value: `\`${action || 'Role Change'}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (target) {
        embed.addFields({ name: '🎯 Target Role', value: target, inline: false });
    }

    if (details) {
        embed.addFields({ name: '📋 Changes', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Punishment Issued',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Successfully applied' : '❌ Failed to apply'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Threshold breached: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Current Strikes',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Warning: ${threshold - strikes} more actions will trigger punishment` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createChannelLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Channel Protection`)
        .setDescription(`**Channel modification detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '📝 Operation',
                value: `\`${action || 'Channel Change'}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (target) {
        embed.addFields({ name: '📁 Affected Channel', value: target, inline: false });
    }

    if (details) {
        embed.addFields({ name: '📋 Information', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Action Taken',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Executed successfully' : '❌ Failed to execute'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Limit exceeded: ${strikes || threshold}/${threshold} actions` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strike Count',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `${threshold - strikes} actions left before punishment` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createWebhookLog(emoji, color, executor, details, punishment, punished, strikes, threshold, timestamp, action, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Webhook Protection`)
        .setDescription(`**Webhook activity detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🪝 Action',
                value: `\`${action || 'Webhook Change'}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Punishment',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Applied' : '❌ Failed'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Webhook spam detected: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strikes',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Monitoring webhook activity` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createEmojiLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, action, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Emoji Protection`)
        .setDescription(`**Emoji/Sticker modification detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '😀 Action',
                value: `\`${action || 'Emoji Change'}\``,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (target) {
        embed.addFields({ name: '🎯 Target', value: target, inline: false });
    }

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Action Taken',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Success' : '❌ Failed'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Mass emoji operation stopped: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strike Count',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Tracking emoji operations` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createBotAddLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Bot Protection`)
        .setDescription(`**Unauthorized bot addition blocked**`)
        .addFields(
            {
                name: '👤 Added By',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🤖 Bot',
                value: target || 'Unknown Bot',
                inline: true
            },
            {
                name: '🚫 Status',
                value: '`Removed`',
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Information', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Punishment',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Applied to user' : '❌ Failed to apply'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Bot spam prevention: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strikes',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Monitoring bot additions` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createServerUpdateLog(emoji, color, executor, changes, punishment, punished, strikes, threshold, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Vanity Protection`)
        .setDescription(`**Server settings modified**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: false
            }
        );

    if (changes) {
        embed.addFields({ name: '📝 Changes Made', value: changes, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Action Taken',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Executed' : '❌ Failed'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Critical setting changed: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strike Level',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Server modification tracked` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createPermissionLog(emoji, color, executor, target, details, punishment, punished, strikes, threshold, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Anti-Permission Protection`)
        .setDescription(`**Dangerous permissions detected**`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🎯 Target',
                value: target || 'Unknown',
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '⚠️ Dangerous Permissions', value: details, inline: false });
    }

    if (punished) {
        embed.addFields(
            {
                name: '⚖️ Punishment',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Applied' : '❌ Failed'}`,
                inline: false
            }
        );
        embed.setFooter({ text: `Permission abuse stopped: ${strikes || threshold}/${threshold}` });
    } else if (strikes !== undefined) {
        embed.addFields(
            {
                name: '⚡ Strikes',
                value: `\`\`\`${strikes}/${threshold}\`\`\``,
                inline: true
            }
        );
        embed.setFooter({ text: `Permission changes monitored` });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createProtocolLog(emoji, color, executor, target, reason, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Protocol Applied`)
        .setDescription(`**User placed under antinuke protocol**`)
        .addFields(
            {
                name: '🎯 Target User',
                value: target || 'Unknown',
                inline: true
            },
            {
                name: '📋 Reason',
                value: reason || 'Antinuke violation',
                inline: false
            },
            {
                name: '⚖️ Restrictions',
                value: '```• All roles removed\n• 28-day timeout applied\n• Tracked in database```',
                inline: false
            },
            {
                name: '🔒 Status',
                value: success ? '✅ Protocol Active' : '❌ Failed to Apply',
                inline: false
            }
        )
        .setFooter({ text: 'User is under strict monitoring' })
        .setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createProtocolHoldLog(emoji, color, executor, target, punishment, timestamp, success) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Protocol Hold Enforced`)
        .setDescription(`**Attempted to modify protocol user**`)
        .addFields(
            {
                name: '👤 Violator',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '🎯 Protocol User',
                value: target || 'Unknown',
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: '📋 Violation',
                value: 'Attempted to add roles to a user under protocol',
                inline: false
            },
            {
                name: '⚖️ Punishment',
                value: `\`\`\`${punishment}\`\`\`\n${success ? '✅ Applied' : '❌ Failed'}`,
                inline: false
            }
        )
        .setFooter({ text: 'Protocol Hold automatically enforced' })
        .setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createStrikeLog(emoji, color, executor, action, details, strikes, threshold, timestamp) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Strike Logged`)
        .setDescription(`**User action logged**`)
        .addFields(
            {
                name: '👤 User',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '📝 Action',
                value: `\`${action}\``,
                inline: true
            },
            {
                name: '⚡ Count',
                value: `\`${strikes}/${threshold}\``,
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    const remaining = threshold - strikes;
    if (remaining === 1) {
        embed.addFields({
            name: '⚠️ Warning',
            value: '```One more action will trigger punishment!```',
            inline: false
        });
    }

    embed.setFooter({ text: `${remaining} strikes remaining` })
        .setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createGenericLog(emoji, color, executor, action, details, punishment, strikes, threshold, timestamp) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Antinuke Alert`)
        .addFields(
            {
                name: '👤 Executor',
                value: formatUserMention(executor.id, executor.tag),
                inline: true
            },
            {
                name: '📝 Action',
                value: `\`${action || 'Unknown'}\``,
                inline: true
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    if (punishment) {
        embed.addFields({
            name: '⚖️ Punishment',
            value: `\`\`\`${punishment}\`\`\``,
            inline: false
        });
    }

    if (strikes !== undefined && threshold !== undefined) {
        embed.addFields({
            name: '⚡ Strikes',
            value: `\`\`\`${strikes}/${threshold}\`\`\``,
            inline: true
        });
    }

    embed.setTimestamp(timestamp);

    return { embeds: [embed] };
}

function createConfigChangeLog(emoji, color, executor, action, details, changes, timestamp) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Configuration Updated`)
        .setDescription(`**Antinuke settings modified**`)
        .addFields(
            {
                name: '👤 Modified By',
                value: formatUserMention(executor.id, executor.tag),
                inline: false
            },
            {
                name: '📝 Action',
                value: `\`${action}\``,
                inline: false
            }
        );

    if (details) {
        embed.addFields({ name: '📋 Details', value: details, inline: false });
    }

    if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
        const changesList = Object.entries(changes)
            .map(([key, value]) => `• **${key}:** ${value}`)
            .join('\n');
        embed.addFields({ name: '🔄 Changes', value: changesList, inline: false });
    }

    embed.setFooter({ text: 'Configuration changes are logged for security' })
        .setTimestamp(timestamp);

    return { embeds: [embed] };
}

export { sendAntinukeLog, createLogEmbed };
