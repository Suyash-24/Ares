import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'levels-messages';
const aliases = ['toggle-levelup', 'levelup-toggle'];

async function execute(message, args, client) {
	const setting = args[0]?.toLowerCase();

	if (!['enable', 'disable', 'on', 'off'].includes(setting)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`levels-messages <enable|disable>\``));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	if (!leveling.enabled) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const state = getMemberSnapshot(leveling, message.author.id);
	state.muteAnnouncements = setting === 'disable' || setting === 'off';

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${state.muteAnnouncements ? '🔇' : '🔔'} Level-Up Messages`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	c.addTextDisplayComponents(td => td.setContent(
		state.muteAnnouncements
			? `${EMOJIS.success || '✅'} Level-up messages **disabled** for you.`
			: `${EMOJIS.success || '✅'} Level-up messages **enabled** for you.`
	));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'View message XP stats', execute };
