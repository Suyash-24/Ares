import { ChannelType } from 'discord.js';

/**
 * Stats Manager v2 - Robust Activity Tracking
 * 
 * Key improvements over v1:
 * 1. Uses atomic increments ($inc) instead of array pushes - prevents race conditions
 * 2. Stores user totals as simple numbers instead of timestamp arrays - smaller documents
 * 3. Daily aggregates for time-based filtering - "last 14 days" still works
 * 4. Backward compatible - migrates old data automatically
 */

// Default stats structure for a guild
export const DEFAULT_STATS = {
	enabled: true,
	lookback: 14, // days
	tracking: {
		messages: true,
		voice: true,
		joins: true
	},
	users: {},      // userId -> { messages: number, voiceMinutes: number, lastActive: timestamp }
	channels: {},   // channelId -> { messages: number, voiceMinutes: number }
	daily: {},      // YYYY-MM-DD -> { messages, voice, joins, leaves }
	invites: {}     // inviterId -> { regular, left, fake, bonus, invited: [] }
};

const cloneDefaultStats = () => JSON.parse(JSON.stringify(DEFAULT_STATS));

/**
 * Get today's date key (YYYY-MM-DD)
 */
export function getTodayKey() {
	return new Date().toISOString().split('T')[0];
}

/**
 * Get date key for N days ago
 */
export function getDateKey(daysAgo = 0) {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString().split('T')[0];
}

/**
 * Ensure stats config exists for a guild
 * IMPORTANT: This function is designed to NEVER overwrite existing data
 */
export async function ensureStatsConfig(db, guildId) {
	// First, try to get existing record
	const record = await db.findOne({ guildId });
	
	// If we have existing stats, migrate if needed and return
	if (record?.stats) {
		const stats = record.stats;
		
		// Ensure all keys exist (non-destructive)
		if (!stats.users) stats.users = {};
		if (!stats.channels) stats.channels = {};
		if (!stats.daily) stats.daily = {};
		if (!stats.tracking) stats.tracking = { messages: true, voice: true, joins: true };
		if (typeof stats.lookback !== 'number') stats.lookback = 14;
		if (typeof stats.enabled !== 'boolean') stats.enabled = true;
		if (!stats.invites) stats.invites = {};
		
		// Migrate old array-based data to new counter-based format
		let needsMigration = false;
		for (const userId of Object.keys(stats.users)) {
			const user = stats.users[userId];
			
			// Check if this is old format (has messages array)
			if (Array.isArray(user.messages)) {
				stats.users[userId] = {
					messages: user.messages.length,
					voiceMinutes: Array.isArray(user.voice) 
						? user.voice.reduce((sum, v) => sum + (v.mins || 0), 0) 
						: (user.voiceMinutes || 0),
					lastActive: user.messages.length > 0 
						? user.messages[user.messages.length - 1]?.ts || Date.now()
						: Date.now(),
					// Preserve invite tracking data
					invitedBy: user.invitedBy,
					inviteCode: user.inviteCode
				};
				needsMigration = true;
			}
		}
		
		// Migrate old channel format
		for (const channelId of Object.keys(stats.channels)) {
			const channel = stats.channels[channelId];
			if (Array.isArray(channel.messages)) {
				stats.channels[channelId] = {
					messages: channel.messages.length,
					voiceMinutes: Array.isArray(channel.voice)
						? channel.voice.reduce((sum, v) => sum + (v.mins || 0), 0)
						: (channel.voiceMinutes || 0)
				};
				needsMigration = true;
			}
		}
		
		if (needsMigration) {
			console.log(`[Stats] Migrated old array-based format to counters for guild ${guildId}`);
			await db.updateOne({ guildId }, { $set: { stats } });
		}
		
		return stats;
	}
	
	// No stats found - but DOUBLE CHECK before creating defaults
	const recheck = await db.findOne({ guildId });
	if (recheck?.stats) {
		console.log(`[Stats] Race condition prevented for guild ${guildId} - stats already exist`);
		return recheck.stats;
	}
	
	// Safe to create defaults
	const defaults = cloneDefaultStats();
	
	try {
		await db.updateOne({ guildId }, { $set: { stats: defaults } });
		console.log(`[Stats] Initialized new stats config for guild ${guildId}`);
	} catch (err) {
		console.error(`[Stats] Failed to initialize stats for guild ${guildId}:`, err.message);
	}
	
	return defaults;
}

/**
 * Record a message for stats using atomic increments
 * This is the key improvement - no race conditions!
 */
