import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const ENABLE_WORDS = ['on', 'enable', 'enabled', 'true', 'start'];
const DISABLE_WORDS = ['off', 'disable', 'disabled', 'false', 'stop'];
const TOGGLE_WORDS = ['toggle', 'switch'];

// ❌ AUTOPLAY COMMAND DISABLED - COMMENTED OUT FOR NOW
/*
export default {
	name: 'autoplay',
	description: 'Automatically queue related songs when the queue finishes.',
	aliases: ['auto'],
	usage: 'autoplay [on|off|toggle]',
	category: 'Music',

	async execute(message, args, client) {
		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const queue = client.queue.get(message.guildId);

		if (!queue) {
			return message.reply({
				content: '❌ There is no active music queue in this server.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (queue.voiceChannel && message.member.voice.channelId !== queue.voiceChannel.id) {
			return message.reply({
				content: '❌ You must be in the same voice channel as me to change autoplay.',
				allowedMentions: { repliedUser: false }
			});
		}

		const input = args[0]?.toLowerCase();

		if (!input || input === 'status') {
			const stateText = queue.autoplay ? '**Enabled**' : '**Disabled**';
			const container = buildAutoplayContainer({
				title: `${EMOJIS.autoplay || '🔁'} Autoplay`,
				body: `Autoplay is currently ${stateText}.\nUse \`${client.prefix}autoplay on\` to enable or \`${client.prefix}autoplay off\` to disable.`,
				footer: `Requested by ${message.author}`
			});
			return message.reply({
				content: null,
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let newState = queue.autoplay;

		if (ENABLE_WORDS.includes(input)) {
			newState = true;
		} else if (DISABLE_WORDS.includes(input)) {
			newState = false;
		} else if (TOGGLE_WORDS.includes(input)) {
			newState = !queue.autoplay;
		} else {
			return message.reply({
				content: '❌ Invalid option. Use `on`, `off`, or `toggle`.',
				allowedMentions: { repliedUser: false }
			});
		}

		queue.setAutoplay(newState);
		if (!newState) {
			queue.autoplayHistory?.clear?.();
		}

		const response = newState
			? `Autoplay is now **Enabled**.\n I will keep the music going with related songs.`
			: 'Autoplay is now **Disabled**.';

		const container = buildAutoplayContainer({
			title: `${EMOJIS.autoplay || '🔁'} Autoplay Updated`,
			body: response,
			footer: `Requested by ${message.author}`
		});

		return message.reply({
			content: null,
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

function buildAutoplayContainer({ title, body, footer }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${title}`)
	);

	if (body) {
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(body)
		);
	}

	if (footer) {
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(footer)
		);
	}

	return container;
}
*/

// Autoplay command is disabled - return null
export default null;
