import express from 'express';
import session from 'express-session';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fileStoreFactory from 'session-file-store';
import { createAuthRouter } from './auth.js';
import { createApiRouter } from './api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FileStore = fileStoreFactory(session);

export function startDashboard(client) {
	const port = parseInt(process.env.DASHBOARD_PORT || '3000', 10);
	const baseUrl = process.env.DASHBOARD_URL || `http://localhost:${port}`;
	const sessionSecret = process.env.SESSION_SECRET || 'change_me_in_env_for_dashboard';
	const sessionStoreDir = process.env.SESSION_STORE_DIR
		? path.resolve(process.cwd(), process.env.SESSION_STORE_DIR)
		: path.resolve(process.cwd(), 'data', 'sessions');
	mkdirSync(sessionStoreDir, { recursive: true });
	if (!process.env.SESSION_SECRET) {
		console.warn('⚠️ [Dashboard] SESSION_SECRET not set – using default value. Set SESSION_SECRET in .env for secure persistent sessions.');
	}

	const clientSecret = process.env.DISCORD_CLIENT_SECRET;

	const app = express();

	app.disable('x-powered-by');

	app.use(express.json({ limit: '1mb' }));

	app.use(session({
		store: new FileStore({
			path: sessionStoreDir,
			ttl: 7 * 24 * 60 * 60,
			retries: 0,
			logFn: () => {}
		}),
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false,
		name: 'ares.sid',
		cookie: {
			httpOnly: true,
			secure: baseUrl.startsWith('https'),
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		}
	}));

	if (clientSecret) {
		app.use('/auth', createAuthRouter(client, baseUrl, clientSecret));
		app.use('/api', createApiRouter(client));
	} else {
		console.warn('⚠️ [Dashboard] DISCORD_CLIENT_SECRET not set – auth/API disabled, serving frontend only.');
		// Return 503 for auth/api routes when not configured
		app.use('/auth', (_req, res) => res.status(503).json({ error: 'Dashboard auth not configured' }));
		app.use('/api', (_req, res) => res.status(503).json({ error: 'Dashboard API not configured' }));
	}

	// Serve the SPA frontend
	const publicDir = path.join(__dirname, 'public');
	app.use(express.static(publicDir));

	// SPA fallback – serve index.html for any non-API, non-auth route
	app.get('{*splat}', (_req, res) => {
		res.sendFile(path.join(publicDir, 'index.html'));
	});

	app.listen(port, () => {
		console.log(`🌐 [Dashboard] Running at ${baseUrl}`);
	});

	return app;
}

// Allow standalone preview: node src/dashboard/server.js
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
	startDashboard(null);
}
