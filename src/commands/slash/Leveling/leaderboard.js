import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import { buildPage } from '../../prefix/Leveling/leaderboard.js';

export default {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('View the leveling leaderboard')
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		if (!leveling.enabled) return interaction.reply({ content: '❌ Leveling is disabled here.', ephemeral: true });
		const panel = buildPage(leveling, 0, interaction.user.id);
		await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } });
	},
	components: []
};
