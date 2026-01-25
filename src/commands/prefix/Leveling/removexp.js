import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'removexp';
const aliases = ['remove-xp', 'takexp'];

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
	const amount = parseInt(args[1], 10);

	if (!userId || isNaN(amount) || amount < 1) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`removexp <@user> <amount>\``));
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
	state.xp -= amount;
	state.totalXp = Math.max(0, state.totalXp - amount);

	while (state.xp < 0 && state.level > 0) {
		state.level -= 1;
		const needed = xpToNextLevel(state.level, leveling);
		state.xp += needed;
	}
	state.xp = Math.max(0, state.xp);

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} XP Removed`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	const levelMsg = oldLevel !== state.level ? `\n${EMOJIS.trending || '📉'} Level: **${oldLevel}** → **${state.level}**` : '';
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.star || '⭐'} Removed **${amount.toLocaleString()}** XP from **${member.user.username}**${levelMsg}`));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Remove XP from a user', execute };
