/**
 * Kira Logging System - Event Handlers
 * Registers all Discord events for comprehensive logging
 */

import { Events, AuditLogEvent, ChannelType } from 'discord.js';
import {
	sendLog,
	fetchAuditLogExecutor,
	formatDuration,
	getChannelTypeString,
	formatPermissionChanges,
	LOG_EVENTS
} from '../utils/LoggingManager.js';

// Track messages that Kira deletes (to identify as executor)
// Map of messageId -> timestamp, auto-cleaned after 10 seconds
const kiraDeletedMessages = new Map();

// Track command invokers (who ran the command that caused the action)
// Map of `guildId:actionType:targetId` -> { invoker, timestamp }
// Auto-cleaned after 5 seconds
export const commandInvokers = new Map();

/**
 * Mark a command invoker (track who ran a command)
 * @param {string} guildId - Guild ID
 * @param {string} actionType - Type of action (e.g., 'mute', 'kick', 'ban')
 * @param {string} targetId - ID of the target (user/role/channel being acted upon)
 * @param {User} invoker - The user who ran the command
 */
export function markCommandInvoker(guildId, actionType, targetId, invoker) {
	const key = `${guildId}:${actionType}:${targetId}`;
	commandInvokers.set(key, {
		invoker: { tag: invoker.tag, id: invoker.id },
		timestamp: Date.now()
	});
	// Auto-cleanup after 10 seconds (increased for multi-step operations like softban)
	setTimeout(() => commandInvokers.delete(key), 10000);
}

/**
 * Get the command invoker for an action
 * @param {string} guildId - Guild ID
 * @param {string} actionType - Type of action
 * @param {string} targetId - ID of the target
 * @returns {Object|null} - Invoker object or null
 */
export function getCommandInvoker(guildId, actionType, targetId) {
	const key = `${guildId}:${actionType}:${targetId}`;
	const data = commandInvokers.get(key);
	if (!data) return null;
	// Valid if within last 10 seconds (increased for multi-step operations like softban)
	return Date.now() - data.timestamp < 10000 ? data.invoker : null;
}

/**
 * Mark a message as deleted by Kira (call this before deleting)
 */
export function markMessageAsKiraDeleted(messageId) {
	kiraDeletedMessages.set(messageId, Date.now());
	// Auto-cleanup after 10 seconds
	setTimeout(() => kiraDeletedMessages.delete(messageId), 10000);
}

/**
 * Check if a message was deleted by Kira
 */
function wasDeletedByKira(messageId) {
	const timestamp = kiraDeletedMessages.get(messageId);
	if (!timestamp) return false;
	// Valid if within last 10 seconds
	return Date.now() - timestamp < 10000;
}

/**
 * Register all logging event handlers
 */
export function registerLoggingEvents(client) {
	console.log('📋 [Logging] Registering event handlers...');

	// Message Events
	registerMessageEvents(client);

	// Member Events
	registerMemberEvents(client);

	// Channel Events
	registerChannelEvents(client);

	// Role Events
	registerRoleEvents(client);

	// Emoji & Sticker Events
	registerEmojiEvents(client);

	// Server Events
	registerServerEvents(client);

	// Voice Events
	registerVoiceEvents(client);

	// Invite Events
	registerInviteEvents(client);

	// Audit Log Events (for catching actions by other bots)
	registerAuditLogEvents(client);

	console.log('✅ [Logging] All event handlers registered');
}

/**
 * Message Event Handlers
 */
