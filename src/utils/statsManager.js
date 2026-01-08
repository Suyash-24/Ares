import { ChannelType } from 'discord.js';

/**
 * Stats Manager - Tracks server activity statistics
 * Tracks messages, voice time, and activity for users and channels
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
	users: {},      // userId -> { messages: [], voice: [], joins: [] }
	channels: {},   // channelId -> { messages: [], voice: [] }
	daily: {}       // YYYY-MM-DD -> { messages, voice, joins, leaves }
};

const cloneDefaultStats = () => JSON.parse(JSON.stringify(DEFAULT_STATS));

/**
 * Ensure stats config exists for a guild
 */
export async function ensureStatsConfig(db, guildId) {
	const record = await db.findOne({ guildId }) || { guildId };
	if (!record?.stats) {
		const defaults = cloneDefaultStats();
		await db.updateOne({ guildId }, { $set: { stats: defaults } });
		return defaults;
	}
	// Ensure all keys exist
	const stats = record.stats;
	if (!stats.users) stats.users = {};
	if (!stats.channels) stats.channels = {};
	if (!stats.daily) stats.daily = {};
	if (!stats.tracking) stats.tracking = { messages: true, voice: true, joins: true };
	if (typeof stats.lookback !== 'number') stats.lookback = 14;
	return stats;
}

/**
 * Get today's date key
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
 * Record a message for stats
 */
export async function recordMessage(db, guildId, userId, channelId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.messages) return;

	const today = getTodayKey();
	const timestamp = Date.now();

	// Initialize user stats
	if (!stats.users[userId]) {
		stats.users[userId] = { messages: [], voice: [], joins: [] };
	}
	stats.users[userId].messages.push({ ts: timestamp, ch: channelId });

	// Initialize channel stats
	if (!stats.channels[channelId]) {
		stats.channels[channelId] = { messages: [], voice: [] };
	}
	stats.channels[channelId].messages.push({ ts: timestamp, u: userId });

	// Daily stats
	if (!stats.daily[today]) {
		stats.daily[today] = { messages: 0, voice: 0, joins: 0, leaves: 0 };
	}
	stats.daily[today].messages++;

	await db.updateOne({ guildId }, { $set: { stats } });
}

/**
 * Record voice session time
 */
export async function recordVoiceTime(db, guildId, userId, channelId, durationMs) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.voice) return;

	const today = getTodayKey();
	const timestamp = Date.now();
	const minutes = Math.floor(durationMs / 60000);

	if (minutes < 1) return; // Only record if at least 1 minute

	// Initialize user stats
	if (!stats.users[userId]) {
		stats.users[userId] = { messages: [], voice: [], joins: [] };
	}
	stats.users[userId].voice.push({ ts: timestamp, ch: channelId, mins: minutes });

	// Initialize channel stats
	if (!stats.channels[channelId]) {
		stats.channels[channelId] = { messages: [], voice: [] };
	}
	stats.channels[channelId].voice.push({ ts: timestamp, u: userId, mins: minutes });

	// Daily stats
	if (!stats.daily[today]) {
		stats.daily[today] = { messages: 0, voice: 0, joins: 0, leaves: 0 };
	}
	stats.daily[today].voice += minutes;

	await db.updateOne({ guildId }, { $set: { stats } });
}

/**
 * Record member join
 */
export async function recordJoin(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();
	const timestamp = Date.now();

	if (!stats.users[userId]) {
		stats.users[userId] = { messages: [], voice: [], joins: [] };
	}
	stats.users[userId].joins.push(timestamp);

	if (!stats.daily[today]) {
		stats.daily[today] = { messages: 0, voice: 0, joins: 0, leaves: 0 };
	}
	stats.daily[today].joins++;

	await db.updateOne({ guildId }, { $set: { stats } });
}

/**
 * Record member leave
 */
export async function recordLeave(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();

	if (!stats.daily[today]) {
		stats.daily[today] = { messages: 0, voice: 0, joins: 0, leaves: 0 };
	}
	stats.daily[today].leaves++;

	await db.updateOne({ guildId }, { $set: { stats } });
}

/**
 * Clean up old stats data (beyond lookback period)
 */
export async function cleanupOldStats(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	const cutoff = Date.now() - (stats.lookback * 24 * 60 * 60 * 1000);
	const cutoffDate = getDateKey(stats.lookback);

	// Clean user stats
	for (const userId of Object.keys(stats.users)) {
		const user = stats.users[userId];
		user.messages = user.messages.filter(m => m.ts > cutoff);
		user.voice = user.voice.filter(v => v.ts > cutoff);
		// Remove users with no activity
		if (!user.messages.length && !user.voice.length && !user.joins?.length) {
			delete stats.users[userId];
		}
	}

	// Clean channel stats
	for (const channelId of Object.keys(stats.channels)) {
		const channel = stats.channels[channelId];
		channel.messages = channel.messages.filter(m => m.ts > cutoff);
		channel.voice = channel.voice.filter(v => v.ts > cutoff);
		// Remove channels with no activity
		if (!channel.messages.length && !channel.voice.length) {
			delete stats.channels[channelId];
		}
	}

	// Clean daily stats
	for (const dateKey of Object.keys(stats.daily)) {
		if (dateKey < cutoffDate) {
			delete stats.daily[dateKey];
		}
	}

	await db.updateOne({ guildId }, { $set: { stats } });
}

