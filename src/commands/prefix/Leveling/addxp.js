import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'addxp';
const aliases = ['add-xp', 'givexp'];

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
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`addxp <@user> <amount>\``));
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
	state.xp += amount;
	state.totalXp += amount;

	let leveledUp = false;
	while (state.xp >= xpToNextLevel(state.level, leveling)) {
		state.xp -= xpToNextLevel(state.level, leveling);
		state.level += 1;
		leveledUp = true;
	}

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} XP Added`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	const levelMsg = leveledUp ? `\n${EMOJIS.trending || '📈'} Level: **${oldLevel}** → **${state.level}**` : '';
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.star || '⭐'} Added **${amount.toLocaleString()}** XP to **${member.user.username}**${levelMsg}`));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Add XP to a user', execute };
