/**
 * Kira Logging System - Complete Implementation
 * Handles all server event logging with comprehensive configuration
 */

import { ContainerBuilder, SeparatorSpacingSize, EmbedBuilder, AuditLogEvent, ChannelType, MessageFlags, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from './emojis.js';
import { getCommandInvoker } from '../events/loggingEvents.js';

// Event type constants
export const LOG_EVENTS = {
	// Message Events
	MESSAGE_DELETE: 'messageDelete',
	MESSAGE_EDIT: 'messageEdit',
	BULK_DELETE: 'bulkDelete',
	MESSAGE_PIN: 'messagePin',
	MESSAGE_UNPIN: 'messageUnpin',

	// Member Events
	MEMBER_JOIN: 'memberJoin',
	MEMBER_LEAVE: 'memberLeave',
	BOT_ADD: 'botAdd',
	MEMBER_BAN: 'memberBan',
	MEMBER_UNBAN: 'memberUnban',
	MEMBER_KICK: 'memberKick',
	NICKNAME_UPDATE: 'nicknameUpdate',
	USERNAME_UPDATE: 'usernameUpdate',
	AVATAR_UPDATE: 'avatarUpdate',
	ROLE_ADD: 'roleAdd',
	ROLE_REMOVE: 'roleRemove',
	TIMEOUT_ADD: 'timeoutAdd',
	TIMEOUT_REMOVE: 'timeoutRemove',

	// Channel Events
	CHANNEL_CREATE: 'channelCreate',
	CHANNEL_DELETE: 'channelDelete',
	CHANNEL_UPDATE: 'channelUpdate',
	THREAD_CREATE: 'threadCreate',
	THREAD_DELETE: 'threadDelete',
	THREAD_UPDATE: 'threadUpdate',

	// Role Events
	ROLE_CREATE: 'roleCreate',
	ROLE_DELETE: 'roleDelete',
	ROLE_UPDATE: 'roleUpdate',

	// Emoji & Sticker Events
	EMOJI_CREATE: 'emojiCreate',
	EMOJI_DELETE: 'emojiDelete',
	EMOJI_UPDATE: 'emojiUpdate',
	STICKER_CREATE: 'stickerCreate',
	STICKER_DELETE: 'stickerDelete',
	STICKER_UPDATE: 'stickerUpdate',

	// Server Events
	SERVER_UPDATE: 'serverUpdate',
	BOOST_ADD: 'boostAdd',
	BOOST_REMOVE: 'boostRemove',
	INVITE_CREATE: 'inviteCreate',
	INVITE_DELETE: 'inviteDelete',

	// Voice Events
	VOICE_JOIN: 'voiceJoin',
	VOICE_LEAVE: 'voiceLeave',
	VOICE_MOVE: 'voiceMove',
	VOICE_MUTE: 'voiceMute',
	VOICE_DEAFEN: 'voiceDeafen',

	// Moderation Events (Kira Actions)
	MOD_BAN: 'modBan',
	MOD_KICK: 'modKick',
	MOD_MUTE: 'modMute',
	MOD_UNMUTE: 'modUnmute',
	MOD_IMUTE: 'modImute',
	MOD_IUNMUTE: 'modIunmute',
	MOD_RMUTE: 'modRmute',
	MOD_RUNMUTE: 'modRunmute',
	MOD_WARN: 'modWarn',
	MOD_SOFTBAN: 'modSoftban',
	MOD_TEMPBAN: 'modTempban',
	MOD_UNBAN: 'modUnban',
	MOD_DETAIN: 'modDetain',
	MOD_RELEASE: 'modRelease',
	MOD_FORCENICK: 'modForcenick',
	MOD_NICK: 'modNick',
	MOD_RAIDWIPE: 'modRaidwipe',
	MOD_MASS_ACTION: 'modMassAction',
	MOD_TEMPROLE: 'modTemprole',
	MOD_CLEAR: 'modClear',
	MOD_CLEARWARNINGS: 'modClearwarnings',
	MOD_LOCK: 'modLock',
	MOD_UNLOCK: 'modUnlock',
	MOD_HIDE: 'modHide',
	MOD_UNHIDE: 'modUnhide',
	MOD_SLOWMODE: 'modSlowmode',
	MOD_NUKE: 'modNuke',
	MOD_VOIDSTAFF: 'modVoidstaff',
	MOD_NOTE_ADD: 'modNoteAdd',
	MOD_NOTE_REMOVE: 'modNoteRemove',
	MOD_NOTE_CLEAR: 'modNoteClear',
	MOD_THREAD_LOCK: 'modThreadLock',
	MOD_THREAD_UNLOCK: 'modThreadUnlock',
	MOD_CHANNEL_TOPIC: 'modChannelTopic',
	MOD_ROLE_ADD: 'modRoleAdd',
	MOD_ROLE_REMOVE: 'modRoleRemove',
	MOD_CASE_DELETE: 'modCaseDelete',
	MOD_CASE_REASON: 'modCaseReason',

	// Automod Events
	AUTOMOD_ACTION: 'automodAction'
};

// Log category mapping
export const LOG_CATEGORIES = {
	message: ['messageDelete', 'messageEdit', 'bulkDelete', 'messagePin', 'messageUnpin'],
	member: ['memberJoin', 'memberLeave', 'nicknameUpdate', 'usernameUpdate', 'avatarUpdate', 'roleAdd', 'roleRemove'],
	mod: [
		'memberBan', 'memberUnban', 'memberKick',
		'modBan', 'modKick', 'modMute', 'modUnmute', 'modImute', 'modIunmute', 'modRmute', 'modRunmute',
		'modWarn', 'modSoftban', 'modTempban', 'modUnban',
		'modDetain', 'modRelease', 'modForcenick', 'modNick', 'modRaidwipe', 'modMassAction',
		'modTemprole', 'modClear', 'modClearwarnings',
		'modLock', 'modUnlock', 'modHide', 'modUnhide', 'modSlowmode', 'modNuke',
		'modVoidstaff', 'modNoteAdd', 'modNoteRemove', 'modNoteClear',
		'modThreadLock', 'modThreadUnlock', 'modChannelTopic',
		'modRoleAdd', 'modRoleRemove', 'modCaseDelete', 'modCaseReason',
		'automodAction', 'timeoutAdd', 'timeoutRemove'
	],
	server: ['serverUpdate', 'boostAdd', 'boostRemove', 'inviteCreate', 'inviteDelete', 'botAdd'],
	voice: ['voiceJoin', 'voiceLeave', 'voiceMove', 'voiceMute', 'voiceDeafen'],
	role: ['roleCreate', 'roleDelete', 'roleUpdate'],
	channel: ['channelCreate', 'channelDelete', 'channelUpdate', 'threadCreate', 'threadDelete', 'threadUpdate'],
	emoji: ['emojiCreate', 'emojiDelete', 'emojiUpdate', 'stickerCreate', 'stickerDelete', 'stickerUpdate']
};

// Category to channel mapping for display
export const CATEGORY_NAMES = {
	message: 'Message Logs',
	member: 'Member Logs',
	mod: 'Moderation Logs',
	server: 'Server Logs',
	voice: 'Voice Logs',
	role: 'Role Logs',
	channel: 'Channel Logs',
	emoji: 'Emoji & Sticker Logs'
};

// Event icons for visual appeal
const EVENT_ICONS = {
	messageDelete: EMOJIS.logDelete,
	messageEdit: EMOJIS.logEdit,
	bulkDelete: EMOJIS.logDelete,
	messagePin: EMOJIS.logMessage,
	messageUnpin: EMOJIS.logMessage,
	memberJoin: EMOJIS.logJoin,
	memberLeave: EMOJIS.logLeave,
	botAdd: '🤖',
	memberBan: EMOJIS.logBan,
	memberUnban: EMOJIS.logUnban,
	memberKick: EMOJIS.logKick,
	nicknameUpdate: EMOJIS.members,
	usernameUpdate: EMOJIS.members,
	avatarUpdate: EMOJIS.members,
	roleAdd: EMOJIS.logRole,
	roleRemove: EMOJIS.logRole,
	timeoutAdd: EMOJIS.logTimeout,
	timeoutRemove: EMOJIS.logTimeout,
	channelCreate: EMOJIS.logChannel,
	channelDelete: EMOJIS.logChannel,
	channelUpdate: EMOJIS.logChannel,
	threadCreate: EMOJIS.logChannel,
	threadDelete: EMOJIS.logChannel,
	threadUpdate: EMOJIS.logChannel,
	roleCreate: EMOJIS.logRole,
	roleDelete: EMOJIS.logRole,
	roleUpdate: EMOJIS.logRole,
	emojiCreate: EMOJIS.logEmoji,
	emojiDelete: EMOJIS.logEmoji,
	emojiUpdate: EMOJIS.logEmoji,
	stickerCreate: EMOJIS.logEmoji,
	stickerDelete: EMOJIS.logEmoji,
	stickerUpdate: EMOJIS.logEmoji,
	serverUpdate: EMOJIS.logServer,
	boostAdd: EMOJIS.logServer,
	boostRemove: EMOJIS.logServer,
	inviteCreate: EMOJIS.logServer,
	inviteDelete: EMOJIS.logServer,
	voiceJoin: EMOJIS.logVoice,
	voiceLeave: EMOJIS.logVoice,
	voiceMove: EMOJIS.logVoice,
	voiceMute: EMOJIS.logVoice,
	voiceDeafen: EMOJIS.logVoice,
	modBan: EMOJIS.logBan,
	modKick: EMOJIS.logKick,
	modMute: EMOJIS.logTimeout,
	modUnmute: EMOJIS.logTimeout,
	modImute: EMOJIS.logTimeout,
	modIunmute: EMOJIS.logTimeout,
	modRmute: EMOJIS.logTimeout,
	modRunmute: EMOJIS.logTimeout,
	modWarn: EMOJIS.logWarn,
	modSoftban: EMOJIS.logBan,
	modTempban: EMOJIS.logBan,
	modUnban: EMOJIS.logUnban,
	modDetain: EMOJIS.logMod,
	modRelease: EMOJIS.logMod,
	modForcenick: EMOJIS.members,
	modNick: EMOJIS.members,
	modRaidwipe: EMOJIS.logMod,
	modMassAction: EMOJIS.logMod,
	modTemprole: EMOJIS.logRole,
	modClear: EMOJIS.logDelete,
	modClearwarnings: EMOJIS.logMod,
	modLock: EMOJIS.logChannel,
	modUnlock: EMOJIS.logChannel,
	modHide: EMOJIS.logChannel,
	modUnhide: EMOJIS.logChannel,
	modSlowmode: EMOJIS.logChannel,
	modNuke: EMOJIS.logChannel,
	modVoidstaff: EMOJIS.logMod,
	modNoteAdd: EMOJIS.logMod,
	modNoteRemove: EMOJIS.logMod,
	modNoteClear: EMOJIS.logMod,
	modThreadLock: EMOJIS.logChannel,
	modThreadUnlock: EMOJIS.logChannel,
	modChannelTopic: EMOJIS.logChannel,
	modRoleAdd: EMOJIS.logRole,
	modRoleRemove: EMOJIS.logRole,
	modCaseDelete: EMOJIS.logMod,
	modCaseReason: EMOJIS.logMod,
	automodAction: EMOJIS.logMod
};

// Event titles for embeds
const EVENT_TITLES = {
	messageDelete: 'Message Deleted',
	messageEdit: 'Message Edited',
	bulkDelete: 'Bulk Message Delete',
	messagePin: 'Message Pinned',
	messageUnpin: 'Message Unpinned',
	memberJoin: 'Member Joined',
	memberLeave: 'Member Left',
	botAdd: 'Bot Added',
	memberBan: 'Member Banned',
	memberUnban: 'Member Unbanned',
	memberKick: 'Member Kicked',
	nicknameUpdate: 'Nickname Changed',
	usernameUpdate: 'Username Changed',
	avatarUpdate: 'Avatar Changed',
	roleAdd: 'Role Added',
	roleRemove: 'Role Removed',
	timeoutAdd: 'Timeout Applied',
	timeoutRemove: 'Timeout Removed',
	channelCreate: 'Channel Created',
	channelDelete: 'Channel Deleted',
	channelUpdate: 'Channel Updated',
	threadCreate: 'Thread Created',
	threadDelete: 'Thread Deleted',
	threadUpdate: 'Thread Updated',
	roleCreate: 'Role Created',
	roleDelete: 'Role Deleted',
	roleUpdate: 'Role Updated',
	emojiCreate: 'Emoji Created',
	emojiDelete: 'Emoji Deleted',
	emojiUpdate: 'Emoji Updated',
	stickerCreate: 'Sticker Created',
	stickerDelete: 'Sticker Deleted',
	stickerUpdate: 'Sticker Updated',
	serverUpdate: 'Server Updated',
	boostAdd: 'Server Boosted',
	boostRemove: 'Boost Removed',
	inviteCreate: 'Invite Created',
	inviteDelete: 'Invite Deleted',
	voiceJoin: 'Joined Voice',
	voiceLeave: 'Left Voice',
	voiceMove: 'Moved Voice Channel',
	voiceMute: 'Voice Mute Changed',
	voiceDeafen: 'Voice Deafen Changed',
	modBan: 'Member Banned',
	modKick: 'Member Kicked',
	modMute: 'Member Muted',
	modUnmute: 'Member Unmuted',
	modImute: 'Image Muted',
	modIunmute: 'Image Unmuted',
	modRmute: 'Reaction Muted',
	modRunmute: 'Reaction Unmuted',
	modWarn: 'Member Warned',
	modSoftban: 'Member Softbanned',
	modTempban: 'Member Tempbanned',
	modUnban: 'Member Unbanned',
	modDetain: 'Member Detained',
	modRelease: 'Member Released',
	modForcenick: 'Nickname Forced',
	modNick: 'Nickname Changed',
	modRaidwipe: 'Raid Wipe Executed',
	modMassAction: 'Mass Action Taken',
	modTemprole: 'Temporary Role Applied',
	modClear: 'Messages Cleared',
	modClearwarnings: 'Warnings Cleared',
	modLock: 'Channel Locked',
	modUnlock: 'Channel Unlocked',
	modHide: 'Channel Hidden',
	modUnhide: 'Channel Unhidden',
	modSlowmode: 'Slowmode Changed',
	modNuke: 'Channel Nuked',
	modVoidstaff: 'Staff Voided',
	modNoteAdd: 'Note Added',
	modNoteRemove: 'Note Removed',
	modNoteClear: 'Notes Cleared',
	modThreadLock: 'Thread Locked',
	modThreadUnlock: 'Thread Unlocked',
	modChannelTopic: 'Channel Topic Changed',
	modRoleAdd: 'Role Added',
	modRoleRemove: 'Role Removed',
	modCaseDelete: 'Case Deleted',
	modCaseReason: 'Case Reason Updated',
	automodAction: 'Automod Action'
};

// Embed colors by category
const CATEGORY_COLORS = {
	message: 0x3498db, // Blue
	member: 0x2ecc71, // Green
	mod: 0xe74c3c, // Red
	server: 0x9b59b6, // Purple
	voice: 0x1abc9c, // Teal
	role: 0xf39c12, // Orange
	channel: 0x95a5a6, // Gray
	emoji: 0xe91e63 // Pink
};

/**
 * Default logging configuration
 */
export function getDefaultLoggingConfig() {
	return {
		enabled: false,
		channels: {
			message: null,
			member: null,
			mod: null,
			server: null,
			voice: null,
			role: null,
			channel: null,
			emoji: null,
			combined: null // For servers using a single log channel
		},
		events: {
			// Message Events
			messageDelete: true,
			messageEdit: true,
			bulkDelete: true,
			messagePin: true,
			messageUnpin: true,

			// Member Events
			memberJoin: true,
			memberLeave: true,
			memberBan: true,
			memberUnban: true,
			memberKick: true,
			nicknameUpdate: true,
			usernameUpdate: true,
			avatarUpdate: true,
			roleAdd: true,
			roleRemove: true,
			timeoutAdd: true,
			timeoutRemove: true,

			// Channel Events
			channelCreate: true,
			channelDelete: true,
			channelUpdate: true,
			threadCreate: true,
			threadDelete: true,
			threadUpdate: true,

			// Role Events
			roleCreate: true,
			roleDelete: true,
			roleUpdate: true,

			// Emoji & Sticker Events
			emojiCreate: true,
			emojiDelete: true,
			emojiUpdate: true,
			stickerCreate: true,
			stickerDelete: true,
			stickerUpdate: true,

			// Server Events
			serverUpdate: true,
			boostAdd: true,
			boostRemove: true,
			inviteCreate: true,
			inviteDelete: true,
			botAdd: true,

			// Voice Events
			voiceJoin: true,
			voiceLeave: true,
			voiceMove: true,
			voiceMute: true,
			voiceDeafen: true,

			// Mod Events
			modBan: true,
			modKick: true,
			modMute: true,
			modUnmute: true,
			modImute: true,
			modIunmute: true,
			modRmute: true,
			modRunmute: true,
			modWarn: true,
			modSoftban: true,
			modTempban: true,
			modUnban: true,
			modDetain: true,
			modRelease: true,
			modForcenick: true,
			modRaidwipe: true,
			modMassAction: true,
			modTemprole: true,
			modClear: true,
			modClearwarnings: true,
			modLock: true,
			modUnlock: true,
			modHide: true,
			modUnhide: true,
			modSlowmode: true,
			modNuke: true,
			modVoidstaff: true,
			modNoteAdd: true,
			modNoteRemove: true,
			modNoteClear: true,
			modThreadLock: true,
			modThreadUnlock: true,
			modChannelTopic: true,
			modRoleAdd: true,
			modRoleRemove: true,
			automodAction: true
		},
		ignore: {
			channels: [],
			roles: [],
			users: [],
			bots: false
		},
		retention: {
			enabled: true,
			days: 30,
			maxEvents: 10000
		}
	};
}

/**
 * Get the category for a specific event type
 */
export function getCategoryForEvent(eventType) {
	for (const [category, events] of Object.entries(LOG_CATEGORIES)) {
		if (events.includes(eventType)) {
			return category;
		}
	}
	return 'message'; // Default fallback
}

/**
 * Get the log channel for an event type
 */
export async function getLogChannel(client, guildId, eventType) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData?.logging?.enabled) {
		return null;
	}

	const config = guildData.logging;
	
	// Check if event is enabled - auto-enable new events if any event in same category is enabled
	const category = getCategoryForEvent(eventType);
	
	if (!config.events?.[eventType]) {
		// Auto-enable new events if other events in the same category are already enabled
		const hasAnyCategoryEvent = LOG_CATEGORIES[category]?.some(e => config.events?.[e]);
		if (hasAnyCategoryEvent) {
			// Auto-enable this event
			if (!config.events) config.events = {};
			config.events[eventType] = true;
			await client.db.updateOne(
				{ guildId },
				{ $set: { [`logging.events.${eventType}`]: true } }
			);
			console.log(`[Logging] Auto-enabled new ${category} event: ${eventType}`);
		} else {
			return null;
		}
	}
	
	// Check for category-specific channel first, then combined
	const channelId = config.channels?.[category] || config.channels?.combined;
	if (!channelId) {
		return null;
	}

	const guild = client.guilds.cache.get(guildId);
	if (!guild) return null;

	return guild.channels.cache.get(channelId);
}

