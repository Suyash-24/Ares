import { Router } from 'express';

export function createGuildsRouter(client) {
	const router = Router();

	// GET /api/guilds – list guilds the user manages that the bot is also in
	router.get('/', (req, res) => {
		const userGuilds = req.session.guilds || [];
		const MANAGE_GUILD = 0x20n;
		const ADMINISTRATOR = 0x8n;

		const manageable = userGuilds.filter(g => {
			const perms = BigInt(g.permissions);
			return (perms & MANAGE_GUILD) || (perms & ADMINISTRATOR);
		});

		const botGuildIds = new Set(client.guilds.cache.map(g => g.id));

		const result = manageable.map(g => {
			const botGuild = client.guilds.cache.get(g.id);
			return {
				id: g.id,
				name: g.name,
				icon: g.icon,
				botPresent: botGuildIds.has(g.id),
				memberCount: botGuild?.memberCount || null
			};
		});

		res.json(result);
	});

	// GET /api/guilds/:guildId – single guild overview
	router.get('/:guildId', (req, res) => {
		const guild = client.guilds.cache.get(req.params.guildId);
		if (!guild) return res.status(404).json({ error: 'Bot is not in this guild' });

		res.json({
			id: guild.id,
			name: guild.name,
			icon: guild.iconURL({ size: 256 }),
			memberCount: guild.memberCount,
			channels: guild.channels.cache.size,
			roles: guild.roles.cache.size,
			boostLevel: guild.premiumTier,
			boostCount: guild.premiumSubscriptionCount
		});
	});

	return router;
}
