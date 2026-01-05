import { endGiveaway, getGiveaway } from '../commands/prefix/Giveaways/giveaway.js';

// ─────────────────────────────────────────────────────────────────────────────
// Giveaway Handler - Manages automatic ending and recovery on startup
// ─────────────────────────────────────────────────────────────────────────────

// Active timeouts map
const giveawayTimeouts = new Map();

/**
 * Schedule a giveaway to end
 */
export function scheduleGiveawayEnd(client, giveaway, guild) {
	const delay = giveaway.endTime - Date.now();
	
	// Clear existing timeout if any
	if (giveawayTimeouts.has(giveaway.messageId)) {
		clearTimeout(giveawayTimeouts.get(giveaway.messageId));
	}

	// If already past end time, end immediately
	if (delay <= 0) {
		setImmediate(async () => {
			const current = await getGiveaway(client, guild.id, giveaway.messageId);
			if (current && !current.ended) {
				await endGiveaway(client, current, guild);
			}
		});
		return;
	}

	// Schedule for future
	const timeout = setTimeout(async () => {
		giveawayTimeouts.delete(giveaway.messageId);
		const current = await getGiveaway(client, guild.id, giveaway.messageId);
		if (current && !current.ended) {
			await endGiveaway(client, current, guild);
		}
	}, delay);

	giveawayTimeouts.set(giveaway.messageId, timeout);
}

/**
 * Cancel a scheduled giveaway end
 */
export function cancelGiveawayEnd(messageId) {
	if (giveawayTimeouts.has(messageId)) {
		clearTimeout(giveawayTimeouts.get(messageId));
		giveawayTimeouts.delete(messageId);
	}
}

/**
 * Initialize giveaway handler on bot startup
 * Recovers and schedules all active giveaways
 */
export async function initGiveawayHandler(client) {
	console.log('[Giveaway] Initializing giveaway handler...');

	// Wait for client to be ready
	if (!client.isReady()) {
		await new Promise(resolve => client.once('ready', resolve));
	}

	// Get all guilds
	for (const [guildId, guild] of client.guilds.cache) {
		try {
			const data = await client.db.findOne({ guildId });
			const giveaways = data?.giveaways || [];

			for (const giveaway of giveaways) {
				if (giveaway.ended) continue;

				// Schedule the giveaway
				scheduleGiveawayEnd(client, giveaway, guild);
				console.log(`[Giveaway] Scheduled: ${giveaway.prize} in ${guild.name} (ends ${new Date(giveaway.endTime).toISOString()})`);
			}
		} catch (err) {
			console.error(`[Giveaway] Error loading giveaways for ${guildId}:`, err);
		}
	}

	console.log('[Giveaway] Handler initialized.');
}

export default { initGiveawayHandler, scheduleGiveawayEnd, cancelGiveawayEnd };