/**
 * Check if logging should be ignored for this context
 */
export async function shouldIgnore(client, guildId, context) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData?.logging?.ignore) return false;

	const ignore = guildData.logging.ignore;

	// Check if specific bot is in ignore list
	if (context.user?.bot && context.user?.id && ignore.specificBots?.includes(context.user.id)) return true;

	// Check if all bots should be ignored
	if (ignore.bots && context.user?.bot) return true;

	// Check if user is in ignore list
	if (context.user?.id && ignore.users?.includes(context.user.id)) return true;

	// Check if channel is in ignore list
	if (context.channel?.id && ignore.channels?.includes(context.channel.id)) return true;

	// Check if user has any ignored role
	if (context.member?.roles?.cache) {
		const memberRoles = [...context.member.roles.cache.keys()];
		if (memberRoles.some(roleId => ignore.roles?.includes(roleId))) return true;
	}

	return false;
}

/**
 * Create a beautiful log container using v2 components
 */
export function createLogContainer(eventType, data) {
	const icon = EVENT_ICONS[eventType] || '📋';
	const title = EVENT_TITLES[eventType] || 'Event Logged';

	const container = new ContainerBuilder();
	
	// Title with icon
	container.addTextDisplayComponents(text => 
		text.setContent(`# ${icon} ${title}`)
	);
	
	container.addSeparatorComponents(sep => 
		sep.setSpacing(SeparatorSpacingSize.Small)
	);

	// Build main info section
	const infoLines = [];

	// Executor (no ping)
	if (data.executor) {
		const executorTag = data.executor.tag || data.executor.user?.tag || data.executor.username || 'Unknown';
		const executorId = data.executor.id || data.executor.user?.id || 'Unknown';
		infoLines.push(`**${EMOJIS.members} Executor:** ${executorTag} (ID: ${executorId})`);
	}

	// Target (no ping)
	if (data.target) {
		const targetTag = data.target.tag || data.target.user?.tag || data.target.name || data.target.username || 'Unknown';
		const targetId = data.target.id || data.target.user?.id;
		if (targetId) {
			infoLines.push(`**🎯 Target:** ${targetTag} (ID: ${targetId})`);
		} else {
			infoLines.push(`**🎯 Target:** ${targetTag}`);
		}
	}

	// Channel
	if (data.channel) {
		const channelId = data.channel.id || data.channel;
		infoLines.push(`**${EMOJIS.channels} Channel:** <#${channelId}>`);
	}

	// Role (for role events)
	if (data.role) {
		const roleName = data.role.name || 'Unknown Role';
		const roleId = data.role.id;
		infoLines.push(`**${EMOJIS.roles} Role:** ${roleName} (<@&${roleId}>)`);
	}

	// Thread (for thread events)
	if (data.thread) {
		const threadName = data.thread.name || 'Unknown Thread';
		const threadId = data.thread.id;
		infoLines.push(`**🧵 Thread:** ${threadName} (<#${threadId}>)`);
	}

	// Roles removed (for voidstaff)
	if (data.rolesRemoved && Array.isArray(data.rolesRemoved)) {
		infoLines.push(`**${EMOJIS.roles} Roles Removed:** ${data.rolesRemoved.join(', ')}`);
	}

	// Note content
	if (data.note) {
		infoLines.push(`**📝 Note:** ${data.note.substring(0, 500)}`);
	}

	// Note count (for notes clear)
	if (data.noteCount) {
		infoLines.push(`**📊 Notes Cleared:** ${data.noteCount}`);
	}

	// Warning count (for clearwarnings)
	if (data.warningCount) {
		infoLines.push(`**⚠️ Warnings Cleared:** ${data.warningCount}`);
	}

	// Previous/New topic (for channel topic change)
	if (data.previousTopic !== undefined) {
		infoLines.push(`**${EMOJIS.previous} Previous Topic:** ${data.previousTopic || '(none)'}`);
	}
	if (data.newTopic !== undefined) {
		infoLines.push(`**${EMOJIS.next} New Topic:** ${data.newTopic || '(none)'}`);
	}

	// Previous/New nickname (for nick command)
	if (data.previousNickname !== undefined) {
		infoLines.push(`**${EMOJIS.previous} Previous Nickname:** ${data.previousNickname || '(none)'}`);
	}
	if (data.newNickname !== undefined) {
		infoLines.push(`**${EMOJIS.next} New Nickname:** ${data.newNickname || '(none)'}`);
	}

	// Clear type (for clear command)
	if (data.clearType) {
		infoLines.push(`**🗑️ Clear Type:** ${data.clearType}`);
	}

	// Case info (for delcase, reason commands)
	if (data.caseId) {
		infoLines.push(`**📋 Case ID:** #${data.caseId}`);
	}
	if (data.caseType) {
		infoLines.push(`**📝 Case Type:** ${data.caseType}`);
	}
	if (data.oldReason) {
		infoLines.push(`**${EMOJIS.previous} Old Reason:** ${data.oldReason.substring(0, 300)}`);
	}
	if (data.newReason) {
		infoLines.push(`**${EMOJIS.next} New Reason:** ${data.newReason.substring(0, 300)}`);
	}

	// Time window (for raidwipe)
	if (data.timeWindow) {
		infoLines.push(`**⏱️ Time Window:** ${data.timeWindow}`);
	}

	// Details (for mass action, raidwipe, etc.)
	if (data.details) {
		infoLines.push(`**📋 Details:** ${data.details}`);
	}

	// Duration
	if (data.duration) {
		// Format duration if it's a number (ms)
		let durationStr = data.duration;
		if (typeof data.duration === 'number') {
			const seconds = Math.floor(data.duration / 1000);
			const minutes = Math.floor(seconds / 60);
			const hours = Math.floor(minutes / 60);
			const days = Math.floor(hours / 24);
			if (days > 0) durationStr = `${days}d ${hours % 24}h`;
			else if (hours > 0) durationStr = `${hours}h ${minutes % 60}m`;
			else if (minutes > 0) durationStr = `${minutes}m ${seconds % 60}s`;
			else durationStr = `${seconds}s`;
		}
		infoLines.push(`**${EMOJIS.duration} Duration:** ${durationStr}`);
	}

	// Count
	if (data.count) {
		infoLines.push(`**${EMOJIS.commands} Count:** ${data.count}`);
	}

	// Reason
	if (data.reason) {
		infoLines.push(`**📝 Reason:** ${data.reason.substring(0, 500)}`);
	}

	// Content
	if (data.content) {
		infoLines.push(`**${EMOJIS.logMessage} Content:**\n${data.content.substring(0, 1000)}`);
	}

	// Roles added/removed
	if (data.roles) {
		infoLines.push(`**${EMOJIS.roles} Roles:**\n${data.roles.substring(0, 1000)}`);
	}

	// Emoji name (for emoji events)
	if (data.emojiName) {
		infoLines.push(`**😀 Emoji:** \`:${data.emojiName}:\`${data.emojiPreview ? ` ${data.emojiPreview}` : ''}`);
	}

	// Emoji name change (old -> new)
	if (data.oldName && data.newName) {
		infoLines.push(`**😀 Name Changed:**\n\`:${data.oldName}:\` → \`:${data.newName}:\`${data.emojiPreview ? `\n**Preview:** ${data.emojiPreview}` : ''}`);
	}

	// Before/After changes (skip if we have oldName/newName for emoji)
	if (data.before !== undefined && data.after !== undefined && !data.oldName) {
		const beforeStr = String(data.before || '*None*').substring(0, 500);
		const afterStr = String(data.after || '*None*').substring(0, 500);
		infoLines.push(`**${EMOJIS.previous} Before:** ${beforeStr}\n**${EMOJIS.next} After:** ${afterStr}`);
	}

	// Changes array (for role/channel updates)
	if (data.changes && data.changes.length > 0) {
		infoLines.push(`**${EMOJIS.log} Changes:**\n${data.changes.join('\n').substring(0, 1000)}`);
	}

	// Permissions
	if (data.permissions) {
		infoLines.push(`**${EMOJIS.security} Permissions:**\n${data.permissions.substring(0, 1000)}`);
	}

	// Attachments
	if (data.attachments && data.attachments.length > 0) {
		const attachmentList = data.attachments.map(a => {
			const size = a.size ? ` (${formatFileSize(a.size)})` : '';
			return `• [${a.name || 'attachment'}](${a.url})${size}`;
		}).join('\n').substring(0, 800);
		infoLines.push(`**📎 Attachments (${data.attachments.length}):**\n${attachmentList}`);
	}

	// Build content sections (consolidate all middle parts)
	const contentSections = [];

	// Add main info with thumbnail accessory
	if (infoLines.length > 0) {
		// Only use section if we have a thumbnail/image to display
		if (data.thumbnail || data.image) {
			container.addSectionComponents(section => {
				section.addTextDisplayComponents(text => 
					text.setContent(infoLines.join('\n'))
				);

				// Add thumbnail as accessory (right side)
				if (data.thumbnail) {
					section.setThumbnailAccessory(thumbnail => 
						thumbnail.setURL(data.thumbnail).setDescription('Event thumbnail')
					);
				} else if (data.image) {
					section.setThumbnailAccessory(thumbnail => 
						thumbnail.setURL(data.image).setDescription('Event image')
					);
				}

				return section;
			});
		} else {
			// No thumbnail, just add text display normally
			container.addTextDisplayComponents(text => 
				text.setContent(infoLines.join('\n'))
			);
		}
	}

	// Add action buttons if provided
	if (data.transcriptUrl || data.hasTranscript || data.transcriptBuffer || data.viewUrl) {
		container.addSeparatorComponents(sep => 
			sep.setSpacing(SeparatorSpacingSize.Small)
		);

		const buttons = [];
		
		// Transcript button - use custom ID for interaction
		if (data.hasTranscript || data.transcriptUrl || data.transcriptBuffer) {
			buttons.push(
				new ButtonBuilder()
					.setLabel('📄 Download Transcript')
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`transcript_download_${data.transcriptId || 'default'}`)
			);
		}

		if (data.viewUrl) {
			buttons.push(
				new ButtonBuilder()
					.setLabel('👁️ View Details')
					.setStyle(ButtonStyle.Link)
					.setURL(data.viewUrl)
			);
		}

		if (buttons.length > 0) {
			container.addActionRowComponents(actionRow => {
				buttons.forEach(btn => actionRow.addComponents(btn));
				return actionRow;
			});
		}
	}

	container.addSeparatorComponents(sep => 
		sep.setSpacing(SeparatorSpacingSize.Small)
	);

	// Footer info
	const footerParts = [];
	if (data.messageId) footerParts.push(`${EMOJIS.id} Message ID: ${data.messageId}`);
	if (data.userId) footerParts.push(`${EMOJIS.members} User ID: ${data.userId}`);
	if (data.channelId) footerParts.push(`${EMOJIS.channels} Channel ID: ${data.channelId}`);
	if (data.roleId) footerParts.push(`${EMOJIS.roles} Role ID: ${data.roleId}`);
	
	const timestamp = new Date().toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	});
	
	footerParts.push(`${EMOJIS.date} ${timestamp}`);
	
	container.addTextDisplayComponents(text => 
		text.setContent(`-# ${footerParts.join(' • ')}`)
	);

	return container;
}