function registerMessageEvents(client) {
	// Message Delete
	client.on(Events.MessageDelete, async (message) => {
		if (!message.guild) return;
		if (message.partial) return; // Can't log partial messages

		// Check if Kira deleted this message (tracked)
		const deletedByKira = wasDeletedByKira(message.id);
		
		let resolvedExecutor;
		
		if (deletedByKira) {
			// Kira deleted this message (command auto-delete, moderation, etc.)
			resolvedExecutor = { tag: `${client.user.tag}`, id: client.user.id };
		} else {
			// Check audit log for who deleted it
			const executor = await fetchAuditLogExecutor(
				message.guild,
				AuditLogEvent.MessageDelete,
				message.author?.id
			);
			
			if (executor) {
				resolvedExecutor = executor;
			} else {
				// No audit log entry - user likely deleted their own message
				resolvedExecutor = message.author || { tag: 'Unknown', id: 'Unknown' };
			}
		}

		// Build content description
		let contentDescription = '';
		
		// Check for text content
		if (message.content && message.content.trim()) {
			contentDescription = message.content;
		}
		
		// Check for embeds
		if (message.embeds && message.embeds.length > 0) {
			const embedInfo = message.embeds.map(e => {
				const parts = [];
				if (e.title) parts.push(`Title: ${e.title}`);
				if (e.description) parts.push(`Description: ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}`);
				if (e.url) parts.push(`URL: ${e.url}`);
				return parts.length > 0 ? parts.join(' | ') : 'Embed';
			}).join('\n');
			contentDescription += (contentDescription ? '\n\n' : '') + `📦 **Embeds (${message.embeds.length}):**\n${embedInfo}`;
		}
		
		// Check for components
		if (message.components && message.components.length > 0) {
			const componentCount = message.components.reduce((acc, row) => acc + (row.components?.length || 0), 0);
			contentDescription += (contentDescription ? '\n\n' : '') + `🔘 **Components:** ${componentCount} button(s)/select menu(s)`;
		}
		
		// Check for stickers
		if (message.stickers && message.stickers.size > 0) {
			const stickerNames = message.stickers.map(s => s.name).join(', ');
			contentDescription += (contentDescription ? '\n\n' : '') + `🎨 **Stickers:** ${stickerNames}`;
		}

		// If still no content, show appropriate message
		if (!contentDescription) {
			contentDescription = '*Empty message*';
		}

		// Get first image attachment for display
		const attachmentsList = message.attachments?.map(a => ({ 
			name: a.name, 
			url: a.url,
			contentType: a.contentType,
			size: a.size
		})) || [];
		
		const imageAttachment = attachmentsList.find(a => 
			a.contentType?.startsWith('image/') || 
			/\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || a.url)
		);

		await sendLog(client, message.guild.id, LOG_EVENTS.MESSAGE_DELETE, {
			executor: resolvedExecutor,
			target: message.author,
			channel: message.channel,
			content: contentDescription,
			attachments: attachmentsList,
			image: imageAttachment?.url,
			messageId: message.id,
			userId: message.author?.id,
			channelId: message.channel.id,
			thumbnail: message.author?.displayAvatarURL()
		});
	});

	// Message Edit
	client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
		if (!newMessage.guild) return;
		if (newMessage.author?.bot) return; // Ignore bot edits
		if (oldMessage.partial || newMessage.partial) return;
		if (oldMessage.content === newMessage.content) return; // Only content changes

		await sendLog(client, newMessage.guild.id, LOG_EVENTS.MESSAGE_EDIT, {
			target: newMessage.author,
			channel: newMessage.channel,
			before: oldMessage.content || '*No content*',
			after: newMessage.content || '*No content*',
			messageId: newMessage.id,
			userId: newMessage.author?.id,
			channelId: newMessage.channel.id,
			thumbnail: newMessage.author?.displayAvatarURL()
		});
	});

	// Bulk Delete
	client.on(Events.MessageBulkDelete, async (messages, channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.MessageBulkDelete,
			channel.id
		);

		// Sort messages by timestamp (oldest first)
		const sortedMessages = [...messages.values()].sort((a, b) => 
			a.createdTimestamp - b.createdTimestamp
		);

		// Create transcript content
		const transcriptLines = [
			`╔════════════════════════════════════════════════════════════════╗`,
			`║                    BULK DELETE TRANSCRIPT                       ║`,
			`╠════════════════════════════════════════════════════════════════╣`,
			`║ Server: ${channel.guild.name}`,
			`║ Channel: #${channel.name} (${channel.id})`,
			`║ Messages Deleted: ${messages.size}`,
			`║ Deleted By: ${executor?.tag || 'Unknown'} (${executor?.id || 'Unknown'})`,
			`║ Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
			`╚════════════════════════════════════════════════════════════════╝`,
			``,
			`${'─'.repeat(70)}`,
			``
		];

		for (const msg of sortedMessages) {
			const timestamp = new Date(msg.createdTimestamp).toLocaleString('en-US', {
				timeZone: 'UTC',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});

			const author = msg.author?.tag || 'Unknown User';
			const authorId = msg.author?.id || 'Unknown';
			
			transcriptLines.push(`┌─ ${author} (${authorId})`);
			transcriptLines.push(`│  Time: ${timestamp} UTC`);
			transcriptLines.push(`│  Message ID: ${msg.id}`);
			
			// Content
			if (msg.content && msg.content.trim()) {
				const contentLines = msg.content.split('\n');
				transcriptLines.push(`│  Content:`);
				for (const line of contentLines) {
					transcriptLines.push(`│    ${line}`);
				}
			} else {
				transcriptLines.push(`│  Content: [No text content]`);
			}
			
			// Embeds
			if (msg.embeds && msg.embeds.length > 0) {
				transcriptLines.push(`│  Embeds: ${msg.embeds.length}`);
				for (const embed of msg.embeds) {
					if (embed.title) transcriptLines.push(`│    - Title: ${embed.title}`);
					if (embed.description) transcriptLines.push(`│    - Description: ${embed.description.substring(0, 100)}${embed.description.length > 100 ? '...' : ''}`);
					if (embed.url) transcriptLines.push(`│    - URL: ${embed.url}`);
				}
			}
			
			// Attachments
			if (msg.attachments && msg.attachments.size > 0) {
				transcriptLines.push(`│  Attachments: ${msg.attachments.size}`);
				msg.attachments.forEach(att => {
					transcriptLines.push(`│    - ${att.name}: ${att.url}`);
				});
			}
			
			// Stickers
			if (msg.stickers && msg.stickers.size > 0) {
				transcriptLines.push(`│  Stickers: ${[...msg.stickers.values()].map(s => s.name).join(', ')}`);
			}
			
			transcriptLines.push(`└${'─'.repeat(69)}`);
			transcriptLines.push(``);
		}

		transcriptLines.push(`${'═'.repeat(70)}`);
		transcriptLines.push(`End of transcript - ${messages.size} messages`);

		const transcriptContent = transcriptLines.join('\n');
		
		// Create attachment buffer
		const transcriptBuffer = Buffer.from(transcriptContent, 'utf-8');
		const fileName = `bulk-delete-${channel.id}-${Date.now()}.txt`;

		// Get unique authors
		const uniqueAuthors = new Set(sortedMessages.map(m => m.author?.id).filter(Boolean));

		await sendLog(client, channel.guild.id, LOG_EVENTS.BULK_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel,
			count: messages.size,
			content: `**${messages.size}** messages deleted from ${uniqueAuthors.size} user(s)`,
			channelId: channel.id,
			files: [{
				attachment: transcriptBuffer,
				name: fileName,
				description: `Transcript of ${messages.size} deleted messages`
			}],
			transcriptFileName: fileName
		});
	});

	// Message Pin/Unpin (via channel pins update)
	client.on(Events.ChannelPinsUpdate, async (channel, time) => {
		if (!channel.guild) return;

		// We can't easily tell if it was a pin or unpin without tracking state
		// This event fires for both, so we'll log it as a generic pin update
		await sendLog(client, channel.guild.id, LOG_EVENTS.MESSAGE_PIN, {
			channel,
			content: `Pins updated in channel`,
			channelId: channel.id
		});
	});
}

/**
 * Member Event Handlers
 */
function registerMemberEvents(client) {
	// Member Join
	client.on(Events.GuildMemberAdd, async (member) => {
		const accountAge = Date.now() - member.user.createdTimestamp;
		const accountAgeStr = formatDuration(accountAge);

		// Check if it's a bot
		if (member.user.bot) {
			// Try to get who added the bot from audit logs
			const executor = await fetchAuditLogExecutor(
				member.guild,
				AuditLogEvent.BotAdd,
				member.id
			);

			await sendLog(client, member.guild.id, LOG_EVENTS.BOT_ADD, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: `Bot created ${accountAgeStr} ago`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		} else {
			// Regular member join
			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_JOIN, {
				target: member.user,
				content: `Account created ${accountAgeStr} ago`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});

	// Member Leave (includes kicks)
	client.on(Events.GuildMemberRemove, async (member) => {
		// Small delay to ensure markCommandInvoker has time to register
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Check if this was triggered by a Kira kick command - if so, skip native log
		const kickInvoker = getCommandInvoker(member.guild.id, 'kick', member.id) ||
			getCommandInvoker(member.guild.id, 'masskick', member.id);
		
		// Check if this was triggered by a Kira ban command (ban also triggers MemberRemove first)
		const banInvoker = getCommandInvoker(member.guild.id, 'ban', member.id) ||
			getCommandInvoker(member.guild.id, 'massban', member.id) ||
			getCommandInvoker(member.guild.id, 'softban', member.id) ||
			getCommandInvoker(member.guild.id, 'tempban', member.id) ||
			getCommandInvoker(member.guild.id, 'raidwipe', member.id);
		
		if (kickInvoker || banInvoker) {
			// Command already sent its own log, don't duplicate
			return;
		}

		// Check if it was a kick
		const kickExecutor = await fetchAuditLogExecutor(
			member.guild,
			AuditLogEvent.MemberKick,
			member.id
		);

		if (kickExecutor) {
			// Fetch audit log for reason
			const auditLogs = await member.guild.fetchAuditLogs({
				limit: 1,
				type: AuditLogEvent.MemberKick
			});
			const kickLog = auditLogs.entries.first();

			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_KICK, {
				executor: kickExecutor,
				target: member.user,
				reason: kickLog?.reason || 'No reason provided',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		} else {
			// Regular leave
			const joinedAt = member.joinedTimestamp;
			const memberDuration = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';

			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_LEAVE, {
				target: member.user,
				content: `Was a member for ${memberDuration}`,
				roles: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});

	// Member Ban
	client.on(Events.GuildBanAdd, async (ban) => {
		// Small delay to ensure markCommandInvoker has time to register
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Check if this was triggered by a Kira command - if so, skip native log
		const commandInvoker = getCommandInvoker(ban.guild.id, 'ban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'massban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'softban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'tempban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'raidwipe', ban.user.id);
		
		if (commandInvoker) {
			// Command already sent its own log, don't duplicate
			return;
		}

		const executor = await fetchAuditLogExecutor(
			ban.guild,
			AuditLogEvent.MemberBanAdd,
			ban.user.id
		);

		await sendLog(client, ban.guild.id, LOG_EVENTS.MEMBER_BAN, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			target: ban.user,
			reason: ban.reason || 'No reason provided',
			userId: ban.user.id,
			thumbnail: ban.user.displayAvatarURL()
		});
	});

	// Member Unban
	client.on(Events.GuildBanRemove, async (ban) => {
		// Small delay to ensure markCommandInvoker has time to register
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Check if this was triggered by a Kira command - if so, skip native log
		const commandInvoker = getCommandInvoker(ban.guild.id, 'unban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'unbanall', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'softban', ban.user.id);
		
		if (commandInvoker) {
			// Command already sent its own log, don't duplicate
			return;
		}

		const executor = await fetchAuditLogExecutor(
			ban.guild,
			AuditLogEvent.MemberBanRemove,
			ban.user.id
		);

		await sendLog(client, ban.guild.id, LOG_EVENTS.MEMBER_UNBAN, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			target: ban.user,
			userId: ban.user.id,
			thumbnail: ban.user.displayAvatarURL()
		});
	});

	// Member Update (nickname, roles, timeout)
	client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
		// Small delay to ensure markCommandInvoker has time to register
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Nickname change
		if (oldMember.nickname !== newMember.nickname) {
			// Check if this was triggered by a Kira nick command - if so, skip native log
			const nickInvoker = getCommandInvoker(newMember.guild.id, 'nick', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'forcenickname', newMember.id);
			
			if (nickInvoker) {
				// Command already sent its own log, don't duplicate
				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberUpdate,
				newMember.id
			);

			await sendLog(client, newMember.guild.id, LOG_EVENTS.NICKNAME_UPDATE, {
				executor: executor || newMember.user,
				target: newMember.user,
				before: oldMember.nickname || oldMember.user.username,
				after: newMember.nickname || newMember.user.username,
				userId: newMember.user.id,
				thumbnail: newMember.user.displayAvatarURL()
			});
		}

		// Role changes
		const oldRoles = oldMember.roles.cache;
		const newRoles = newMember.roles.cache;

		const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
		const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

		if (addedRoles.size > 0) {
			// Check if this was triggered by a Kira role command - if so, skip native log
			const roleAddInvoker = getCommandInvoker(newMember.guild.id, 'roleadd', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'role', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'temprole', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolebots', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolehumans', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolerestore', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'cascade', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'detain', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'release', newMember.id);
			
			if (roleAddInvoker) {
				// Command already sent its own log, don't duplicate
				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberRoleUpdate,
				newMember.id
			);

			for (const [, role] of addedRoles) {
				await sendLog(client, newMember.guild.id, LOG_EVENTS.ROLE_ADD, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					roles: role.name,
					roleId: role.id,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}

		if (removedRoles.size > 0) {
			// Check if this was triggered by a Kira role command - if so, skip native log
			const roleRemoveInvoker = getCommandInvoker(newMember.guild.id, 'roleremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'role', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolebotsremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolehumansremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolerestore', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'cascade', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'detain', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'release', newMember.id);
			
			if (roleRemoveInvoker) {
				// Command already sent its own log, don't duplicate
				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberRoleUpdate,
				newMember.id
			);

			for (const [, role] of removedRoles) {
				await sendLog(client, newMember.guild.id, LOG_EVENTS.ROLE_REMOVE, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					roles: role.name,
					roleId: role.id,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}

		// Timeout changes
		const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
		const newTimeout = newMember.communicationDisabledUntilTimestamp;

		if (oldTimeout !== newTimeout) {
			// Check if this was triggered by a command invoker - if so, skip native log (command already logs)
			const commandInvoker = getCommandInvoker(newMember.guild.id, 'mute', newMember.id);
			
			// Skip native timeout log if a Kira command triggered it (the command itself sends the log)
			if (commandInvoker) {
				// Command already sent its own log, don't duplicate
				return;
			}
			
			// If no command invoker, check audit log for external timeout
			const auditExecutor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberUpdate,
				newMember.id
			);
			const executor = auditExecutor;

			if (newTimeout && newTimeout > Date.now()) {
				// Timeout added/updated
				await sendLog(client, newMember.guild.id, LOG_EVENTS.TIMEOUT_ADD, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					duration: formatDuration(newTimeout - Date.now()),
					content: `Timeout until <t:${Math.floor(newTimeout / 1000)}:F>`,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			} else if (oldTimeout && oldTimeout > Date.now()) {
				// Timeout removed
				await sendLog(client, newMember.guild.id, LOG_EVENTS.TIMEOUT_REMOVE, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}
	});

	// User Update (username, avatar, global name)
	client.on(Events.UserUpdate, async (oldUser, newUser) => {
		// We need to log this to all mutual guilds
		for (const [, guild] of client.guilds.cache) {
			const member = guild.members.cache.get(newUser.id);
			if (!member) continue;

			// Username change
			if (oldUser.username !== newUser.username) {
				await sendLog(client, guild.id, LOG_EVENTS.USERNAME_UPDATE, {
					target: newUser,
					before: oldUser.username,
					after: newUser.username,
					userId: newUser.id,
					thumbnail: newUser.displayAvatarURL()
				});
			}

			// Avatar change
			if (oldUser.avatar !== newUser.avatar) {
				await sendLog(client, guild.id, LOG_EVENTS.AVATAR_UPDATE, {
					target: newUser,
					before: oldUser.displayAvatarURL() || 'Default avatar',
					after: newUser.displayAvatarURL() || 'Default avatar',
					userId: newUser.id,
					thumbnail: newUser.displayAvatarURL()
				});
			}
		}
	});
}

/**
 * Channel Event Handlers
 */
function registerChannelEvents(client) {
	// Channel Create
	client.on(Events.ChannelCreate, async (channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.ChannelCreate,
			channel.id
		);

		await sendLog(client, channel.guild.id, LOG_EVENTS.CHANNEL_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel,
			content: `Type: ${getChannelTypeString(channel.type)}`,
			channelId: channel.id
		});
	});

	// Channel Delete
	client.on(Events.ChannelDelete, async (channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.ChannelDelete,
			channel.id
		);

		await sendLog(client, channel.guild.id, LOG_EVENTS.CHANNEL_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `#${channel.name} (${getChannelTypeString(channel.type)})`,
			channelId: channel.id
		});
	});

	// Channel Update
	client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
		if (!newChannel.guild) return;

		// Try multiple audit log types for channel changes
		let executor = await fetchAuditLogExecutor(
			newChannel.guild,
			AuditLogEvent.ChannelUpdate,
			newChannel.id
		);
		
		// If not found, try permission overwrite audit logs
		if (!executor || executor.tag === 'Unknown') {
			executor = await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteUpdate,
				newChannel.id
			) || await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteCreate,
				newChannel.id
			) || await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteDelete,
				newChannel.id
			) || executor;
		}

		const changes = [];

		// Name change
		if (oldChannel.name !== newChannel.name) {
			changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
		}

		// Topic change (text channels)
		if (oldChannel.topic !== newChannel.topic) {
			changes.push(`**Topic:** ${oldChannel.topic || '*None*'} → ${newChannel.topic || '*None*'}`);
		}

		// NSFW change
		if (oldChannel.nsfw !== newChannel.nsfw) {
			changes.push(`**NSFW:** ${oldChannel.nsfw ? 'Yes' : 'No'} → ${newChannel.nsfw ? 'Yes' : 'No'}`);
		}

		// Parent (category) change
		if (oldChannel.parentId !== newChannel.parentId) {
			const oldParent = oldChannel.parent?.name || 'None';
			const newParent = newChannel.parent?.name || 'None';
			changes.push(`**Category:** ${oldParent} → ${newParent}`);
		}

		// Position change
		if (oldChannel.position !== newChannel.position) {
			changes.push(`**Position:** ${oldChannel.position} → ${newChannel.position}`);
		}

		// Slowmode change
		if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
			changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
		}

		// Bitrate change (voice)
		if (oldChannel.bitrate !== newChannel.bitrate) {
			changes.push(`**Bitrate:** ${oldChannel.bitrate}kbps → ${newChannel.bitrate}kbps`);
		}

		// User limit change (voice)
		if (oldChannel.userLimit !== newChannel.userLimit) {
			changes.push(`**User Limit:** ${oldChannel.userLimit || 'Unlimited'} → ${newChannel.userLimit || 'Unlimited'}`);
		}

		// Permission Changes
		const oldPermissions = new Map(oldChannel.permissionOverwrites.cache);
		const newPermissions = new Map(newChannel.permissionOverwrites.cache);
		
		// Helper function to get permission names from bitfield difference
		const getPermissionChanges = (oldAllow, oldDeny, newAllow, newDeny) => {
			const permChanges = [];
			const allPerms = [
				'ViewChannel', 'ManageChannels', 'ManageRoles', 'CreateInstantInvite',
				'SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads',
				'EmbedLinks', 'AttachFiles', 'AddReactions', 'UseExternalEmojis', 'UseExternalStickers',
				'MentionEveryone', 'ManageMessages', 'ManageThreads', 'ReadMessageHistory',
				'SendTTSMessages', 'UseApplicationCommands', 'SendVoiceMessages', 'SendPolls',
				'Connect', 'Speak', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers',
				'DeafenMembers', 'MoveMembers', 'UseEmbeddedActivities', 'UseSoundboard',
				'UseExternalSounds', 'RequestToSpeak', 'ManageEvents', 'ManageWebhooks'
			];
			
			for (const perm of allPerms) {
				const oldAllowed = oldAllow.has(perm);
				const oldDenied = oldDeny.has(perm);
				const newAllowed = newAllow.has(perm);
				const newDenied = newDeny.has(perm);
				
				if (oldAllowed !== newAllowed || oldDenied !== newDenied) {
					let oldState = oldAllowed ? '✅' : oldDenied ? '❌' : '⬜';
					let newState = newAllowed ? '✅' : newDenied ? '❌' : '⬜';
					permChanges.push(`${perm}: ${oldState} → ${newState}`);
				}
			}
			return permChanges;
		};
		
		// Check for added or modified permission overwrites
		for (const [id, newPerm] of newPermissions) {
			const oldPerm = oldPermissions.get(id);
			const target = newPerm.type === 0
				? newChannel.guild.roles.cache.get(id)
				: newChannel.guild.members.cache.get(id)?.user;
			
			const targetName = newPerm.type === 0
				? (target?.name || `Unknown Role`)
				: (target?.username || `Unknown User`);
			const targetType = newPerm.type === 0 ? '🏷️ Role' : '👤 Member';
			
			if (!oldPerm) {
				// New permission overwrite added
				const permDetails = [];
				if (newPerm.allow.bitfield > 0n) {
					const allowed = newPerm.allow.toArray();
					permDetails.push(`✅ Allowed: ${allowed.join(', ')}`);
				}
				if (newPerm.deny.bitfield > 0n) {
					const denied = newPerm.deny.toArray();
					permDetails.push(`❌ Denied: ${denied.join(', ')}`);
				}
				changes.push(`**${targetType} ${targetName}:** Permission overwrite added\n${permDetails.join('\n')}`);
			} else if (oldPerm.allow.bitfield !== newPerm.allow.bitfield || oldPerm.deny.bitfield !== newPerm.deny.bitfield) {
				// Permission overwrite modified
				const permChanges = getPermissionChanges(oldPerm.allow, oldPerm.deny, newPerm.allow, newPerm.deny);
				if (permChanges.length > 0) {
					changes.push(`**${targetType} ${targetName}:** Permissions changed\n${permChanges.slice(0, 10).join('\n')}${permChanges.length > 10 ? `\n...and ${permChanges.length - 10} more` : ''}`);
				}
			}
		}

		// Check for removed permission overwrites
		for (const [id, oldPerm] of oldPermissions) {
			if (!newPermissions.has(id)) {
				const target = oldPerm.type === 0
					? newChannel.guild.roles.cache.get(id)
					: newChannel.guild.members.cache.get(id)?.user;
				
				const targetName = oldPerm.type === 0
					? (target?.name || `Unknown Role`)
					: (target?.username || `Unknown User`);
				const targetType = oldPerm.type === 0 ? '🏷️ Role' : '👤 Member';
				changes.push(`**${targetType} ${targetName}:** Permission overwrite removed`);
			}
		}

		if (changes.length > 0) {
			await sendLog(client, newChannel.guild.id, LOG_EVENTS.CHANNEL_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				channel: newChannel,
				content: changes.join('\n'),
				channelId: newChannel.id
			});
		}
	});

	// Thread Create
	client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
		if (!newlyCreated) return;

		await sendLog(client, thread.guild.id, LOG_EVENTS.THREAD_CREATE, {
			executor: thread.ownerId ? { id: thread.ownerId } : { tag: 'Unknown', id: 'Unknown' },
			channel: thread.parent,
			content: `Thread: ${thread.name}`,
			channelId: thread.id
		});
	});

	// Thread Delete
	client.on(Events.ThreadDelete, async (thread) => {
		const executor = await fetchAuditLogExecutor(
			thread.guild,
			AuditLogEvent.ThreadDelete,
			thread.id
		);

		await sendLog(client, thread.guild.id, LOG_EVENTS.THREAD_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Thread: ${thread.name}`,
			channelId: thread.id
		});
	});

	// Thread Update
	client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
		const changes = [];

		if (oldThread.name !== newThread.name) {
			changes.push(`**Name:** ${oldThread.name} → ${newThread.name}`);
		}

		if (oldThread.archived !== newThread.archived) {
			changes.push(`**Archived:** ${oldThread.archived ? 'Yes' : 'No'} → ${newThread.archived ? 'Yes' : 'No'}`);
		}

		if (oldThread.locked !== newThread.locked) {
			changes.push(`**Locked:** ${oldThread.locked ? 'Yes' : 'No'} → ${newThread.locked ? 'Yes' : 'No'}`);
		}

		if (changes.length > 0) {
			await sendLog(client, newThread.guild.id, LOG_EVENTS.THREAD_UPDATE, {
				channel: newThread.parent,
				content: `Thread: ${newThread.name}\n${changes.join('\n')}`,
				channelId: newThread.id
			});
		}
	});
}

/**
 * Role Event Handlers
 */
function registerRoleEvents(client) {
	// Role Create
	client.on(Events.GuildRoleCreate, async (role) => {
		const executor = await fetchAuditLogExecutor(
			role.guild,
			AuditLogEvent.RoleCreate,
			role.id
		);

		await sendLog(client, role.guild.id, LOG_EVENTS.ROLE_CREATE, {
			executor: executor,
			role: role,
			content: `**Color:** ${role.hexColor}\n**Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
			roleId: role.id
		});
	});

	// Role Delete
	client.on(Events.GuildRoleDelete, async (role) => {
		const executor = await fetchAuditLogExecutor(
			role.guild,
			AuditLogEvent.RoleDelete,
			role.id
		);

		await sendLog(client, role.guild.id, LOG_EVENTS.ROLE_DELETE, {
			executor: executor,
			role: role,
			roleId: role.id
		});
	});

	// Role Update
	client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
		const executor = await fetchAuditLogExecutor(
			newRole.guild,
			AuditLogEvent.RoleUpdate,
			newRole.id
		);

		const changes = [];

		if (oldRole.name !== newRole.name) {
			changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
		}

		if (oldRole.hexColor !== newRole.hexColor) {
			changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
		}

		if (oldRole.hoist !== newRole.hoist) {
			changes.push(`**Hoisted:** ${oldRole.hoist ? 'Yes' : 'No'} → ${newRole.hoist ? 'Yes' : 'No'}`);
		}

		if (oldRole.mentionable !== newRole.mentionable) {
			changes.push(`**Mentionable:** ${oldRole.mentionable ? 'Yes' : 'No'} → ${newRole.mentionable ? 'Yes' : 'No'}`);
		}

		if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
			const oldPerms = oldRole.permissions.toArray();
			const newPerms = newRole.permissions.toArray();
			const added = newPerms.filter(p => !oldPerms.includes(p));
			const removed = oldPerms.filter(p => !newPerms.includes(p));

			if (added.length > 0) {
				changes.push(`**Permissions Added:** ${added.join(', ')}`);
			}
			if (removed.length > 0) {
				changes.push(`**Permissions Removed:** ${removed.join(', ')}`);
			}
		}

		if (changes.length > 0) {
			await sendLog(client, newRole.guild.id, LOG_EVENTS.ROLE_UPDATE, {
				executor: executor,
				role: newRole,
				changes: changes,
				roleId: newRole.id
			});
		}
	});
}

