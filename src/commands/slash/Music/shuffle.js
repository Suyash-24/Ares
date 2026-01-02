import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffle the music queue'),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const queue = client.queue.get(interaction.guildId);

		if (!queue || !queue.player || !queue.tracks || queue.tracks.size === 0) {
			return interaction.reply({
				content: '❌ I\'m not playing any music.',
				ephemeral: true
			});
		}

		if (interaction.member.voice.channelId !== queue.voiceChannel.id) {
			return interaction.reply({
				content: '❌ You must be in the same voice channel as me.',
				ephemeral: true
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

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
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

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
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

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}
	}
};