/**
 * Create a beautiful log embed (legacy - kept for fallback)
 */
export function createLogEmbed(eventType, data) {
	const category = getCategoryForEvent(eventType);
	const icon = EVENT_ICONS[eventType] || '📋';
	const title = EVENT_TITLES[eventType] || 'Event Logged';
	const color = CATEGORY_COLORS[category] || 0x7289da;

	const embed = new EmbedBuilder()
		.setTitle(`${icon} ${title}`)
		.setColor(color)
		.setTimestamp();

	// Add fields based on data
	if (data.executor) {
		embed.addFields({
			name: '👤 Executor',
			value: `${data.executor.tag || data.executor.user?.tag || 'Unknown'} (<@${data.executor.id || data.executor.user?.id}>)`,
			inline: true
		});
	}

	if (data.target) {
		const targetDisplay = data.target.tag || data.target.user?.tag || data.target.name || 'Unknown';
		const targetId = data.target.id || data.target.user?.id;
		embed.addFields({
			name: '🎯 Target',
			value: targetId ? `${targetDisplay} (<@${targetId}>)` : targetDisplay,
			inline: true
		});
	}

	if (data.channel) {
		embed.addFields({
			name: '📍 Channel',
			value: `<#${data.channel.id || data.channel}>`,
			inline: true
		});
	}

	if (data.reason) {
		embed.addFields({
			name: '📝 Reason',
			value: data.reason.substring(0, 1024),
			inline: false
		});
	}

	if (data.before !== undefined && data.after !== undefined) {
		const beforeStr = String(data.before || '*None*').substring(0, 1024);
		const afterStr = String(data.after || '*None*').substring(0, 1024);
		embed.addFields(
			{ name: '⬅️ Before', value: beforeStr, inline: true },
			{ name: '➡️ After', value: afterStr, inline: true }
		);
	}

	if (data.content) {
		embed.addFields({
			name: '💬 Content',
			value: data.content.substring(0, 1024),
			inline: false
		});
	}

	if (data.duration) {
		embed.addFields({
			name: '⏱️ Duration',
			value: data.duration,
			inline: true
		});
	}

	if (data.count) {
		embed.addFields({
			name: '🔢 Count',
			value: String(data.count),
			inline: true
		});
	}

	if (data.roles) {
		embed.addFields({
			name: '🏷️ Roles',
			value: data.roles.substring(0, 1024),
			inline: false
		});
	}

	if (data.permissions) {
		embed.addFields({
			name: '🔑 Permissions',
			value: data.permissions.substring(0, 1024),
			inline: false
		});
	}

	if (data.attachments && data.attachments.length > 0) {
		const imageAttachment = data.attachments.find(a => 
			a.contentType?.startsWith('image/') || 
			/\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || a.url)
		);
		
		// Set the first image as the embed image
		if (imageAttachment) {
			embed.setImage(imageAttachment.url);
		}
		
		// List all attachments
		const attachmentList = data.attachments.map(a => {
			const size = a.size ? ` (${formatFileSize(a.size)})` : '';
			return `[${a.name || 'attachment'}](${a.url})${size}`;
		}).join('\n').substring(0, 1024);
		
		embed.addFields({
			name: `📎 Attachments (${data.attachments.length})`,
			value: attachmentList,
			inline: false
		});
	}

	// Set thumbnail if available
	if (data.thumbnail) {
		embed.setThumbnail(data.thumbnail);
	}

	// Set footer with additional info
	const footerParts = [];
	if (data.messageId) footerParts.push(`Message ID: ${data.messageId}`);
	if (data.userId) footerParts.push(`User ID: ${data.userId}`);
	if (data.channelId) footerParts.push(`Channel ID: ${data.channelId}`);
	if (data.roleId) footerParts.push(`Role ID: ${data.roleId}`);
	
	if (footerParts.length > 0) {
		embed.setFooter({ text: footerParts.join(' • ') });
	}

	return embed;
}

