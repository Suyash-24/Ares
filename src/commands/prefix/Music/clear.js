import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'clearqueue',
	description: 'Clear the entire music queue',
	aliases: ['clear-queue', 'cq', 'emptyqueue'],
	category: 'Music',

	async execute(message, args, client) {

		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const queue = client.queue.get(message.guildId);

		if (!queue || queue.stopped) {
			return message.reply({
				content: '❌ I\'m not playing any music.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (message.member.voice.channelId !== queue.voiceChannel.id) {
			return message.reply({
				content: '❌ You must be in the same voice channel as me.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (queue.tracks.length <= 1) {
			return message.reply({
				content: '❌ The queue is already empty (only current track exists).',
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			const queueLength = queue.tracks.length - 1;
			queue.tracks.removeOne(0);
			queue.clear();
			const currentTrack = queue.tracks.peekAt(0);

			const current = queue.tracks.peekAt(0);
			queue.clear();
			if (current) {
				queue.addTrack(current);
			}

			const container = buildClearContainer({
				cleared: queueLength
			});

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in clear command:', error);
			message.reply({
				content: '❌ An error occurred while clearing the queue.',
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

function buildClearContainer({ cleared }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success || '✅'} | Queue Cleared`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**${cleared}** track${cleared === 1 ? '' : 's'} removed\n\nThe current track remains in the queue.`)
	);

	return container;
}
