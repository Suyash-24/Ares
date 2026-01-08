import { ChannelType } from 'discord.js';
import readline from 'readline';
import { 
	recordMessage, 
	recordVoiceTime, 
	recordJoin, 
	recordLeave,
	cleanupOldStats 
} from '../utils/statsManager.js';

/**
 * Stats Event Handler
 * Tracks message and voice activity for server statistics
 */

// Track active voice sessions: guildId:userId -> { channelId, startTime }
const voiceSessions = new Map();

/**
 * Handle message creation for stats tracking
 */
export async function handleMessageStats(message, client) {
	// Ignore DMs, bots, and system messages
	if (!message.guild || message.author.bot || message.system) return;
	
	// Ignore webhook messages
	if (message.webhookId) return;

	try {
		await recordMessage(client.db, message.guild.id, message.author.id, message.channel.id);
	} catch (error) {
		// Silent fail - don't interrupt normal operation
		console.error('[Stats] Error recording message:', error.message);
	}
}

/**
 * Handle voice state updates for stats tracking
 */
export async function handleVoiceStats(oldState, newState, client) {
	const userId = newState.member?.id || oldState.member?.id;
	const guildId = newState.guild?.id || oldState.guild?.id;
	
	if (!userId || !guildId) return;
	
	// Ignore bots
	if (newState.member?.user?.bot || oldState.member?.user?.bot) return;

	const sessionKey = `${guildId}:${userId}`;
	const oldChannel = oldState.channel;
	const newChannel = newState.channel;

	try {
		// User left voice completely or switched channels
		if (oldChannel && (!newChannel || oldChannel.id !== newChannel.id)) {
			const session = voiceSessions.get(sessionKey);
			if (session) {
				const duration = Date.now() - session.startTime;
				await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);
				voiceSessions.delete(sessionKey);
			}
		}

		// User joined a voice channel
		if (newChannel && (!oldChannel || oldChannel.id !== newChannel.id)) {
			// Don't track AFK channels
			if (newChannel.id === newState.guild.afkChannelId) return;
			
			// Don't track if user is deafened (AFK behavior)
			if (newState.selfDeaf && newState.selfMute) return;

			voiceSessions.set(sessionKey, {
				channelId: newChannel.id,
				startTime: Date.now()
			});
		}

		// Handle mute/deafen state changes (stop tracking if fully muted)
		if (newChannel && newState.selfDeaf && newState.selfMute) {
			const session = voiceSessions.get(sessionKey);
			if (session) {
				const duration = Date.now() - session.startTime;
				if (duration > 60000) { // Only record if > 1 min
					await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);
				}
				voiceSessions.delete(sessionKey);
			}
		}

		// Resume tracking if user unmutes
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

/**
 * Handle member join for stats tracking
 */
export async function handleMemberJoin(member, client) {
	if (!member.guild || member.user.bot) return;

	try {
		await recordJoin(client.db, member.guild.id, member.id);
	} catch (error) {
		console.error('[Stats] Error recording join:', error.message);
	}
}

/**
 * Handle member leave for stats tracking
 */
export async function handleMemberLeave(member, client) {
	if (!member.guild || member.user.bot) return;

	try {
		await recordLeave(client.db, member.guild.id);
		
		// Clean up any active voice session
		const sessionKey = `${member.guild.id}:${member.id}`;
		voiceSessions.delete(sessionKey);
	} catch (error) {
		console.error('[Stats] Error recording leave:', error.message);
	}
}

/**
 * Periodic cleanup of old stats data
 * Should be called periodically (e.g., daily)
 */
export async function cleanupStats(client, guildId) {
	try {
		await cleanupOldStats(client.db, guildId);
	} catch (error) {
		console.error('[Stats] Error cleaning up stats:', error.message);
	}
}

/**
 * Get current voice session duration for a user (for real-time stats)
 */
export function getCurrentVoiceTime(guildId, userId) {
	const sessionKey = `${guildId}:${userId}`;
	const session = voiceSessions.get(sessionKey);
	
	if (!session) return 0;
	
	return Date.now() - session.startTime;
}

/**
 * Get all active voice sessions for a guild
 */
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

/**
 * Initialize voice sessions on bot startup
 * Scans all voice channels to detect users already in voice
 * This ensures voice tracking works correctly after a bot restart
 */
export async function initializeVoiceSessions(client) {
	try {
		let totalSessions = 0;
		
		for (const guild of client.guilds.cache.values()) {
			// Get all voice channels in this guild
			const voiceChannels = guild.channels.cache.filter(
				channel => channel.type === 2 || channel.type === 13 // GuildVoice = 2, GuildStageVoice = 13
			);
			
			for (const [channelId, channel] of voiceChannels) {
				// Skip AFK channels
				if (channelId === guild.afkChannelId) continue;
				
				// Get all members in this voice channel
				for (const [memberId, member] of channel.members) {
					// Skip bots
					if (member.user.bot) continue;
					
					// Skip if user is fully muted/deafened (AFK behavior)
					const voiceState = member.voice;
					if (voiceState?.selfDeaf && voiceState?.selfMute) continue;
					
					// Create session for this user
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
		
		// Start auto-save interval
		startAutoSaveInterval(client);
		
		// Setup graceful shutdown
		setupGracefulShutdown(client);
		
	} catch (error) {
		console.error('[Stats] Error initializing voice sessions:', error.message);
	}
}

/**
 * Save all active voice sessions to the database
 * This saves the accumulated time without ending the sessions
 * Used for periodic backup and graceful shutdown
 */
export async function saveAllActiveSessions(client) {
	if (voiceSessions.size === 0) return;
	
	const now = Date.now();
	let savedCount = 0;
	
	for (const [key, session] of voiceSessions.entries()) {
		const [guildId, userId] = key.split(':');
		const duration = now - session.startTime;
		
		// Only save if at least 1 minute has accumulated
		if (duration >= 60000) {
			try {
				await recordVoiceTime(client.db, guildId, userId, session.channelId, duration);
				// Reset the start time so we don't double-count
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

// Auto-save interval reference
let autoSaveInterval = null;

/**
 * Start periodic auto-save of voice sessions (every 5 minutes)
 */
export function startAutoSaveInterval(client) {
	// Clear any existing interval
	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
	}
	
	// Save every 5 minutes
	autoSaveInterval = setInterval(async () => {
		await saveAllActiveSessions(client);
	}, 5 * 60 * 1000);
	
	console.log('⏰ [Stats] Voice session auto-save started (every 5 minutes).');
}

/**
 * Setup graceful shutdown handlers to save sessions before exit
 */
export function setupGracefulShutdown(client) {
	const shutdown = async (signal) => {
		console.log(`\n🛑 [Stats] Received ${signal}, saving voice sessions before shutdown...`);
		await saveAllActiveSessions(client);
		console.log('✅ [Stats] Voice sessions saved. Exiting...');
		process.exit(0);
	};
	
	// Handle different shutdown signals
	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	
	// Handle Windows-specific signals
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