/**
 * Send a log to the appropriate channel
 */
export async function sendLog(client, guildId, eventType, data) {
	try {
		// Check if we should ignore this log
		if (await shouldIgnore(client, guildId, data)) return false;

		const logChannel = await getLogChannel(client, guildId, eventType);
		if (!logChannel) return false;

		// Store transcript buffer for later retrieval via button
		if (data.files && data.files.length > 0) {
			const transcriptFile = data.files[0];
			// Create a unique ID for this transcript
			const transcriptId = `transcript_${guildId}_${Date.now()}`;
			data.transcriptId = transcriptId;
			data.hasTranscript = true;
			
			// Store in a Map for retrieval (with 1 hour expiry)
			if (!global.transcripts) global.transcripts = new Map();
			global.transcripts.set(transcriptId, {
				buffer: transcriptFile.attachment,
				name: transcriptFile.name,
				description: transcriptFile.description,
				expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
			});
			
			// Clean up expired transcripts
			for (const [id, data] of global.transcripts.entries()) {
				if (Date.now() > data.expiresAt) {
					global.transcripts.delete(id);
				}
			}
		}

		// Create the main log container
		const container = createLogContainer(eventType, data);

		const messageOptions = { 
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		};

		// Send the log message WITHOUT files (they're stored in memory)
		await logChannel.send(messageOptions);

		// Store in database for retention/search
		await storeLog(client, guildId, eventType, data);

		return true;
	} catch (error) {
		console.error(`[Logging] Error sending log for ${eventType}:`, error);
		return false;
	}
}

