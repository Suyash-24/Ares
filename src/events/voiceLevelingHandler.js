import { Events } from 'discord.js';
import { handleVoiceStateUpdate } from '../utils/leveling.js';

export default function registerVoiceLeveling(client) {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		try {
			await handleVoiceStateUpdate(client, oldState, newState);
		} catch (error) {
			console.error('[Leveling] VoiceState handler failed:', error);
		}
	});
}
