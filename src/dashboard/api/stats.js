import { Router } from 'express';
import { ensureStatsConfig, getServerStats, getTopMessageUsers } from '../../utils/statsManager.js';
import { getLeaderboard } from '../../utils/leveling.js';

export function createStatsRouter(client) {
	const router = Router({ mergeParams: true });

	// GET /api/guilds/:guildId/stats – server stats overview
	router.get('/', async (req, res) => {
		try {
			const guildId = req.params.guildId;
			const stats = await ensureStatsConfig(client.db, guildId);
			const days = parseInt(req.query.days) || null;
			const overview = getServerStats(stats, days);

			res.json({
				enabled: stats.enabled,
				tracking: stats.tracking,
				lookback: stats.lookback,
				...overview
			});
		} catch (err) {
			console.error('[Dashboard] Stats error:', err);
			res.status(500).json({ error: 'Failed to fetch stats' });
		}
	});

	// GET /api/guilds/:guildId/stats/top-users
	router.get('/top-users', async (req, res) => {
		try {
			const stats = await ensureStatsConfig(client.db, req.params.guildId);
			const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
			const topUsers = getTopMessageUsers(stats, limit);

			// Resolve usernames
			const enriched = await Promise.all(topUsers.map(async (u) => {
				const user = await client.users.fetch(u.userId).catch(() => null);
				return {
					userId: u.userId,
					username: user?.username || 'Unknown',
					avatar: user?.displayAvatarURL({ size: 64 }) || null,
					messages: u.count
				};
			}));

			res.json(enriched);
		} catch (err) {
			console.error('[Dashboard] Top users error:', err);
			res.status(500).json({ error: 'Failed to fetch top users' });
		}
	});

	// GET /api/guilds/:guildId/stats/daily
	router.get('/daily', async (req, res) => {
		try {
			const stats = await ensureStatsConfig(client.db, req.params.guildId);
			res.json(stats.daily || {});
		} catch (err) {
			console.error('[Dashboard] Daily stats error:', err);
			res.status(500).json({ error: 'Failed to fetch daily stats' });
		}
	});

	// GET /api/guilds/:guildId/stats/leaderboard
	router.get('/leaderboard', async (req, res) => {
		try {
			const data = await client.db.findOne({ guildId: req.params.guildId });
			const leveling = data?.leveling;
			if (!leveling?.enabled) return res.json({ enabled: false, entries: [] });

			const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
			const entries = getLeaderboard(leveling, limit);

			const enriched = await Promise.all(entries.map(async (e) => {
				const user = await client.users.fetch(e.userId).catch(() => null);
				return {
					...e,
					username: user?.username || 'Unknown',
					avatar: user?.displayAvatarURL({ size: 64 }) || null
				};
			}));

			res.json({ enabled: true, entries: enriched });
		} catch (err) {
			console.error('[Dashboard] Leaderboard error:', err);
			res.status(500).json({ error: 'Failed to fetch leaderboard' });
		}
	});

	return router;
}
