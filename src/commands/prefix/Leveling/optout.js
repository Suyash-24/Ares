import { ContainerBuilder, MessageFlags } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'leveloptout';
const aliases = ['level-optout', 'levels-optout', 'leveltoggle'];

const buildReply = (enabled) => {
	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`${enabled ? EMOJIS.off || '🚫' : EMOJIS.success || '✅'} Leveling ${enabled ? 'disabled' : 'enabled'} for you.`));
	return c;
};

async function execute(message) {
	await message.reply({ content: 'Opt-out is no longer available. Leveling is always active.', allowedMentions: { repliedUser: false } });
}

export default {
	name,
	category: 'Leveling',
	description: 'Opt out of leveling',
	aliases,
	execute
};
