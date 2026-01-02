import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Set loop mode: off, once, or all')
		.addStringOption(option =>
			option.setName('mode')
				.setDescription('Loop mode to set')
				.setRequired(false)
				.addChoices(
					{ name: 'Off', value: 'off' },
					{ name: 'Once (current track)', value: 'once' },
					{ name: 'All (entire queue)', value: 'all' }
				)
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

		const mode = interaction.options.getString('mode');

		if (!mode) {
			const modeText = {
				'OFF': 'Loop Off',
				'ONCE': 'Loop Once (current track)',
				'ALL': 'Loop All (entire queue)'
			};

			const container = buildLoopContainer({
				title: `${EMOJIS.loop} Current loop mode`,
				mode: modeText[queue.repeat],
				usage: 'Use `/loop <mode>` to change'
			});

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		try {
			const modeUpper = mode.toUpperCase();
			queue.setRepeat(modeUpper);

			const modeText = {
				'off': 'Loop Off',
				'once': 'Loop Once (repeating current song)',
				'all': 'Loop All (repeating entire queue)'
			};

			const container = buildLoopContainer({
				title: `${EMOJIS.loop} Loop mode set to`,
				mode: modeText[mode]
			});

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in loop command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while setting loop mode.')
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}
	}
};

function buildLoopContainer({ title, mode, usage }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${title}`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	let content = `**${mode}**`;
	if (usage) {
		content += `\n\n${usage}`;
	}

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(content)
	);

	return container;
}
