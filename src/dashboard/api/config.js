import { Router } from 'express';

const ALLOWED_MODULES = [
	'automod', 'antinuke', 'welcome', 'leveling', 'logging',
	'triggers', 'reactionTriggers', 'moderation', 'starboard',
	'antiraid', 'bumpReminder', 'birthday', 'stats', 'tickets'
];

export function createConfigRouter(client) {
	const router = Router({ mergeParams: true });

	// GET /api/guilds/:guildId/config – full guild config
	router.get('/', async (req, res) => {
		try {
			const data = await client.db.findOne({ guildId: req.params.guildId });
			if (!data) return res.json({});

			// Strip internal fields
			const { guildId, ...config } = data;
			res.json(config);
		} catch (err) {
			console.error('[Dashboard] Config GET error:', err);
			res.status(500).json({ error: 'Failed to fetch config' });
		}
	});

	// GET /api/guilds/:guildId/config/:module
	router.get('/:module', async (req, res) => {
		const mod = req.params.module;
		if (!ALLOWED_MODULES.includes(mod)) {
			return res.status(400).json({ error: 'Invalid module' });
		}

		try {
			const data = await client.db.findOne({ guildId: req.params.guildId });
			res.json(data?.[mod] || {});
		} catch (err) {
			console.error(`[Dashboard] Config/${mod} GET error:`, err);
			res.status(500).json({ error: 'Failed to fetch module config' });
		}
	});

	// PATCH /api/guilds/:guildId/config/:module – partial update
	router.patch('/:module', async (req, res) => {
		const mod = req.params.module;
		if (!ALLOWED_MODULES.includes(mod)) {
			return res.status(400).json({ error: 'Invalid module' });
		}

		const body = req.body;
		if (!body || typeof body !== 'object' || Array.isArray(body)) {
			return res.status(400).json({ error: 'Body must be a JSON object' });
		}

		try {
			// Build $set operations with module prefix
			const setOps = {};
			for (const [key, value] of Object.entries(body)) {
				// Disallow prototype pollution keys
				if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
				setOps[`${mod}.${key}`] = value;
			}

			await client.db.updateOne(
				{ guildId: req.params.guildId },
				{ $set: setOps }
			);

			const data = await client.db.findOne({ guildId: req.params.guildId });
			res.json(data?.[mod] || {});
		} catch (err) {
			console.error(`[Dashboard] Config/${mod} PATCH error:`, err);
			res.status(500).json({ error: 'Failed to update config' });
		}
	});

	return router;
}