export async function recordMessage(db, guildId, userId, channelId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.messages) return;

	const today = getTodayKey();
	const timestamp = Date.now();
	
	// Build atomic update operations
	const updateOps = {
		// Increment user message count
		[`stats.users.${userId}.messages`]: 1,
		// Update last active timestamp (using max to always keep latest)
		// Increment channel message count
		[`stats.channels.${channelId}.messages`]: 1,
		// Increment daily stat
		[`stats.daily.${today}.messages`]: 1
	};
	
	// Use $inc for atomic increments - no race conditions!
	await db.updateOne({ guildId }, { 
		$inc: updateOps,
		$set: { [`stats.users.${userId}.lastActive`]: timestamp }
	});
}

/**
 * Record voice session time using atomic increments
 */
export async function recordVoiceTime(db, guildId, userId, channelId, durationMs) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.voice) return;

	const today = getTodayKey();
	const timestamp = Date.now();
	const minutes = Math.floor(durationMs / 60000);

	if (minutes < 1) return; // Only record if at least 1 minute

	// Build atomic update operations
	const updateOps = {
		[`stats.users.${userId}.voiceMinutes`]: minutes,
		[`stats.channels.${channelId}.voiceMinutes`]: minutes,
		[`stats.daily.${today}.voice`]: minutes
	};

	await db.updateOne({ guildId }, { 
		$inc: updateOps,
		$set: { [`stats.users.${userId}.lastActive`]: timestamp }
	});
}

/**
 * Record member join
 */
export async function recordJoin(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();

	await db.updateOne({ guildId }, { 
		$inc: { [`stats.daily.${today}.joins`]: 1 }
	});
}

/**
 * Record member leave
 */
export async function recordLeave(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();

	await db.updateOne({ guildId }, { 
		$inc: { [`stats.daily.${today}.leaves`]: 1 }
	});
}

/**
 * Clean up old stats data (beyond lookback period)
 * Now only cleans daily data since user/channel data is cumulative
 */
export async function cleanupOldStats(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	const cutoffDate = getDateKey(stats.lookback);
	
	// Only clean daily stats that are beyond lookback
	let hasChanges = false;
	for (const dateKey of Object.keys(stats.daily || {})) {
		if (dateKey < cutoffDate) {
			delete stats.daily[dateKey];
			hasChanges = true;
		}
	}

	if (hasChanges) {
		await db.updateOne({ guildId }, { $set: { 'stats.daily': stats.daily } });
	}
}

/**
 * Get user stats - now uses simple counters
 */
export function getUserStats(stats, userId, days = null) {
	const user = stats.users?.[userId];

	if (!user) {
		return { messages: 0, voiceMinutes: 0, rank: null };
	}

	// Return cumulative stats (no time filtering on user level anymore)
	// Time filtering is done via daily aggregates for charts
	return { 
		messages: user.messages || 0, 
		voiceMinutes: user.voiceMinutes || 0 
	};
}

/**
 * Get channel stats
 */
export function getChannelStats(stats, channelId, days = null) {
	const channel = stats.channels?.[channelId];

	if (!channel) {
		return { messages: 0, voiceMinutes: 0, contributors: 0 };
	}

	return { 
		messages: channel.messages || 0, 
		voiceMinutes: channel.voiceMinutes || 0,
		contributors: 0 // Would need separate tracking for this
	};
}

/**
 * Get server-wide stats summary from daily aggregates
 */
export function getServerStats(stats, days = null, activeVoiceMinutes = 0) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoffDate = getDateKey(lookback);

	let totalMessages = 0;
	let totalVoiceMinutes = activeVoiceMinutes;
	let totalJoins = 0;
	let totalLeaves = 0;

	// Sum from daily stats within lookback period
	for (const [dateKey, daily] of Object.entries(stats.daily || {})) {
		if (dateKey >= cutoffDate) {
			totalMessages += daily.messages || 0;
			totalVoiceMinutes += daily.voice || 0;
			totalJoins += daily.joins || 0;
			totalLeaves += daily.leaves || 0;
		}
	}

	// Count active users (anyone with activity)
	const activeUsers = Object.keys(stats.users || {}).length;
	const activeChannels = Object.keys(stats.channels || {}).length;

	return {
		totalMessages,
		totalVoiceMinutes,
		totalJoins,
		totalLeaves,
		activeUsers,
		activeChannels,
		lookback
	};
}

/**
 * Get top users by messages - uses simple sort on counters
 */
export function getTopMessageUsers(stats, limit = 10, days = null) {
	const userMessages = [];
	
	for (const [userId, user] of Object.entries(stats.users || {})) {
		const count = user.messages || 0;
		if (count > 0) {
			userMessages.push({ userId, count });
		}
	}

	return userMessages
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * Get top users by voice time
 */
export function getTopVoiceUsers(stats, limit = 10, days = null) {
	const userVoice = [];
	
	for (const [userId, user] of Object.entries(stats.users || {})) {
		const minutes = user.voiceMinutes || 0;
		if (minutes > 0) {
			userVoice.push({ userId, minutes });
		}
	}

	return userVoice
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, limit);
}

