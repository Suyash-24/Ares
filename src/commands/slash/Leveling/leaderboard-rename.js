import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('levels-leaderboard-rename')
		.setDescription('Set a custom title for the leaderboard')
		.addStringOption(opt => opt.setName('title').setDescription('Custom title (max 50 chars)').setRequired(true).setMaxLength(50))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		const title = interaction.options.getString('title');

		leveling.leaderboardTitle = title;

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Leaderboard Renamed`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.leaderboard || '🏆'} Leaderboard title set to: **${title}**`));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