/**
 * Emoji & Sticker Event Handlers
 */
function registerEmojiEvents(client) {
	// Emoji Create
	client.on(Events.GuildEmojiCreate, async (emoji) => {
		const executor = await fetchAuditLogExecutor(
			emoji.guild,
			AuditLogEvent.EmojiCreate,
			emoji.id
		);

		await sendLog(client, emoji.guild.id, LOG_EVENTS.EMOJI_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			emojiName: emoji.name,
			emojiPreview: `${emoji}`,
			thumbnail: emoji.url
		});
	});

	// Emoji Delete
	client.on(Events.GuildEmojiDelete, async (emoji) => {
		const executor = await fetchAuditLogExecutor(
			emoji.guild,
			AuditLogEvent.EmojiDelete,
			emoji.id
		);

		await sendLog(client, emoji.guild.id, LOG_EVENTS.EMOJI_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			emojiName: emoji.name,
			thumbnail: emoji.url
		});
	});

	// Emoji Update (Name Changed)
	client.on(Events.GuildEmojiUpdate, async (oldEmoji, newEmoji) => {
		const executor = await fetchAuditLogExecutor(
			newEmoji.guild,
			AuditLogEvent.EmojiUpdate,
			newEmoji.id
		);

		await sendLog(client, newEmoji.guild.id, LOG_EVENTS.EMOJI_UPDATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			oldName: oldEmoji.name,
			newName: newEmoji.name,
			emojiPreview: `${newEmoji}`,
			thumbnail: newEmoji.url
		});
	});

	// Sticker Create
	client.on(Events.GuildStickerCreate, async (sticker) => {
		const executor = await fetchAuditLogExecutor(
			sticker.guild,
			AuditLogEvent.StickerCreate,
			sticker.id
		);

		await sendLog(client, sticker.guild.id, LOG_EVENTS.STICKER_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Sticker: ${sticker.name}\nDescription: ${sticker.description || 'None'}`,
			thumbnail: sticker.url
		});
	});

	// Sticker Delete
	client.on(Events.GuildStickerDelete, async (sticker) => {
		const executor = await fetchAuditLogExecutor(
			sticker.guild,
			AuditLogEvent.StickerDelete,
			sticker.id
		);

		await sendLog(client, sticker.guild.id, LOG_EVENTS.STICKER_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Sticker: ${sticker.name}`
		});
	});

	// Sticker Update
	client.on(Events.GuildStickerUpdate, async (oldSticker, newSticker) => {
		const executor = await fetchAuditLogExecutor(
			newSticker.guild,
			AuditLogEvent.StickerUpdate,
			newSticker.id
		);

		const changes = [];
		if (oldSticker.name !== newSticker.name) {
			changes.push(`**Name:** ${oldSticker.name} → ${newSticker.name}`);
		}
		if (oldSticker.description !== newSticker.description) {
			changes.push(`**Description:** ${oldSticker.description || 'None'} → ${newSticker.description || 'None'}`);
		}

		if (changes.length > 0) {
			await sendLog(client, newSticker.guild.id, LOG_EVENTS.STICKER_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				content: changes.join('\n'),
				thumbnail: newSticker.url
			});
		}
	});
}