/**
 * Get user stats for a specific period
 */
export function getUserStats(stats, userId, days = null) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);
	const user = stats.users?.[userId];

	if (!user) {
		return { messages: 0, voiceMinutes: 0, rank: null };
	}

	const messages = user.messages?.filter(m => m.ts > cutoff).length || 0;
	const voiceMinutes = user.voice?.filter(v => v.ts > cutoff).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;

	return { messages, voiceMinutes };
}

/**
 * Get channel stats for a specific period
 */
export function getChannelStats(stats, channelId, days = null) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);
	const channel = stats.channels?.[channelId];

	if (!channel) {
		return { messages: 0, voiceMinutes: 0, contributors: 0 };
	}

	const messagesFiltered = channel.messages?.filter(m => m.ts > cutoff) || [];
	const voiceFiltered = channel.voice?.filter(v => v.ts > cutoff) || [];

	const messages = messagesFiltered.length;
	const voiceMinutes = voiceFiltered.reduce((sum, v) => sum + (v.mins || 0), 0);

	// Unique contributors
	const uniqueUsers = new Set([
		...messagesFiltered.map(m => m.u),
		...voiceFiltered.map(v => v.u)
	]);

	return { messages, voiceMinutes, contributors: uniqueUsers.size };
}

/**
 * Get server-wide stats summary
 */
export function getServerStats(stats, days = null, activeVoiceMinutes = 0) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);
	const cutoffDate = getDateKey(lookback);

	let totalMessages = 0;
	let totalVoiceMinutes = activeVoiceMinutes; // Start with active session time
	let activeUsers = new Set();
	let activeChannels = new Set();

	// Sum from daily stats
	for (const [dateKey, daily] of Object.entries(stats.daily || {})) {
		if (dateKey >= cutoffDate) {
			totalMessages += daily.messages || 0;
			totalVoiceMinutes += daily.voice || 0;
		}
	}

	// Count active users and channels
	for (const [userId, user] of Object.entries(stats.users || {})) {
		const hasActivity = 
			(user.messages?.some(m => m.ts > cutoff)) ||
			(user.voice?.some(v => v.ts > cutoff));
		if (hasActivity) activeUsers.add(userId);
	}

	for (const [channelId, channel] of Object.entries(stats.channels || {})) {
		const hasActivity = 
			(channel.messages?.some(m => m.ts > cutoff)) ||
			(channel.voice?.some(v => v.ts > cutoff));
		if (hasActivity) activeChannels.add(channelId);
	}

	return {
		totalMessages,
		totalVoiceMinutes,
		activeUsers: activeUsers.size,
		activeChannels: activeChannels.size,
		lookback
	};
}

/**
 * Get top users by messages
 */
export function getTopMessageUsers(stats, limit = 10, days = null) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	const userMessages = [];
	for (const [userId, user] of Object.entries(stats.users || {})) {
		const count = user.messages?.filter(m => m.ts > cutoff).length || 0;
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
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	const userVoice = [];
	for (const [userId, user] of Object.entries(stats.users || {})) {
		const minutes = user.voice?.filter(v => v.ts > cutoff).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;
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
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	const channelMessages = [];
	for (const [channelId, channel] of Object.entries(stats.channels || {})) {
		const count = channel.messages?.filter(m => m.ts > cutoff).length || 0;
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
	const lookback = days ?? stats.lookback ?? 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	const channelVoice = [];
	for (const [channelId, channel] of Object.entries(stats.channels || {})) {
		const minutes = channel.voice?.filter(v => v.ts > cutoff).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;
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

	return breakdown; // [oldest, ..., today] - left to right chronological
}

/**
 * Create a simple text-based chart/sparkline using emoji squares
 */
export function createSparkline(values, width = 14) {
	if (!values.length) return '⬜'.repeat(Math.min(width, 14));
	
	const max = Math.max(...values, 1);
	
	// Use emoji squares for better Discord rendering
	// Levels: empty, low, medium, high, max
	const getSquare = (value) => {
		if (value === 0) return '⬜';
		const ratio = value / max;
		if (ratio < 0.25) return '🟦';
		if (ratio < 0.5) return '🟩';
		if (ratio < 0.75) return '🟨';
		return '🟧';
	};
	
	// Take last N values and reverse so most recent is on the right
	return values.slice(-width).reverse().map(getSquare).join('');
}