/**
 * Store log in database for retention and search
 */
async function storeLog(client, guildId, eventType, data) {
	try {
		const guildData = await client.db.findOne({ guildId }) || {};
		
		if (!guildData.logs) guildData.logs = [];

		const logEntry = {
			id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
			eventType,
			timestamp: Date.now(),
			data: sanitizeLogData(data)
		};

		guildData.logs.push(logEntry);

		// Apply retention limits
		const retention = guildData.logging?.retention || { maxEvents: 10000, days: 30 };
		
		// Limit by count
		if (guildData.logs.length > retention.maxEvents) {
			guildData.logs = guildData.logs.slice(-retention.maxEvents);
		}

		// Limit by age
		if (retention.days) {
			const cutoff = Date.now() - (retention.days * 24 * 60 * 60 * 1000);
			guildData.logs = guildData.logs.filter(log => log.timestamp > cutoff);
		}

		await client.db.updateOne({ guildId }, { $set: { logs: guildData.logs } });
	} catch (error) {
		console.error('[Logging] Error storing log:', error);
	}
}

/**
 * Sanitize log data for database storage
 */
function sanitizeLogData(data) {
	const sanitized = {};

	for (const [key, value] of Object.entries(data)) {
		if (value === null || value === undefined) continue;

		if (typeof value === 'object' && value.id) {
			// Extract IDs from Discord objects
			sanitized[key] = {
				id: value.id,
				name: value.name || value.tag || value.username || null
			};
		} else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			sanitized[key] = value;
		} else if (Array.isArray(value)) {
			sanitized[key] = value.map(v => {
				if (typeof v === 'object' && v.id) {
					return { id: v.id, name: v.name || v.tag || null };
				}
				return v;
			});
		}
	}

	return sanitized;
}

