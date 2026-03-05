import { Router } from 'express';

const DISCORD_API = 'https://discord.com/api/v10';

export function createAuthRouter(client, baseUrl, clientSecret) {
	const router = Router();
	const clientId = client.user?.id || process.env.DISCORD_CLIENT_ID;
	const redirectUri = `${baseUrl}/auth/callback`;

	// Redirect to Discord OAuth2
	router.get('/login', (_req, res) => {
		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			scope: 'identify guilds'
		});
		res.redirect(`https://discord.com/oauth2/authorize?${params}`);
	});

	// OAuth2 callback
	router.get('/callback', async (req, res) => {
		const { code } = req.query;
		if (!code) return res.redirect('/?error=no_code');

		try {
			// Exchange code for tokens
			const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					grant_type: 'authorization_code',
					code,
					redirect_uri: redirectUri
				})
			});

			if (!tokenRes.ok) return res.redirect('/?error=token_failed');
			const tokens = await tokenRes.json();

			// Fetch user profile
			const userRes = await fetch(`${DISCORD_API}/users/@me`, {
				headers: { Authorization: `Bearer ${tokens.access_token}` }
			});
			if (!userRes.ok) return res.redirect('/?error=user_failed');
			const user = await userRes.json();

			// Fetch user guilds
			const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
				headers: { Authorization: `Bearer ${tokens.access_token}` }
			});
			const guilds = guildsRes.ok ? await guildsRes.json() : [];

			// Store in session
			req.session.user = {
				id: user.id,
				username: user.username,
				discriminator: user.discriminator,
				avatar: user.avatar,
				globalName: user.global_name
			};
			req.session.accessToken = tokens.access_token;
			req.session.guilds = guilds;

			res.redirect('/');
		} catch (err) {
			console.error('[Dashboard] OAuth callback error:', err);
			res.redirect('/?error=server_error');
		}
	});

	// Logout
	router.post('/logout', (req, res) => {
		req.session.destroy(() => {
			res.clearCookie('ares.sid');
			res.json({ ok: true });
		});
	});

	// Current user info
	router.get('/me', (req, res) => {
		if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
		res.json({ user: req.session.user, guilds: req.session.guilds || [] });
	});

	return router;
}

// Middleware: require authenticated session
export function requireAuth(req, res, next) {
	if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
	next();
}

// Middleware: require Manage Guild permission (0x20) on the guild in :guildId param
export function requireGuildAccess(req, res, next) {
	const guildId = req.params.guildId;
	const guilds = req.session?.guilds || [];
	const guild = guilds.find(g => g.id === guildId);
	if (!guild) return res.status(403).json({ error: 'No access to this guild' });

	const MANAGE_GUILD = 0x20;
	const ADMINISTRATOR = 0x8;
	const perms = BigInt(guild.permissions);
	if (!(perms & BigInt(MANAGE_GUILD)) && !(perms & BigInt(ADMINISTRATOR))) {
		return res.status(403).json({ error: 'Insufficient guild permissions' });
	}
	req.guild = guild;
	next();
}
