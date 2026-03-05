import { Router } from 'express';

export function createMusicRouter(client) {
	const router = Router({ mergeParams: true });

	// GET /api/guilds/:guildId/music – current queue state
	router.get('/', (req, res) => {
		const queue = client.queue?.get(req.params.guildId);
		if (!queue || !queue.player) {
			return res.json({ active: false });
		}

		const tracks = [];
		if (queue.tracks?.toArray) {
			for (const t of queue.tracks.toArray()) {
				tracks.push({
					title: t.info?.title,
					author: t.info?.author,
					duration: t.info?.length,
					uri: t.info?.uri,
					artwork: t.info?.artworkUrl
				});
			}
		}

		const current = tracks.length > 0 ? tracks[0] : null;

		res.json({
			active: true,
			paused: !!queue.paused,
			current,
			queue: tracks.slice(1),
			queueSize: tracks.length - 1,
			loop: queue.loop || 'none',
			volume: queue.volume ?? 100
		});
	});

	// POST /api/guilds/:guildId/music/pause
	router.post('/pause', (req, res) => {
		const queue = client.queue?.get(req.params.guildId);
		if (!queue?.player) return res.status(404).json({ error: 'No active player' });

		queue.paused = true;
		queue.player.setPaused(true);
		res.json({ ok: true, paused: true });
	});

	// POST /api/guilds/:guildId/music/resume
	router.post('/resume', (req, res) => {
		const queue = client.queue?.get(req.params.guildId);
		if (!queue?.player) return res.status(404).json({ error: 'No active player' });

		queue.paused = false;
		queue.player.setPaused(false);
		res.json({ ok: true, paused: false });
	});

	// POST /api/guilds/:guildId/music/skip
	router.post('/skip', (req, res) => {
		const queue = client.queue?.get(req.params.guildId);
		if (!queue?.player) return res.status(404).json({ error: 'No active player' });

		queue.player.stopTrack();
		res.json({ ok: true });
	});

	// POST /api/guilds/:guildId/music/volume
	router.post('/volume', (req, res) => {
		const queue = client.queue?.get(req.params.guildId);
		if (!queue?.player) return res.status(404).json({ error: 'No active player' });

		const vol = Math.min(200, Math.max(0, parseInt(req.body.volume) || 100));
		queue.player.setGlobalVolume(vol);
		queue.volume = vol;
		res.json({ ok: true, volume: vol });
	});

	return router;
}
