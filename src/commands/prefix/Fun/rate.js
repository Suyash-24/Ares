import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'rate';
const aliases = ['ratewaifu', 'rating'];
const description = 'Rates a user or text on a scale of 0-100.';
const usage = 'rate [user/text]';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	let subject = 'You';
	if (args.length > 0) {

		if (message.mentions.users.size > 0 && args[0].startsWith('<@')) {
			subject = message.mentions.users.first().username;
		} else {
			subject = args.join(' ');
		}
	} else {
		subject = message.author.username;
	}

	const score = Math.floor(Math.random() * 101);

	let stars = '';

	const filled = Math.round((score / 100) * 5);
	stars = '★'.repeat(filled) + '☆'.repeat(5 - filled);

	container.addTextDisplayComponents(td =>
		td.setContent(`**📝 Rating**\n\nI rate **${subject}**\n**${score}/100**\n${stars}`)
	);

	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Fun', execute };
