import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags
} from 'discord.js';
import { ensureLevelingConfig, getLeaderboard } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'leaderboard';
const aliases = ['lb', 'levels-top', 'leveltop'];

const PER_PAGE = 10;

export const buildPage = (leveling, page, authorId, guild = null, botName = 'Ares') => {
	const entries = getLeaderboard(leveling, 200);
	const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
	const current = Math.min(Math.max(0, page), totalPages - 1);
	const slice = entries.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);
	const title = leveling.leaderboardTitle || 'Leaderboard';

	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.trophy || '🏆'} ${title}`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const serverIcon = guild?.iconURL?.({ size: 128 });

	if (!slice.length) {
		container.addTextDisplayComponents(td => td.setContent('No tracked members yet.'));
	} else {

		const entriesText = slice.map((entry, idx) => {
			const rank = current * PER_PAGE + idx + 1;
			const needed = 5 * entry.level * entry.level + 50 * entry.level + 100;
			const progress = Math.min(100, Math.round((entry.xp / needed) * 100));
			const barLength = 20;
			const filledBars = Math.floor((progress / 100) * barLength);
			const progressBar = '█'.repeat(filledBars) + '░'.repeat(barLength - filledBars);
			return `**#${rank} — [Lvl. ${entry.level}] <@${entry.userId}>**\n${progressBar} \`${progress}%\``;
		}).join('\n\n');

		if (serverIcon) {
			container.addSectionComponents(section => {
				section.addTextDisplayComponents(td => td.setContent(entriesText));
				section.setThumbnailAccessory(thumbnail => thumbnail.setURL(serverIcon));
				return section;
			});
		} else {
			container.addTextDisplayComponents(td => td.setContent(entriesText));
		}
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`Page ${current + 1}/${totalPages} • ${botName}`));

	if (totalPages > 1) {
		container.addActionRowComponents(row => row.addComponents(
			new ButtonBuilder()
				.setCustomId(`level_lb_prev:${authorId}:${current - 1}`)
				.setLabel('Previous')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(current === 0),
			new ButtonBuilder()
				.setCustomId(`level_lb_home:${authorId}`)
				.setLabel('Home')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(current === 0),
			new ButtonBuilder()
				.setCustomId(`level_lb_next:${authorId}:${current + 1}`)
				.setLabel('Next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(current >= totalPages - 1)
		));
	}

	return container;
};

const components = [
	{
		customId: /^level_lb_(prev|next|home):(\d+)(?::(-?\d+))?$/,
		execute: async (interaction) => {
			const [, action, authorId, pageStr] = interaction.customId.match(/^level_lb_(prev|next|home):(\d+)(?::(-?\d+))?$/) || [];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ This panel is locked to the invoker.', ephemeral: true });
				return;
			}
			const page = action === 'home' ? 0 : (parseInt(pageStr, 10) || 0);
			const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
			if (!leveling.enabled) {
				await interaction.reply({ content: '❌ Leveling is disabled here.', ephemeral: true });
				return;
			}
			const panel = buildPage(leveling, page, authorId, interaction.guild, interaction.client.user.username);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => {});
		}
	}
];

async function execute(message, args, client) {
	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	if (!leveling.enabled) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled here.`));
		await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		return;
	}
	const panel = buildPage(leveling, 0, message.author.id, message.guild, client.user.username);
	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default {
	name,
	category: 'Leveling',
	description: 'View XP leaderboard',
	aliases,
	execute,
	components
};
