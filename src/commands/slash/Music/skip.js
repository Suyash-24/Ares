import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the currently playing track'),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const queue = client.queue.get(interaction.guildId);

		if (!queue || queue.stopped) {
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

		const currentTrack = queue.tracks.peekAt(0);
		if (!currentTrack) {
			return interaction.reply({
				content: '❌ There\'s no track currently playing.',
				ephemeral: true
			});
		}

		try {
			await queue.skip();

			const queueSize = queue.tracks.length - 1;
			const container = buildSkipContainer({
				skipped: currentTrack.info.title,
				remaining: queueSize
			});

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in skip command:', error);
			return interaction.reply({
				content: '❌ An error occurred while skipping the track.',
				ephemeral: true
			});
		}
	}
};

function buildSkipContainer({ skipped, remaining }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.skip} Skipped`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**${skipped}**`)
	);

	if (remaining > 0) {
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`${remaining} track${remaining === 1 ? '' : 's'} remaining`)
		);
	} else {
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
	}

	return container;
}
