import { endGiveaway, getGiveaway } from '../commands/prefix/Giveaways/giveaway.js';

const giveawayTimeouts = new Map();

export function scheduleGiveawayEnd(client, giveaway, guild) {
	const delay = giveaway.endTime - Date.now();

	if (giveawayTimeouts.has(giveaway.messageId)) {
		clearTimeout(giveawayTimeouts.get(giveaway.messageId));
	}

	if (delay <= 0) {
		setImmediate(async () => {
			const current = await getGiveaway(client, guild.id, giveaway.messageId);
			if (current && !current.ended) {
				await endGiveaway(client, current, guild);
			}
		});
		return;
	}

	const timeout = setTimeout(async () => {
		giveawayTimeouts.delete(giveaway.messageId);
		const current = await getGiveaway(client, guild.id, giveaway.messageId);
		if (current && !current.ended) {
			await endGiveaway(client, current, guild);
		}
	}, delay);

	giveawayTimeouts.set(giveaway.messageId, timeout);
}

export function cancelGiveawayEnd(messageId) {
	if (giveawayTimeouts.has(messageId)) {
		clearTimeout(giveawayTimeouts.get(messageId));
		giveawayTimeouts.delete(messageId);
	}
}

export async function initGiveawayHandler(client) {
	console.log('[Giveaway] Initializing giveaway handler...');

	if (!client.isReady()) {
		await new Promise(resolve => client.once('ready', resolve));
	}

	for (const [guildId, guild] of client.guilds.cache) {
		try {
			const data = await client.db.findOne({ guildId });
			const giveaways = data?.giveaways || [];

			for (const giveaway of giveaways) {
				if (giveaway.ended) continue;

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