/**
 * Server Event Handlers
 */
function registerServerEvents(client) {
	// Guild Update
	client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
		const executor = await fetchAuditLogExecutor(
			newGuild,
			AuditLogEvent.GuildUpdate,
			newGuild.id
		);

		const changes = [];

		if (oldGuild.name !== newGuild.name) {
			changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
		}

		if (oldGuild.icon !== newGuild.icon) {
			changes.push(`**Icon:** Changed`);
		}

		if (oldGuild.banner !== newGuild.banner) {
			changes.push(`**Banner:** Changed`);
		}

		if (oldGuild.description !== newGuild.description) {
			// Don't log if both are None/empty
			if ((oldGuild.description || newGuild.description)) {
				changes.push(`**Description:** ${oldGuild.description || '*None*'} → ${newGuild.description || '*None*'}`);
			}
		}

		if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
			changes.push(`**Verification Level:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
		}

		if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
			changes.push(`**Content Filter:** ${oldGuild.explicitContentFilter} → ${newGuild.explicitContentFilter}`);
		}

		if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
			changes.push(`**System Channel:** <#${oldGuild.systemChannelId}> → <#${newGuild.systemChannelId}>`);
		}

		if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
			changes.push(`**AFK Channel:** <#${oldGuild.afkChannelId}> → <#${newGuild.afkChannelId}>`);
		}

		if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
			changes.push(`**AFK Timeout:** ${oldGuild.afkTimeout}s → ${newGuild.afkTimeout}s`);
		}

		if (changes.length > 0) {
			await sendLog(client, newGuild.id, LOG_EVENTS.SERVER_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				content: changes.join('\n'),
				thumbnail: newGuild.iconURL()
			});
		}
	});

	// Boost (via member update - premium subscription count)
	// This is handled in GuildMemberUpdate by checking roles
}

