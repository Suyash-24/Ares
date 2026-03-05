import { Router } from 'express';

export function createModerationRouter(client) {
	const router = Router({ mergeParams: true });

	// GET /api/guilds/:guildId/moderation/cases – list mod cases
	router.get('/cases', async (req, res) => {
		try {
			const data = await client.db.findOne({ guildId: req.params.guildId });
			const actions = data?.moderation?.actions || [];
			const page = Math.max(1, parseInt(req.query.page) || 1);
			const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
			const start = (page - 1) * limit;

			// Sort newest first
			const sorted = [...actions].sort((a, b) => {
				const aNum = a.caseNumber || 0;
				const bNum = b.caseNumber || 0;
				return bNum - aNum;
			});

			res.json({
				cases: sorted.slice(start, start + limit),
				total: actions.length,
				page,
				pages: Math.ceil(actions.length / limit)
			});
		} catch (err) {
			console.error('[Dashboard] Moderation cases error:', err);
			res.status(500).json({ error: 'Failed to fetch cases' });
		}
	});

	// GET /api/guilds/:guildId/moderation/warnings/:userId
	router.get('/warnings/:userId', async (req, res) => {
		try {
			const data = await client.db.findOne({ guildId: req.params.guildId });
			const actions = data?.moderation?.actions || [];
			const userWarnings = actions.filter(
				a => a.userId === req.params.userId && a.type === 'warn'
			);
			res.json({ warnings: userWarnings, total: userWarnings.length });
		} catch (err) {
			console.error('[Dashboard] Warnings error:', err);
			res.status(500).json({ error: 'Failed to fetch warnings' });
		}
	});

	// POST /api/guilds/:guildId/moderation/kick
	router.post('/kick', async (req, res) => {
		const { userId, reason } = req.body;
		if (!userId) return res.status(400).json({ error: 'userId required' });

		try {
			const guild = client.guilds.cache.get(req.params.guildId);
			if (!guild) return res.status(404).json({ error: 'Guild not found' });

			const member = await guild.members.fetch(userId).catch(() => null);
			if (!member) return res.status(404).json({ error: 'Member not found' });

			if (!member.kickable) return res.status(400).json({ error: 'Cannot kick this member' });

			await member.kick(reason || `Dashboard action by ${req.session.user.username}`);

			// Log the action
			await logModAction(client, req.params.guildId, {
				type: 'kick',
				userId,
				moderator: { id: req.session.user.id, username: req.session.user.username },
				reason: reason || 'No reason provided',
				timestamp: new Date().toISOString()
			});

			res.json({ ok: true });
		} catch (err) {
			console.error('[Dashboard] Kick error:', err);
			res.status(500).json({ error: 'Failed to kick member' });
		}
	});

	// POST /api/guilds/:guildId/moderation/ban
	router.post('/ban', async (req, res) => {
		const { userId, reason, deleteMessageSeconds } = req.body;
		if (!userId) return res.status(400).json({ error: 'userId required' });

		try {
			const guild = client.guilds.cache.get(req.params.guildId);
			if (!guild) return res.status(404).json({ error: 'Guild not found' });

			const member = await guild.members.fetch(userId).catch(() => null);
			if (member && !member.bannable) return res.status(400).json({ error: 'Cannot ban this member' });

			await guild.bans.create(userId, {
				reason: reason || `Dashboard action by ${req.session.user.username}`,
				deleteMessageSeconds: Math.min(604800, Math.max(0, parseInt(deleteMessageSeconds) || 0))
			});

			await logModAction(client, req.params.guildId, {
				type: 'ban',
				userId,
				moderator: { id: req.session.user.id, username: req.session.user.username },
				reason: reason || 'No reason provided',
				timestamp: new Date().toISOString()
			});

			res.json({ ok: true });
		} catch (err) {
			console.error('[Dashboard] Ban error:', err);
			res.status(500).json({ error: 'Failed to ban user' });
		}
	});

	// POST /api/guilds/:guildId/moderation/unban
	router.post('/unban', async (req, res) => {
		const { userId, reason } = req.body;
		if (!userId) return res.status(400).json({ error: 'userId required' });

		try {
			const guild = client.guilds.cache.get(req.params.guildId);
			if (!guild) return res.status(404).json({ error: 'Guild not found' });

			await guild.bans.remove(userId, reason || `Dashboard action by ${req.session.user.username}`);

			await logModAction(client, req.params.guildId, {
				type: 'unban',
				userId,
				moderator: { id: req.session.user.id, username: req.session.user.username },
				reason: reason || 'No reason provided',
				timestamp: new Date().toISOString()
			});

			res.json({ ok: true });
		} catch (err) {
			console.error('[Dashboard] Unban error:', err);
			res.status(500).json({ error: 'Failed to unban user' });
		}
	});

	// POST /api/guilds/:guildId/moderation/timeout
	router.post('/timeout', async (req, res) => {
		const { userId, reason, duration } = req.body;
		if (!userId) return res.status(400).json({ error: 'userId required' });

		const durationMs = Math.min(28 * 24 * 60 * 60 * 1000, Math.max(0, parseInt(duration) || 600000));

		try {
			const guild = client.guilds.cache.get(req.params.guildId);
			if (!guild) return res.status(404).json({ error: 'Guild not found' });

			const member = await guild.members.fetch(userId).catch(() => null);
			if (!member) return res.status(404).json({ error: 'Member not found' });
			if (!member.moderatable) return res.status(400).json({ error: 'Cannot timeout this member' });

			await member.timeout(durationMs, reason || `Dashboard action by ${req.session.user.username}`);

			await logModAction(client, req.params.guildId, {
				type: 'mute',
				userId,
				moderator: { id: req.session.user.id, username: req.session.user.username },
				reason: reason || 'No reason provided',
				timestamp: new Date().toISOString()
			});

			res.json({ ok: true });
		} catch (err) {
			console.error('[Dashboard] Timeout error:', err);
			res.status(500).json({ error: 'Failed to timeout member' });
		}
	});

	// GET /api/guilds/:guildId/moderation/members – search members
	router.get('/members', async (req, res) => {
		const query = req.query.q;
		if (!query || query.length < 2) return res.json([]);

		try {
			const guild = client.guilds.cache.get(req.params.guildId);
			if (!guild) return res.status(404).json({ error: 'Guild not found' });

			const members = await guild.members.search({ query, limit: 10 });
			res.json(members.map(m => ({
				id: m.id,
				username: m.user.username,
				displayName: m.displayName,
				avatar: m.user.displayAvatarURL({ size: 64 }),
				joinedAt: m.joinedAt
			})));
		} catch (err) {
			console.error('[Dashboard] Member search error:', err);
			res.status(500).json({ error: 'Search failed' });
		}
	});

	return router;
}

async function logModAction(client, guildId, action) {
	try {
		const data = await client.db.findOne({ guildId });
		const actions = data?.moderation?.actions || [];
		const maxCase = actions.reduce((max, a) => Math.max(max, a.caseNumber || 0), 0);
		action.caseNumber = maxCase + 1;

		actions.push(action);
		await client.db.updateOne({ guildId }, { $set: { 'moderation.actions': actions } });
	} catch (err) {
		console.error('[Dashboard] Failed to log mod action:', err);
	}
}
