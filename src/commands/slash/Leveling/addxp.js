import { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('addxp')
		.setDescription('Add experience points to a user')
		.addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
		.addIntegerOption(opt => opt.setName('amount').setDescription('XP amount to add').setRequired(true).setMinValue(1))
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
		state.xp += amount;
		state.totalXp += amount;

		let leveledUp = false;
		while (state.xp >= xpToNextLevel(state.level, leveling)) {
			state.xp -= xpToNextLevel(state.level, leveling);
			state.level += 1;
			leveledUp = true;
		}

		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} XP Added`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		const levelMsg = leveledUp ? `\n${EMOJIS.trending || '📈'} Level: **${oldLevel}** → **${state.level}**` : '';
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.star || '⭐'} Added **${amount.toLocaleString()}** XP to **${target.username}**${levelMsg}`));

		await interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
	},
	components: []
};