/**
 * Get top channels by messages
 */
export function getTopMessageChannels(stats, limit = 10, days = null) {
	const channelMessages = [];
	
	for (const [channelId, channel] of Object.entries(stats.channels || {})) {
		const count = channel.messages || 0;
		if (count > 0) {
			channelMessages.push({ channelId, count });
		}
	}

	return channelMessages
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}

/**
 * Get top channels by voice time
 */
export function getTopVoiceChannels(stats, limit = 10, days = null) {
	const channelVoice = [];
	
	for (const [channelId, channel] of Object.entries(stats.channels || {})) {
		const minutes = channel.voiceMinutes || 0;
		if (minutes > 0) {
			channelVoice.push({ channelId, minutes });
		}
	}

	return channelVoice
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, limit);
}

/**
 * Get user rank for messages
 */
export function getUserMessageRank(stats, userId, days = null) {
	const topUsers = getTopMessageUsers(stats, 1000, days);
	const idx = topUsers.findIndex(u => u.userId === userId);
	return idx === -1 ? null : idx + 1;
}

/**
 * Get user rank for voice
 */
export function getUserVoiceRank(stats, userId, days = null) {
	const topUsers = getTopVoiceUsers(stats, 1000, days);
	const idx = topUsers.findIndex(u => u.userId === userId);
	return idx === -1 ? null : idx + 1;
}

/**
 * Format voice time nicely
 */
export function formatVoiceTime(minutes) {
	if (minutes < 60) {
		return `${minutes}m`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours < 24) {
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}
	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	if (remainingHours > 0) {
		return `${days}d ${remainingHours}h`;
	}
	return `${days}d`;
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
	return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Get daily breakdown for charts
 */
export function getDailyBreakdown(stats, days = null) {
	const lookback = days ?? stats.lookback ?? 14;
	const breakdown = [];

	// Go from oldest (lookback-1 days ago) to newest (today = 0)
	for (let i = lookback - 1; i >= 0; i--) {
		const dateKey = getDateKey(i);
		const daily = stats.daily?.[dateKey] || { messages: 0, voice: 0, joins: 0, leaves: 0 };
		breakdown.push({
			date: dateKey,
			messages: daily.messages || 0,
			voice: daily.voice || 0,
			joins: daily.joins || 0,
			leaves: daily.leaves || 0
		});
	}

	return breakdown; // [oldest, ..., today]
}

/**
 * Create a simple text-based chart/sparkline using emoji squares
 */
export function createSparkline(values, width = 14) {
	if (!values.length) return '⬜'.repeat(Math.min(width, 14));
	
	const max = Math.max(...values, 1);
	
	const getSquare = (value) => {
		if (value === 0) return '⬜';
		const ratio = value / max;
		if (ratio < 0.25) return '🟦';
		if (ratio < 0.5) return '🟩';
		if (ratio < 0.75) return '🟨';
		return '🟧';
	};
	
	return values.slice(-width).map(getSquare).join('');
}

/**
 * Add messages to a user (for admin commands)
 */
export async function addMessages(db, guildId, userId, count) {
	await db.updateOne({ guildId }, {
		$inc: { [`stats.users.${userId}.messages`]: count }
	});
}

/**
 * Remove messages from a user (for admin commands)
 */
export async function removeMessages(db, guildId, userId, count) {
	const stats = await ensureStatsConfig(db, guildId);
	const currentCount = stats.users?.[userId]?.messages || 0;
	const newCount = Math.max(0, currentCount - count);
	
	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.messages`]: newCount }
	});
	
	return { oldCount: currentCount, newCount };
}

/**
 * Add voice time to a user (for admin commands)
 */
export async function addVoiceTime(db, guildId, userId, minutes) {
	await db.updateOne({ guildId }, {
		$inc: { [`stats.users.${userId}.voiceMinutes`]: minutes }
	});
}

/**
 * Remove voice time from a user (for admin commands)
 */
export async function removeVoiceTime(db, guildId, userId, minutes) {
	const stats = await ensureStatsConfig(db, guildId);
	const currentMinutes = stats.users?.[userId]?.voiceMinutes || 0;
	const newMinutes = Math.max(0, currentMinutes - minutes);
	
	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.voiceMinutes`]: newMinutes }
	});
	
	return { oldMinutes: currentMinutes, newMinutes };
}

/**
 * Reset user messages (for admin commands)
 */
export async function resetUserMessages(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	const oldCount = stats.users?.[userId]?.messages || 0;
	
	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.messages`]: 0 }
	});
	
	return oldCount;
}

/**
 * Reset user voice time (for admin commands)
 */
export async function resetUserVoice(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	const oldMinutes = stats.users?.[userId]?.voiceMinutes || 0;
	
	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.voiceMinutes`]: 0 }
	});
	
	return oldMinutes;
}
