import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	ensureStatsConfig,
	getServerStats,
	getTopMessageUsers,
	getTopMessageChannels,
	formatNumber,
	getDailyBreakdown,
	createSparkline
} from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'messages';
const aliases = ['msgstats', 'messagestats'];

function buildMessagesPanel(guild, stats, serverStats, topUsers, topChannels, breakdown, authorId, botName, view = 'overview') {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.messages || '💬'} Message Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const iconUrl = guild.iconURL({ size: 64, extension: 'png' });
	const messageValues = breakdown.map(d => d.messages);
	const sparkline = createSparkline(messageValues, 20);
	const avgDaily = Math.round(serverStats.totalMessages / (stats.lookback || 14));

	if (view === 'overview') {

		const overviewText = [
			`**${guild.name}**`,
			'',
			`${EMOJIS.messages || '💬'} **Total Messages:** ${formatNumber(serverStats.totalMessages)}`,
			`${EMOJIS.chart || '📈'} **Daily Average:** ${formatNumber(avgDaily)}`,
			`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(serverStats.activeUsers)}`,
			'',
			`**Activity (${stats.lookback || 14} days)**`,
			sparkline
		].join('\n');

		container.addSectionComponents(section => {
			section.addTextDisplayComponents(td => td.setContent(overviewText));
			if (iconUrl) {
				section.setThumbnailAccessory(thumb => thumb.setURL(iconUrl));
			}
			return section;
		});

	} else if (view === 'users') {

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.trophy || '🏆'} Top Message Users`));

		if (topUsers.length > 0) {
			const list = topUsers.slice(0, 10).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatNumber(u.count)} messages`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(list));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No message activity recorded*'));
		}

	} else if (view === 'channels') {

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.channelstats || '📁'} Top Message Channels`));

		if (topChannels.length > 0) {
			const list = topChannels.slice(0, 10).map((c, i) =>
				`**#${i + 1}** <#${c.channelId}> — ${formatNumber(c.count)} messages`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(list));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No message activity recorded*'));
		}
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`msg_view:${authorId}:overview`)
				.setLabel('Overview')
				.setStyle(view === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`msg_view:${authorId}:users`)
				.setLabel('Top Users')
				.setStyle(view === 'users' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`msg_view:${authorId}:channels`)
				.setLabel('Top Channels')
				.setStyle(view === 'channels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`msg_view:${authorId}:refresh`)
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.refresh ? { id: EMOJIS.refresh.match(/:(\d+)>/)?.[1] } : '🔄')
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Last ${stats.lookback || 14} days`));

	return container;
}

async function getMessagesData(client, guildId) {
	const stats = await ensureStatsConfig(client.db, guildId);

	const activeSessions = getActiveVoiceSessions(guildId);
	const totalActiveVoiceMinutes = activeSessions.reduce((sum, s) => sum + Math.floor(s.duration / 60000), 0);

	const serverStats = getServerStats(stats, null, totalActiveVoiceMinutes);
	const topUsers = getTopMessageUsers(stats, 50);
	const topChannels = getTopMessageChannels(stats, 50);
	const breakdown = getDailyBreakdown(stats);

	const messageContributors = new Set();
	const lookback = stats.lookback || 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	for (const [userId, user] of Object.entries(stats.users || {})) {
		const hasMessages = user.messages?.some(m => m.ts > cutoff);
		if (hasMessages) messageContributors.add(userId);
	}

	serverStats.activeUsers = messageContributors.size;

	return { stats, serverStats, topUsers, topChannels, breakdown };
}

const components = [
	{
		customId: /^msg_view:(\d+):(overview|users|channels|refresh)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^msg_view:(\d+):(overview|users|channels|refresh)$/);
			if (!match) return;

			const [, authorId, view] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const data = await getMessagesData(interaction.client, interaction.guildId);
			const botName = interaction.client.user.username;
			const actualView = view === 'refresh' ? 'overview' : view;
			const panel = buildMessagesPanel(
				interaction.guild,
				data.stats,
				data.serverStats,
				data.topUsers,
				data.topChannels,
				data.breakdown,
				authorId,
				botName,
				actualView
			);

await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
		}
	}
];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const data = await getMessagesData(client, message.guildId);
	const botName = client.user.username;
	const panel = buildMessagesPanel(
		message.guild,
		data.stats,
		data.serverStats,
		data.topUsers,
		data.topChannels,
		data.breakdown,
		message.author.id,
		botName,
		'overview'
	);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View message statistics',
	aliases,
	execute,
	components
};