/**
 * Voice Event Handlers
 */
function registerVoiceEvents(client) {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		const member = newState.member || oldState.member;
		if (!member) return;

		const guild = newState.guild || oldState.guild;
		if (!guild) return;

		// Voice Join
		if (!oldState.channelId && newState.channelId) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_JOIN, {
				target: member.user,
				channel: newState.channel,
				userId: member.user.id,
				channelId: newState.channelId,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Voice Leave
		else if (oldState.channelId && !newState.channelId) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_LEAVE, {
				target: member.user,
				channel: oldState.channel,
				userId: member.user.id,
				channelId: oldState.channelId,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Voice Move
		else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberMove,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MOVE, {
				executor: executor || member.user,
				target: member.user,
				before: `<#${oldState.channelId}>`,
				after: `<#${newState.channelId}>`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Server Mute Change (only if user was already in voice - not just joining)
		if (oldState.channelId && oldState.serverMute !== newState.serverMute) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberUpdate,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MUTE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: newState.serverMute ? 'Server muted' : 'Server unmuted',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Self Mute Change (only if user was already in voice - not just joining)
		if (oldState.channelId && oldState.selfMute !== newState.selfMute) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MUTE, {
				executor: member.user,
				target: member.user,
				content: newState.selfMute ? 'Self-muted' : 'Self-unmuted',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Server Deafen Change (only if user was already in voice - not just joining)
		if (oldState.channelId && oldState.serverDeaf !== newState.serverDeaf) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberUpdate,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_DEAFEN, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: newState.serverDeaf ? 'Server deafened' : 'Server undeafened',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		// Self Deafen Change (only if user was already in voice - not just joining)
		if (oldState.channelId && oldState.selfDeaf !== newState.selfDeaf) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_DEAFEN, {
				executor: member.user,
				target: member.user,
				content: newState.selfDeaf ? 'Self-deafened' : 'Self-undeafened',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});
}

/**
 * Invite Event Handlers
 */
function registerInviteEvents(client) {
	// Invite Create
	client.on(Events.InviteCreate, async (invite) => {
		if (!invite.guild) return;

		await sendLog(client, invite.guild.id, LOG_EVENTS.INVITE_CREATE, {
			executor: invite.inviter,
			channel: invite.channel,
			content: `Code: ${invite.code}\nMax Uses: ${invite.maxUses || 'Unlimited'}\nExpires: ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never'}`,
			channelId: invite.channel?.id
		});
	});

	// Invite Delete
	client.on(Events.InviteDelete, async (invite) => {
		if (!invite.guild) return;

		const executor = await fetchAuditLogExecutor(
			invite.guild,
			AuditLogEvent.InviteDelete,
			invite.code
		);

		await sendLog(client, invite.guild.id, LOG_EVENTS.INVITE_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel: invite.channel,
			content: `Code: ${invite.code}`,
			channelId: invite.channel?.id
		});
	});
}

/**
 * Audit Log Events - For catching actions by other bots
 */
function registerAuditLogEvents(client) {
	// This event catches all audit log entries, including those from other bots
	client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
		// We primarily handle this for actions that might not trigger other events
		// or for getting more accurate executor information

		// Skip if the executor is this bot (we already logged it)
		if (auditLogEntry.executorId === client.user.id) return;

		// Handle AutoMod actions
		if (auditLogEntry.action === AuditLogEvent.AutoModerationBlockMessage ||
			auditLogEntry.action === AuditLogEvent.AutoModerationFlagToChannel ||
			auditLogEntry.action === AuditLogEvent.AutoModerationUserCommunicationDisabled) {
			
			await sendLog(client, guild.id, LOG_EVENTS.AUTOMOD_ACTION, {
				executor: { tag: 'AutoMod', id: 'AutoMod' },
				target: auditLogEntry.target,
				reason: auditLogEntry.reason || 'AutoMod action triggered',
				content: `Action: ${auditLogEntry.action}`
			});
		}
	});
}

export default { registerLoggingEvents };
