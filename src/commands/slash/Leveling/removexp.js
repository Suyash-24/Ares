import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('removexp')
		.setDescription('Remove experience points from a user')
		.addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
		.addIntegerOption(opt => opt.setName('amount').setDescription('XP amount to remove').setRequired(true).setMinValue(1))
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
		const amount = interaction.options.getInteger('amount');
		const state = getMemberSnapshot(leveling, target.id);

		const oldLevel = state.level;
		state.xp -= amount;
		state.totalXp = Math.max(0, state.totalXp - amount);

		while (state.xp < 0 && state.level > 0) {
			state.level -= 1;
			const needed = xpToNextLevel(state.level, leveling);
			state.xp += needed;
		}
		state.xp = Math.max(0, state.xp);
		const leveledDown = state.level < oldLevel;

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} XP Removed`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		const levelMsg = leveledDown ? `\n${EMOJIS.trending || '📉'} Level: **${oldLevel}** → **${state.level}**` : '';
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.star || '⭐'} Removed **${amount.toLocaleString()}** XP from **${target.username}**${levelMsg}`));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
