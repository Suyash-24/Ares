import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'levels-update';
const aliases = ['update-level-role', 'levelrole-update', 'add-level-role', 'levelrole-add'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Manage Server** permission.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const roleId = args[0]?.replace(/\D/g, '');
	const newLevel = parseInt(args[1], 10);

	if (!roleId || isNaN(newLevel) || newLevel < 1 || newLevel > 1000) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`levels-update <@role> <level>\` (1-1000)`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const role = message.guild.roles.cache.get(roleId);
	if (!role) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Role not found.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const botMember = message.guild.members.me;
	if (role.position >= botMember.roles.highest.position) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} I cannot manage ${role} - it's higher than my highest role.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	const rewardIndex = leveling.rewards.roles.findIndex(r => r.roleId === roleId);

	const c = new ContainerBuilder();

	if (rewardIndex === -1) {

		leveling.rewards.roles.push({ level: newLevel, roleId: role.id });
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Role Reward Added`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.roles || '🎭'} <@&${role.id}> will be awarded at **Level ${newLevel}**`));
	} else {

		const oldLevel = leveling.rewards.roles[rewardIndex].level;
		leveling.rewards.roles[rewardIndex].level = newLevel;
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Role Reward Updated`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.roles || '🎭'} <@&${role.id}> changed from Level **${oldLevel}** → **${newLevel}**`));
	}

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });
	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, category: 'Leveling', description: 'Update leveling settings', execute };
