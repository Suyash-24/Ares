import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'levels-reset';
const aliases = ['resetlevels', 'reset-levels'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Administrator** permission.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	const memberCount = Object.keys(leveling.members || {}).length;

	if (memberCount === 0) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} No members to reset.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	leveling.members = {};

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Levels Reset`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} Reset level and XP for **${memberCount}** members.`));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Reset leveling data', execute };
