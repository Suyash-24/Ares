import { ChannelType } from 'discord.js';
import readline from 'readline';
import {
	recordMessage,
	recordVoiceTime,
	recordJoin,
	recordLeave,
	cleanupOldStats
} from '../utils/statsManager.js';

const voiceSessions = new Map();

export async function handleMessageStats(message, client) {

	if (!message.guild || message.author.bot || message.system) return;

	if (message.webhookId) return;

	try {
		await recordMessage(client.db, message.guild.id, message.author.id, message.channel.id);
	} catch (error) {

		console.error('[Stats] Error recording message:', error.message);
	}
}

export async function handleVoiceStats(oldState, newState, client) {
	const userId = newState.member?.id || oldState.member?.id;
	const guildId = newState.guild?.id || oldState.guild?.id;

	if (!userId || !guildId) return;

	if (newState.member?.user?.bot || oldState.member?.user?.bot) return;

	const sessionKey = `${guildId}:${userId}`;
	const oldChannel = oldState.channel;
	const newChannel = newState.channel;

	try {

		if (oldChannel && (!newChannel || oldChannel.id !== newChannel.id)) {
			const session = voiceSessions.get(sessionKey);
			if (session) {
				const duration = Date.now() - session.startTime;
				await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);
				voiceSessions.delete(sessionKey);
			}
		}

		if (newChannel && (!oldChannel || oldChannel.id !== newChannel.id)) {

			if (newChannel.id === newState.guild.afkChannelId) return;

			if (newState.selfDeaf && newState.selfMute) return;

			voiceSessions.set(sessionKey, {
				channelId: newChannel.id,
				startTime: Date.now()
			});
		}

		if (newChannel && newState.selfDeaf && newState.selfMute) {
			const session = voiceSessions.get(sessionKey);
			if (session) {
				const duration = Date.now() - session.startTime;
				if (duration > 60000) {
					await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);
				}
				voiceSessions.delete(sessionKey);
			}
		}

		if (newChannel && !newState.selfDeaf && !voiceSessions.has(sessionKey)) {
			voiceSessions.set(sessionKey, {
				channelId: newChannel.id,
				startTime: Date.now()
			});
		}
	} catch (error) {
		console.error('[Stats] Error recording voice:', error.message);
	}
}

export async function handleMemberJoin(member, client) {
	if (!member.guild || member.user.bot) return;

	try {
		await recordJoin(client.db, member.guild.id, member.id);
	} catch (error) {
		console.error('[Stats] Error recording join:', error.message);
	}
}

export async function handleMemberLeave(member, client) {
	if (!member.guild || member.user.bot) return;

	try {
		await recordLeave(client.db, member.guild.id);

		const sessionKey = `${member.guild.id}:${member.id}`;
		voiceSessions.delete(sessionKey);
	} catch (error) {
		console.error('[Stats] Error recording leave:', error.message);
	}
}

export async function cleanupStats(client, guildId) {
	try {
		await cleanupOldStats(client.db, guildId);
	} catch (error) {
		console.error('[Stats] Error cleaning up stats:', error.message);
	}
}

export function getCurrentVoiceTime(guildId, userId) {
	const sessionKey = `${guildId}:${userId}`;
	const session = voiceSessions.get(sessionKey);

	if (!session) return 0;

	return Date.now() - session.startTime;
}

export function getActiveVoiceSessions(guildId) {
	const sessions = [];

	for (const [key, session] of voiceSessions.entries()) {
		if (key.startsWith(`${guildId}:`)) {
			const userId = key.split(':')[1];
			sessions.push({
				userId,
				channelId: session.channelId,
				duration: Date.now() - session.startTime
			});
		}
	}

	return sessions;
}

export async function initializeVoiceSessions(client) {
	try {
		let totalSessions = 0;

		for (const guild of client.guilds.cache.values()) {

			const voiceChannels = guild.channels.cache.filter(
				channel => channel.type === 2 || channel.type === 13
			);

			for (const [channelId, channel] of voiceChannels) {

				if (channelId === guild.afkChannelId) continue;

				for (const [memberId, member] of channel.members) {

					if (member.user.bot) continue;

					const voiceState = member.voice;
					if (voiceState?.selfDeaf && voiceState?.selfMute) continue;

					const sessionKey = `${guild.id}:${memberId}`;
					if (!voiceSessions.has(sessionKey)) {
						voiceSessions.set(sessionKey, {
							channelId: channelId,
							startTime: Date.now()
						});
						totalSessions++;
					}
				}
			}
		}

		if (totalSessions > 0) {
			console.log(`✅ [Stats] Initialized ${totalSessions} voice session(s) from existing voice channels.`);
		}

		startAutoSaveInterval(client);

		setupGracefulShutdown(client);

	} catch (error) {
		console.error('[Stats] Error initializing voice sessions:', error.message);
	}
}

export async function saveAllActiveSessions(client) {
	if (voiceSessions.size === 0) return;

	const now = Date.now();
	let savedCount = 0;

	for (const [key, session] of voiceSessions.entries()) {
		const [guildId, userId] = key.split(':');
		const duration = now - session.startTime;

		if (duration >= 60000) {
			try {
				await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);

				session.startTime = now;
				savedCount++;
			} catch (error) {
				console.error(`[Stats] Failed to save voice session for ${userId}:`, error.message);
			}
		}
	}

	if (savedCount > 0) {
		console.log(`💾 [Stats] Auto-saved ${savedCount} voice session(s) to database.`);
	}
}

let autoSaveInterval = null;

export function startAutoSaveInterval(client) {

	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
	}

	autoSaveInterval = setInterval(async () => {
		await saveAllActiveSessions(client);
	}, 5 * 60 * 1000);

	console.log('⏰ [Stats] Voice session auto-save started (every 5 minutes).');
}

export function setupGracefulShutdown(client) {
	const shutdown = async (signal) => {
		console.log(`\n🛑 [Stats] Received ${signal}, saving voice sessions before shutdown...`);
		await saveAllActiveSessions(client);
		console.log('✅ [Stats] Voice sessions saved. Exiting...');
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));

	if (process.platform === 'win32') {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.on('SIGINT', () => shutdown('SIGINT'));
	}
}

export default {
	handleMessageStats,
	handleVoiceStats,
	handleMemberJoin,
	handleMemberLeave,
	cleanupStats,
	getCurrentVoiceTime,
	getActiveVoiceSessions,
	initializeVoiceSessions,
	saveAllActiveSessions,
	startAutoSaveInterval,
	setupGracefulShutdown
};
