import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel } from '../../../utils/leveling.js';

const name = 'setxp';
const aliases = ['set-xp'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
		return message.reply({ content: '❌ You need **Manage Server** permission.', allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	if (!leveling.enabled) return message.reply({ content: '❌ Leveling is disabled.', allowedMentions: { repliedUser: false } });

	const userId = args[0]?.replace(/\D/g, '');
	const amount = parseInt(args[1], 10);

	if (!userId || isNaN(amount) || amount < 0) {
		return message.reply({ content: '❌ Usage: `setxp <@user> <amount>`', allowedMentions: { repliedUser: false } });
	}

	const member = await message.guild.members.fetch(userId).catch(() => null);
	if (!member) return message.reply({ content: '❌ Member not found.', allowedMentions: { repliedUser: false } });

	const state = getMemberSnapshot(leveling, userId);
	const oldXp = state.xp;
	state.xp = amount;
	state.totalXp = Math.max(0, state.totalXp - oldXp + amount);

	while (state.xp >= xpToNextLevel(state.level, leveling)) {
		state.xp -= xpToNextLevel(state.level, leveling);
		state.level += 1;
	}

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });
	await message.reply({ content: `✅ Set **${member.user.username}**'s XP to **${amount.toLocaleString()}** (Level ${state.level})`, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Set a user\'s XP', execute };
