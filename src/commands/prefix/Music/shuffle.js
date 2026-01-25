import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'shuffle',
	description: 'Shuffle the music queue',
	category: 'Music',

	async execute(message, args, client) {
		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const queue = client.queue.get(message.guildId);

		if (!queue || !queue.player || !queue.tracks || queue.tracks.size === 0) {
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

		if (queue.tracks.toArray().length <= 1) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Not Enough Tracks`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('There are not enough tracks in the queue to shuffle.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			const tracks = queue.tracks.toArray();
			const currentTrack = tracks[0];
			const queueTracks = tracks.slice(1);

			for (let i = queueTracks.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[queueTracks[i], queueTracks[j]] = [queueTracks[j], queueTracks[i]];
			}

			queue.tracks.clear();
			queue.tracks.push(currentTrack);
			for (const track of queueTracks) {
				queue.tracks.push(track);
			}

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# 🔀 Shuffled`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Shuffled the queue! (${queueTracks.length} track${queueTracks.length === 1 ? '' : 's'})`)
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in shuffle command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while shuffling the queue.')
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
