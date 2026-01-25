import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'roll';
const aliases = ['dice', 'random'];
const description = 'Rolls a dice between 1 and a specified limit (default 100).';
const usage = 'roll [limit]';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	let limit = 100;
	if (args[0]) {
		const parsed = parseInt(args[0]);
		if (!isNaN(parsed) && parsed > 0) {
			limit = parsed;
		}
	}

	const result = Math.floor(Math.random() * limit) + 1;

	container.addTextDisplayComponents(td =>
		td.setContent(`**🎲 Dice Roll**\n\nYou rolled a **${result}** (1-${limit})`)
	);

	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Fun', execute };
