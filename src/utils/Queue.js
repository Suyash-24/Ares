import Denque from 'denque';
import { attachPlayerEvents, detachPlayerEvents } from './shoukakuManager.js';

export class Queue {

	constructor(options) {
		this.client = options.client;
		this.guild = options.guild;
		this.voiceChannel = options.voiceChannel;
		this.messageChannel = options.messageChannel;

		this.tracks = new Denque();
		this.player = null;
		this.stopped = true;
		this.paused = false;
		this.repeat = 'OFF';
		this.autoplay = false;
		this.lastPlayedTrackInfo = null;
		this.autoplayPlaylist = [];
		this.autoplayPlaylistIndex = 0;
		this.autoplayHistory = new Set();
	}

	async connect() {
		try {
			const player = await this.client.shoukaku.joinVoiceChannel({
				guildId: this.guild.id,
				channelId: this.voiceChannel.id,
				shardId: this.guild.shardId ?? 0
			});

			this.player = player;
			this.stopped = false;
			this.paused = false;
			attachPlayerEvents(this.player, this);
			console.log(`✅ Connected to ${this.voiceChannel.name} in ${this.guild.name}`);
		} catch (error) {
			console.error('Failed to connect to voice channel:', error);
			throw error;
		}
	}

	disconnect() {
		try {
			this.stopped = true;
			this.tracks.clear();
			detachPlayerEvents(this);
			this.lastPlayedTrackInfo = null;
			this.autoplayPlaylist = [];
			this.autoplayPlaylistIndex = 0;
			this.autoplayHistory?.clear?.();

			if (this.client.shoukaku) {
				this.client.shoukaku.leaveVoiceChannel(this.guild.id);
			}

			this.player = null;
			this.paused = false;

			console.log(`✅ Disconnected from ${this.guild.name}`);
		} catch (error) {
			console.error('Failed to disconnect:', error);
		}
	}

	addTrack(tracks) {
		if (Array.isArray(tracks)) {
			for (const track of tracks) {
				this.tracks.push(track);
			}
		} else {
			this.tracks.push(tracks);
		}
	}

	async play() {
		if (!this.player) {
			await this.connect();
		}

		const track = this.tracks.peekAt(0);

		if (!track) {
			console.log(`✅ Queue finished on ${this.guild.name}`);

			if (this.messageChannel) {
				await this.messageChannel
					.send('✅ No more tracks in queue, leaving voice channel')
					.catch(() => null);
			}

			this.disconnect();
			return;
		}

		if (!this.player) {
			console.error('Player not initialized');
			return;
		}

		try {
			this.stopped = false;
			this.paused = false;
			await this.player.playTrack({ track: { encoded: track.encoded } });
		} catch (error) {
			console.error('Failed to play track:', error);
			this.tracks.removeOne(0);
			await this.play();
		}
	}

	async skip() {
		if (!this.player) return;

		try {
			this.autoplayPlaylist = [];
			this.autoplayPlaylistIndex = 0;

			await this.player.stopTrack();
		} catch (error) {
			console.error('Failed to skip track:', error);
		}
	}

	async setPaused(paused) {
		if (!this.player) return;

		try {
			await this.player.setPaused(paused);
			this.paused = paused;
		} catch (error) {
			console.error('Failed to set pause state:', error);
		}
	}

	async setVolume(volume) {
		if (!this.player) return;

		try {
			await this.player.setGlobalVolume(volume);
		} catch (error) {
			console.error('Failed to set volume:', error);
		}
	}

	setRepeat(mode) {
		if (['OFF', 'ONCE', 'ALL'].includes(mode)) {
			this.repeat = mode;
		}
	}

	setAutoplay(enabled) {
		this.autoplay = Boolean(enabled);
	}

	shuffle() {
		if (this.tracks.length <= 1) return;

		const first = this.tracks.removeOne(0);
		const remaining = [];

		for (let i = 0; i < this.tracks.length; i++) {
			remaining.push(this.tracks.removeOne(0));
		}

		for (let i = remaining.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[remaining[i], remaining[j]] = [remaining[j], remaining[i]];
		}

		this.tracks.push(first);
		for (const track of remaining) {
			this.tracks.push(track);
		}
	}

	clear() {
		this.tracks.clear();
	}

	size() {
		return this.tracks.length;
	}

	toArray() {
		const result = [];
		for (let i = 0; i < this.tracks.length; i++) {
			result.push(this.tracks.peekAt(i));
		}
		return result;
	}
}

export default Queue;
