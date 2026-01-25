import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'choose';
const aliases = ['pick', 'choice'];
const description = 'Randomly picks one option from a list separated by |';
const usage = 'choose <option1> | <option2> | ...';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	const input = args.join(' ');
	if (!input) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please provide options separated by | (e.g. \`.choose Pizza | Burger\`)`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const options = input.split('|').map(o => o.trim()).filter(o => o.length > 0);

	if (options.length < 2) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please provide at least two options separated by |`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const choice = options[Math.floor(Math.random() * options.length)];

	container.addTextDisplayComponents(td =>
		td.setContent(`**🤔 I choose...**\n\n✨ **${choice}**`)
	);

	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Fun', execute };
