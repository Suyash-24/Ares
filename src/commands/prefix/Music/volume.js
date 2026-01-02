import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'volume',
	description: 'Adjust the music volume (1-100)',
	aliases: ['vol'],
	usage: 'volume <number>',
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
			const currentVolume = queue.player?.state?.volume || 100;
			const container = buildVolumeContainer({
				title: `${EMOJIS.volume} Current Volume`,
				volume: currentVolume,
				usage: `Usage: \`${client.prefix}volume <1-100>\``
			});

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const volume = parseInt(args[0]);

	if (isNaN(volume) || volume < 1 || volume > 100) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.error || '❌'} Invalid Volume`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent('Volume must be a number between 1 and 100.')
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}		try {
			await queue.setVolume(volume);
			const container = buildVolumeContainer({
				title: `${EMOJIS.volume} Volume Updated`,
				volume: volume
			});

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in volume command:', error);
			message.reply({
				content: '❌ An error occurred while adjusting the volume.',
				allowedMentions: { repliedUser: false }
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