/**
 * Search logs in database
 */
export async function searchLogs(client, guildId, options = {}) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData?.logs) return [];

	let logs = [...guildData.logs];

	// Filter by event type
	if (options.eventType) {
		logs = logs.filter(log => log.eventType === options.eventType);
	}

	// Filter by category
	if (options.category) {
		const categoryEvents = LOG_CATEGORIES[options.category] || [];
		logs = logs.filter(log => categoryEvents.includes(log.eventType));
	}

	// Filter by user
	if (options.userId) {
		logs = logs.filter(log => 
			log.data?.target?.id === options.userId ||
			log.data?.executor?.id === options.userId ||
			log.data?.userId === options.userId
		);
	}

	// Filter by channel
	if (options.channelId) {
		logs = logs.filter(log => 
			log.data?.channel?.id === options.channelId ||
			log.data?.channelId === options.channelId
		);
	}

	// Filter by keyword
	if (options.keyword) {
		const keyword = options.keyword.toLowerCase();
		logs = logs.filter(log => {
			const content = log.data?.content?.toLowerCase() || '';
			const before = log.data?.before?.toLowerCase() || '';
			const after = log.data?.after?.toLowerCase() || '';
			const reason = log.data?.reason?.toLowerCase() || '';
			return content.includes(keyword) || before.includes(keyword) || after.includes(keyword) || reason.includes(keyword);
		});
	}

	// Filter by time range
	if (options.after) {
		logs = logs.filter(log => log.timestamp > options.after);
	}
	if (options.before) {
		logs = logs.filter(log => log.timestamp < options.before);
	}

	// Sort by timestamp (newest first)
	logs.sort((a, b) => b.timestamp - a.timestamp);

	// Limit results
	if (options.limit) {
		logs = logs.slice(0, options.limit);
	}

	return logs;
}

