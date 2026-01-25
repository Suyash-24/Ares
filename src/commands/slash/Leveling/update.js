import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('levels-update')
		.setDescription('Add or update a role reward for a specific level')
		.addRoleOption(opt => opt.setName('role').setDescription('The role to add/update').setRequired(true))
		.addIntegerOption(opt => opt.setName('level').setDescription('Level requirement').setRequired(true).setMinValue(1).setMaxValue(1000))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		const role = interaction.options.getRole('role');
		const targetLevel = interaction.options.getInteger('level');

		const botMember = interaction.guild.members.me;
		if (role.position >= botMember.roles.highest.position) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} I cannot assign ${role} as it's higher than or equal to my highest role.`));
			return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
		}

		const existingIndex = leveling.rewards.roles.findIndex(r => r.roleId === role.id);
		let isUpdate = false;
		let oldLevel = null;

		if (existingIndex !== -1) {

			oldLevel = leveling.rewards.roles[existingIndex].level;
			leveling.rewards.roles[existingIndex].level = targetLevel;
			isUpdate = true;
		} else {

			leveling.rewards.roles.push({ roleId: role.id, level: targetLevel });
		}

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		if (isUpdate) {
			c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Role Reward Updated`));
			c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.roles || '🎭'} Updated ${role}: Level **${oldLevel}** → **${targetLevel}**`));
		} else {
			c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Role Reward Added`));
			c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.roles || '🎭'} ${role} will be awarded at level **${targetLevel}**`));
		}

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
