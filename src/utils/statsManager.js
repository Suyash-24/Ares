import { ChannelType } from 'discord.js';

export const DEFAULT_STATS = {
	enabled: true,
	lookback: 14,
	tracking: {
		messages: true,
		voice: true,
		joins: true
	},
	users: {},
	channels: {},
	daily: {},
	invites: {}
};

const cloneDefaultStats = () => JSON.parse(JSON.stringify(DEFAULT_STATS));

export function getTodayKey() {
	return new Date().toISOString().split('T')[0];
}

export function getDateKey(daysAgo = 0) {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString().split('T')[0];
}

export async function ensureStatsConfig(db, guildId) {

	const record = await db.findOne({ guildId });

	if (record?.stats) {
		const stats = record.stats;

		if (!stats.users) stats.users = {};
		if (!stats.channels) stats.channels = {};
		if (!stats.daily) stats.daily = {};
		if (!stats.tracking) stats.tracking = { messages: true, voice: true, joins: true };
		if (typeof stats.lookback !== 'number') stats.lookback = 14;
		if (typeof stats.enabled !== 'boolean') stats.enabled = true;
		if (!stats.invites) stats.invites = {};

		let needsMigration = false;
		for (const userId of Object.keys(stats.users)) {
			const user = stats.users[userId];

			if (Array.isArray(user.messages)) {
				stats.users[userId] = {
					messages: user.messages.length,
					voiceMinutes: Array.isArray(user.voice)
						? user.voice.reduce((sum, v) => sum + (v.mins || 0), 0)
						: (user.voiceMinutes || 0),
					lastActive: user.messages.length > 0
						? user.messages[user.messages.length - 1]?.ts || Date.now()
						: Date.now(),

					invitedBy: user.invitedBy,
					inviteCode: user.inviteCode
				};
				needsMigration = true;
			}
		}

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

	const recheck = await db.findOne({ guildId });
	if (recheck?.stats) {
		console.log(`[Stats] Race condition prevented for guild ${guildId} - stats already exist`);
		return recheck.stats;
	}

	const defaults = cloneDefaultStats();

	try {
		await db.updateOne({ guildId }, { $set: { stats: defaults } });
		console.log(`[Stats] Initialized new stats config for guild ${guildId}`);
	} catch (err) {
		console.error(`[Stats] Failed to initialize stats for guild ${guildId}:`, err.message);
	}

	return defaults;
}

export async function recordMessage(db, guildId, userId, channelId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.messages) return;

	const today = getTodayKey();
	const timestamp = Date.now();

	const updateOps = {

		[`stats.users.${userId}.messages`]: 1,

		[`stats.channels.${channelId}.messages`]: 1,

		[`stats.daily.${today}.messages`]: 1
	};

	await db.updateOne({ guildId }, {
		$inc: updateOps,
		$set: { [`stats.users.${userId}.lastActive`]: timestamp }
	});
}

export async function recordVoiceTime(db, guildId, userId, channelId, durationMs) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.voice) return;

	const today = getTodayKey();
	const timestamp = Date.now();
	const minutes = Math.floor(durationMs / 60000);

	if (minutes < 1) return;

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

export async function recordJoin(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();

	await db.updateOne({ guildId }, {
		$inc: { [`stats.daily.${today}.joins`]: 1 }
	});
}

export async function recordLeave(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	if (!stats.enabled || !stats.tracking?.joins) return;

	const today = getTodayKey();

	await db.updateOne({ guildId }, {
		$inc: { [`stats.daily.${today}.leaves`]: 1 }
	});
}

export async function cleanupOldStats(db, guildId) {
	const stats = await ensureStatsConfig(db, guildId);
	const cutoffDate = getDateKey(stats.lookback);

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

export function getUserStats(stats, userId, days = null) {
	const user = stats.users?.[userId];

	if (!user) {
		return { messages: 0, voiceMinutes: 0, rank: null };
	}

	return {
		messages: user.messages || 0,
		voiceMinutes: user.voiceMinutes || 0
	};
}

export function getChannelStats(stats, channelId, days = null) {
	const channel = stats.channels?.[channelId];

	if (!channel) {
		return { messages: 0, voiceMinutes: 0, contributors: 0 };
	}

	return {
		messages: channel.messages || 0,
		voiceMinutes: channel.voiceMinutes || 0,
		contributors: 0
	};
}

export function getServerStats(stats, days = null, activeVoiceMinutes = 0) {
	const lookback = days ?? stats.lookback ?? 14;
	const cutoffDate = getDateKey(lookback);

	let totalMessages = 0;
	let totalVoiceMinutes = activeVoiceMinutes;
	let totalJoins = 0;
	let totalLeaves = 0;

	for (const [dateKey, daily] of Object.entries(stats.daily || {})) {
		if (dateKey >= cutoffDate) {
			totalMessages += daily.messages || 0;
			totalVoiceMinutes += daily.voice || 0;
			totalJoins += daily.joins || 0;
			totalLeaves += daily.leaves || 0;
		}
	}

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

export function getUserMessageRank(stats, userId, days = null) {
	const topUsers = getTopMessageUsers(stats, 1000, days);
	const idx = topUsers.findIndex(u => u.userId === userId);
	return idx === -1 ? null : idx + 1;
}

export function getUserVoiceRank(stats, userId, days = null) {
	const topUsers = getTopVoiceUsers(stats, 1000, days);
	const idx = topUsers.findIndex(u => u.userId === userId);
	return idx === -1 ? null : idx + 1;
}

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

export function formatNumber(num) {
	return new Intl.NumberFormat('en-US').format(num);
}

export function getDailyBreakdown(stats, days = null) {
	const lookback = days ?? stats.lookback ?? 14;
	const breakdown = [];

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

	return breakdown;
}

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

export async function addMessages(db, guildId, userId, count) {
	await db.updateOne({ guildId }, {
		$inc: { [`stats.users.${userId}.messages`]: count }
	});
}

export async function removeMessages(db, guildId, userId, count) {
	const stats = await ensureStatsConfig(db, guildId);
	const currentCount = stats.users?.[userId]?.messages || 0;
	const newCount = Math.max(0, currentCount - count);

	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.messages`]: newCount }
	});

	return { oldCount: currentCount, newCount };
}

export async function addVoiceTime(db, guildId, userId, minutes) {
	await db.updateOne({ guildId }, {
		$inc: { [`stats.users.${userId}.voiceMinutes`]: minutes }
	});
}

export async function removeVoiceTime(db, guildId, userId, minutes) {
	const stats = await ensureStatsConfig(db, guildId);
	const currentMinutes = stats.users?.[userId]?.voiceMinutes || 0;
	const newMinutes = Math.max(0, currentMinutes - minutes);

	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.voiceMinutes`]: newMinutes }
	});

	return { oldMinutes: currentMinutes, newMinutes };
}

export async function resetUserMessages(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	const oldCount = stats.users?.[userId]?.messages || 0;

	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.messages`]: 0 }
	});

	return oldCount;
}

export async function resetUserVoice(db, guildId, userId) {
	const stats = await ensureStatsConfig(db, guildId);
	const oldMinutes = stats.users?.[userId]?.voiceMinutes || 0;

	await db.updateOne({ guildId }, {
		$set: { [`stats.users.${userId}.voiceMinutes`]: 0 }
	});

	return oldMinutes;
}
