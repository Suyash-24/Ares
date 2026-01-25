import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'setlevel';
const aliases = ['set-level'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Manage Server** permission.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	if (!leveling.enabled) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const userId = args[0]?.replace(/\D/g, '');
	const newLevel = parseInt(args[1], 10);

	if (!userId || isNaN(newLevel) || newLevel < 0 || newLevel > 1000) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`setlevel <@user> <level>\` (0-1000)`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const member = await message.guild.members.fetch(userId).catch(() => null);
	if (!member) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Member not found.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const state = getMemberSnapshot(leveling, userId);
	const oldLevel = state.level;
	state.level = newLevel;
	state.xp = 0;

	let totalForLevel = 0;
	for (let i = 0; i < newLevel; i++) {
		totalForLevel += 5 * i * i + 50 * i + 100;
	}
	state.totalXp = totalForLevel;

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Level Set`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.trending || '📊'} Set **${member.user.username}**'s level to **${newLevel}**\n-# Was level ${oldLevel}`));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Set a user\'s level', execute };