/**
 * Export logs to JSON format
 */
export async function exportLogs(client, guildId, options = {}) {
	const logs = await searchLogs(client, guildId, options);
	return JSON.stringify(logs, null, 2);
}

/**
 * Purge logs from database
 */
export async function purgeLogs(client, guildId, options = {}) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData?.logs) return 0;

	let logsToKeep = [...guildData.logs];
	const originalCount = logsToKeep.length;

	// Filter by event type
	if (options.eventType) {
		logsToKeep = logsToKeep.filter(log => log.eventType !== options.eventType);
	}

	// Filter by category
	if (options.category) {
		const categoryEvents = LOG_CATEGORIES[options.category] || [];
		logsToKeep = logsToKeep.filter(log => !categoryEvents.includes(log.eventType));
	}

	// Filter by age
	if (options.olderThan) {
		logsToKeep = logsToKeep.filter(log => log.timestamp > options.olderThan);
	}

	// Purge all if specified
	if (options.all) {
		logsToKeep = [];
	}

	await client.db.updateOne({ guildId }, { $set: { logs: logsToKeep } });

	return originalCount - logsToKeep.length;
}

/**
 * Get logging statistics
 */
export async function getLoggingStats(client, guildId) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData?.logs) return { total: 0, byCategory: {}, byEvent: {} };

	const logs = guildData.logs;
	const stats = {
		total: logs.length,
		byCategory: {},
		byEvent: {},
		oldestLog: logs.length > 0 ? Math.min(...logs.map(l => l.timestamp)) : null,
		newestLog: logs.length > 0 ? Math.max(...logs.map(l => l.timestamp)) : null
	};

	for (const log of logs) {
		// Count by event
		stats.byEvent[log.eventType] = (stats.byEvent[log.eventType] || 0) + 1;

		// Count by category
		const category = getCategoryForEvent(log.eventType);
		stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
	}

	return stats;
}

/**
 * Utility to fetch audit log executor
 */
