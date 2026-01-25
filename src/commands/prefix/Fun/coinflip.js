import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'coinflip';
const aliases = ['cf', 'flip', 'toss'];
const description = 'Flips a coin.';
const usage = 'coinflip';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
	const emoji = result === 'Heads' ? '🪙' : '🪙';

	container.addTextDisplayComponents(td =>
		td.setContent(`**${emoji} Coin Flip Result**\n\nThe coin landed on **${result}**!`)
	);

	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Fun', execute };
