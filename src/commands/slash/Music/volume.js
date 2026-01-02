import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('volume')
		.setDescription('Adjust the music volume (1-100)')
		.addIntegerOption(option =>
			option.setName('level')
				.setDescription('Volume level (1-100)')
				.setRequired(false)
				.setMinValue(1)
				.setMaxValue(100)
		),

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

		const volumeLevel = interaction.options.getInteger('level');

		if (volumeLevel === null) {
			const currentVolume = queue.player?.state?.volume || 100;
			const container = buildVolumeContainer({
				title: `${EMOJIS.volume} Current Volume`,
				volume: currentVolume,
				usage: 'Use `/volume <level>` to adjust'
			});

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		try {
			await queue.setVolume(volumeLevel);
			const container = buildVolumeContainer({
				title: `${EMOJIS.volume} Volume Updated`,
				volume: volumeLevel
			});

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in volume command:', error);
			interaction.reply({
				content: '❌ An error occurred while adjusting the volume.',
				ephemeral: true
			});
		}
	}
};

function buildVolumeContainer({ title, volume, usage }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${title}`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	let content = `**Volume Level:** ${volume}%`;
	if (usage) {
		content += `\n\n${usage}`;
	}

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(content)
	);

	return container;
}