export async function fetchAuditLogExecutor(guild, type, targetId, timeThreshold = 10000) {
	try {
		// Map audit log event types to command action types
		const auditLogToCommandMap = {
			[AuditLogEvent.MessageBulkDelete]: 'delete',
			[AuditLogEvent.MemberUpdate]: 'nick',
			[AuditLogEvent.MemberKick]: 'kick',
			[AuditLogEvent.MemberBanAdd]: 'ban',
			[AuditLogEvent.MemberBanRemove]: 'unban',
			[AuditLogEvent.MemberRoleUpdate]: 'role',
			[AuditLogEvent.ChannelUpdate]: 'channeltopic',
			[AuditLogEvent.RoleCreate]: 'rolecreate',
			[AuditLogEvent.RoleDelete]: 'roledelete',
			[AuditLogEvent.RoleUpdate]: 'roleedit',
			[AuditLogEvent.ThreadUpdate]: 'threadlock',
		};

		// First, check if we have a command invoker marked for this action
		const commandActionType = auditLogToCommandMap[type] || type;
		let commandInvoker = getCommandInvoker(guild.id, commandActionType, targetId);
		
		// Try alternate action types for role updates
		if (!commandInvoker && type === AuditLogEvent.MemberRoleUpdate) {
			commandInvoker = getCommandInvoker(guild.id, 'roleadd', targetId) ||
							 getCommandInvoker(guild.id, 'roleremove', targetId) ||
							 getCommandInvoker(guild.id, 'rolebots', targetId) ||
							 getCommandInvoker(guild.id, 'rolehumans', targetId) ||
							 getCommandInvoker(guild.id, 'rolebotsremove', targetId) ||
							 getCommandInvoker(guild.id, 'rolehumansremove', targetId) ||
							 getCommandInvoker(guild.id, 'temprole', targetId) ||
							 getCommandInvoker(guild.id, 'cascade', targetId) ||
							 getCommandInvoker(guild.id, 'rolerestore', targetId);
		}

		// Try alternate action types for role updates (color, hoist, etc.)
		if (!commandInvoker && type === AuditLogEvent.RoleUpdate) {
			commandInvoker = getCommandInvoker(guild.id, 'rolecolor', targetId) ||
							 getCommandInvoker(guild.id, 'rolecolorgradient', targetId) ||
							 getCommandInvoker(guild.id, 'roletopcolor', targetId) ||
							 getCommandInvoker(guild.id, 'rolehoist', targetId) ||
							 getCommandInvoker(guild.id, 'roleicon', targetId) ||
							 getCommandInvoker(guild.id, 'rolementionable', targetId);
		}

		// Try alternate action types for thread updates
		if (!commandInvoker && type === AuditLogEvent.ThreadUpdate) {
			commandInvoker = getCommandInvoker(guild.id, 'threadunlock', targetId);
		}

		// Try alternate for nick (forcenickname)
		if (!commandInvoker && type === AuditLogEvent.MemberUpdate) {
			commandInvoker = getCommandInvoker(guild.id, 'forcenickname', targetId);
		}

		if (commandInvoker) {
			return commandInvoker;
		}

		// Small delay to allow audit log to be created
		await new Promise(resolve => setTimeout(resolve, 500));
		
		const auditLogs = await guild.fetchAuditLogs({
			limit: 10,
			type
		});

		if (auditLogs.entries.size === 0) {
			return null;
		}

		// For bulk delete, just get the most recent entry since Discord doesn't provide proper targeting
		if (type === AuditLogEvent.MessageBulkDelete) {
			const recentEntry = auditLogs.entries.first();
			if (recentEntry && Date.now() - recentEntry.createdTimestamp < timeThreshold) {
				return recentEntry.executor || null;
			}
			return null;
		}

		// For other events, try to match by target ID
		const entry = auditLogs.entries.find(e => {
			const timeDiff = Date.now() - e.createdTimestamp;
			const targetMatch = e.target?.id === targetId || e.targetId === targetId;
			return timeDiff < timeThreshold && targetMatch;
		});

		// If no exact match, try to find the most recent entry within time threshold
		if (!entry) {
			const recentEntry = auditLogs.entries.find(e => {
				const timeDiff = Date.now() - e.createdTimestamp;
				return timeDiff < timeThreshold;
			});
			return recentEntry?.executor || null;
		}

		return entry?.executor || null;
	} catch (error) {
		console.error('[Logging] Error fetching audit log:', error);
		return null;
	}
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	let unitIndex = 0;
	let size = bytes;
	
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	
	return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format permission changes for logging
 */
export function formatPermissionChanges(oldPerms, newPerms) {
	const changes = [];
	
	const allPerms = new Set([
		...Object.keys(oldPerms || {}),
		...Object.keys(newPerms || {})
	]);

	for (const perm of allPerms) {
		const oldVal = oldPerms?.[perm];
		const newVal = newPerms?.[perm];
		
		if (oldVal !== newVal) {
			const oldStr = oldVal === true ? '✅' : oldVal === false ? '❌' : '➖';
			const newStr = newVal === true ? '✅' : newVal === false ? '❌' : '➖';
			changes.push(`${perm}: ${oldStr} → ${newStr}`);
		}
	}

	return changes.length > 0 ? changes.join('\n') : 'No changes';
}

/**
 * Format duration for display
 */
export function formatDuration(ms) {
	if (!ms) return 'Permanent';
	
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}

/**
 * Get channel type string
 */
export function getChannelTypeString(type) {
	const types = {
		[ChannelType.GuildText]: 'Text Channel',
		[ChannelType.GuildVoice]: 'Voice Channel',
		[ChannelType.GuildCategory]: 'Category',
		[ChannelType.GuildAnnouncement]: 'Announcement Channel',
		[ChannelType.GuildStageVoice]: 'Stage Channel',
		[ChannelType.GuildForum]: 'Forum Channel',
		[ChannelType.GuildMedia]: 'Media Channel',
		[ChannelType.PublicThread]: 'Public Thread',
		[ChannelType.PrivateThread]: 'Private Thread',
		[ChannelType.AnnouncementThread]: 'Announcement Thread'
	};
	return types[type] || 'Unknown';
}

export default {
	LOG_EVENTS,
	LOG_CATEGORIES,
	CATEGORY_NAMES,
	getDefaultLoggingConfig,
	getCategoryForEvent,
	getLogChannel,
	shouldIgnore,
	createLogEmbed,
	sendLog,
	searchLogs,
	exportLogs,
	purgeLogs,
	getLoggingStats,
	fetchAuditLogExecutor,
	formatPermissionChanges,
	formatDuration,
	getChannelTypeString
};
