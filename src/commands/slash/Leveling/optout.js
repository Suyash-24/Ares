import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';

export default {
	data: new SlashCommandBuilder()
		.setName('level-optout')
		.setDescription('Opt in or out of leveling XP tracking for yourself')
		.setDMPermission(false),
	async execute(interaction) {
		await interaction.reply({ content: 'Opt-out is no longer available. Leveling is always active.', flags: MessageFlags.Ephemeral });
	},
	components: []
};
