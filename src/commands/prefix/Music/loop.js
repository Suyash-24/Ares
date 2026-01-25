import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'loop',
	description: 'Set loop mode: off, once, or all',
	aliases: ['repeat'],
	usage: 'loop <off|once|all>',
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

		if (!args.length) {
			const modeEmoji = {
				'OFF': '❌',
				'ONCE': '🔂',
				'ALL': '🔁'
			};

			const modeText = {
				'OFF': 'Loop Off',
				'ONCE': 'Loop Once (current track)',
				'ALL': 'Loop All (entire queue)'
			};

			const container = buildLoopContainer({
				title: `${EMOJIS.loop} Current loop mode`,
				mode: modeText[queue.repeat],
				usage: `Usage: \`${client.prefix}loop <off|once|all>\``
			});

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const mode = args[0].toLowerCase();

		if (!['off', 'once', 'all'].includes(mode)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Mode`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Use: `off`, `once`, or `all`')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
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

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
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

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
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
