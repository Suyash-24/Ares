import { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('levels-messages')
		.setDescription('Toggle level-up messages for yourself')
		.addStringOption(opt =>
			opt.setName('setting')
				.setDescription('Enable or disable level-up messages')
				.setRequired(true)
				.addChoices(
					{ name: 'Enable', value: 'enable' },
					{ name: 'Disable', value: 'disable' }
				))
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		if (!leveling.enabled) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled.`));
			return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
		}

		const setting = interaction.options.getString('setting');
		const state = getMemberSnapshot(leveling, interaction.user.id);

		state.muteAnnouncements = setting === 'disable';

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${state.muteAnnouncements ? '🔇' : '🔔'} Level-Up Messages`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(
			state.muteAnnouncements
				? `${EMOJIS.success || '✅'} Level-up messages **disabled** for you.`
				: `${EMOJIS.success || '✅'} Level-up messages **enabled** for you.`
		));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
