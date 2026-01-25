import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('levels-cleanup')
		.setDescription('Reset level & XP for members who left the server')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {
		const loadingContainer = new ContainerBuilder();
		loadingContainer.addTextDisplayComponents(td => td.setContent(`${EMOJIS.loading || '🔄'} Checking for absent members...`));
		await interaction.reply({ components: [loadingContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		const memberIds = Object.keys(leveling.members || {});

		if (memberIds.length === 0) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} No members to check.`));
			return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
		}

		let removed = 0;
		for (const userId of memberIds) {
			const member = await interaction.guild.members.fetch(userId).catch(() => null);
			if (!member) {
				delete leveling.members[userId];
				removed++;
			}
		}

		if (removed === 0) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Cleanup Complete`));
			c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} No absent members found. All tracked users are still in the server.`));
			return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
		}

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Cleanup Complete`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} Cleaned up **${removed}** absent member(s) from leveling data.`));

		await interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
	},
	components: []
};
