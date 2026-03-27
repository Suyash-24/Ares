import { Router } from 'express';
import { requireAuth, requireGuildAccess } from '../auth.js';
import { createGuildsRouter } from './guilds.js';
import { createConfigRouter } from './config.js';
import { createModerationRouter } from './moderation.js';
import { createMusicRouter } from './music.js';
import { createStatsRouter } from './stats.js';

export function createApiRouter(client) {
	const router = Router();

	// Unprotected API routes
	router.get('/public/stats', (req, res) => {
		try {
			res.json({
				ping: client.ws.ping || 0,
				guilds: client.guilds.cache.size || 0,
				users: client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0),
				channels: client.channels.cache.size || 0
			});
		} catch (error) {
			console.error('Error fetching public stats:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	});

	// All other API routes require authentication
	router.use(requireAuth);

	// Guild list
	router.use('/guilds', createGuildsRouter(client));

	// Per-guild routes require guild access
	router.use('/guilds/:guildId/config', requireGuildAccess, createConfigRouter(client));
	router.use('/guilds/:guildId/moderation', requireGuildAccess, createModerationRouter(client));
	router.use('/guilds/:guildId/music', requireGuildAccess, createMusicRouter(client));
	router.use('/guilds/:guildId/stats', requireGuildAccess, createStatsRouter(client));

	return router;
}
