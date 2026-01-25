import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import { buildDashboard } from '../../prefix/Leveling/leveling.js';

export default {
	data: new SlashCommandBuilder()
		.setName('leveling')
		.setDescription('Manage leveling settings')
		.setDefaultMemberPermissions(1 << 5)
		.setDMPermission(false),
	async execute(interaction) {
		if (!interaction.memberPermissions.has('ManageGuild') && !interaction.memberPermissions.has('Administrator')) {
			return interaction.reply({ content: '❌ Manage Server is required.', ephemeral: true });
		}

		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		const panel = buildDashboard(leveling, interaction.user.id);
		await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
	},
	components: []
};
