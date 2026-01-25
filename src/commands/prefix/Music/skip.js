import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'skip',
	description: 'Skip the currently playing track',
	aliases: ['next'],
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

		const currentTrack = queue.tracks.peekAt(0);
		if (!currentTrack) {
			return message.reply({
				content: '❌ There\'s no track currently playing.',
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			await queue.skip();

			const queueSize = queue.tracks.length - 1;
			const container = buildSkipContainer({
				skipped: currentTrack.info.title,
				remaining: queueSize
			});

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in skip command:', error);
			return message.reply({
				content: '❌ An error occurred while skipping the track.',
				allowedMentions: { repliedUser: false }
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
