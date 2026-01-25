import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('setlevel')
		.setDescription('Set a user\'s level')
		.addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
		.addIntegerOption(opt => opt.setName('level').setDescription('Level to set').setRequired(true).setMinValue(0).setMaxValue(1000))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		if (!leveling.enabled) {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled.`));
			return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
		}

		const target = interaction.options.getUser('user');
		const newLevel = interaction.options.getInteger('level');
		const state = getMemberSnapshot(leveling, target.id);

		const oldLevel = state.level;
		state.level = newLevel;
		state.xp = 0;

		let totalForLevel = 0;
		for (let i = 0; i < newLevel; i++) {
			totalForLevel += 5 * i * i + 50 * i + 100;
		}
		state.totalXp = totalForLevel;

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Level Set`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.trending || '📊'} Set **${target.username}**'s level to **${newLevel}**\n-# Was level ${oldLevel}`));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
