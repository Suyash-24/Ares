import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel, getRankPosition } from '../../../utils/leveling.js';
import { buildProfile } from '../../prefix/Leveling/rank.js';
import { renderRankCard } from '../../../utils/rankCard.js';

export default {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('Show a member\'s level profile')
		.addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(false))
		.setDMPermission(false),
	async execute(interaction) {
		const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
		if (!leveling.enabled) return interaction.reply({ content: '❌ Leveling is disabled here.', ephemeral: true });
		const target = interaction.options.getUser('user') || interaction.user;
		const member = await interaction.guild.members.fetch(target.id).catch(() => null);
		const state = getMemberSnapshot(leveling, target.id);
		await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
		const nextNeeded = xpToNextLevel(state.level, leveling);
		const { position } = getRankPosition(leveling, target.id);
		const buffer = await renderRankCard({ user: target, state, leveling, position, nextXp: nextNeeded });
		const container = buildProfile(target, state, leveling, interaction.client);
		const payload = { components: [container], flags: MessageFlags.IsComponentsV2 };
		if (buffer) payload.files = [{ attachment: buffer, name: 'rank.png' }];
		await interaction.reply(payload);
	},
	components: []
};
