import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('levels-reset')
		.setDescription('Reset ALL members\' level and XP (irreversible!)')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);

		const memberCount = Object.keys(leveling.members || {}).length;
		if (memberCount === 0) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} No members to reset.`));
			return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
		}

		leveling.members = {};

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Levels Reset`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} Reset level and XP for **${memberCount}** members.`));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
