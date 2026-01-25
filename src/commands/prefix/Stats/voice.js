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
	getTopVoiceUsers,
	getTopVoiceChannels,
	formatVoiceTime,
	formatNumber,
	getDailyBreakdown,
	createSparkline
} from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'voice';
const aliases = ['voicestats', 'vc', 'vcstats'];

function buildVoicePanel(guild, stats, serverStats, topUsers, topChannels, breakdown, authorId, botName, view = 'overview') {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.voicestats || '🎤'} Voice Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const iconUrl = guild.iconURL({ size: 64, extension: 'png' });
	const voiceValues = breakdown.map(d => d.voice);
	const sparkline = createSparkline(voiceValues, 20);
	const avgDaily = Math.round(serverStats.totalVoiceMinutes / (stats.lookback || 14));

	if (view === 'overview') {

		const overviewText = [
			`**${guild.name}**`,
			'',
			`${EMOJIS.voicestats || '🎤'} **Total Time:** ${formatVoiceTime(serverStats.totalVoiceMinutes)}`,
			`${EMOJIS.chart || '📈'} **Daily Average:** ${formatVoiceTime(avgDaily)}`,
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

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.trophy || '🏆'} Top Voice Users`));

		if (topUsers.length > 0) {
			const list = topUsers.slice(0, 10).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(list));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No voice activity recorded*'));
		}

	} else if (view === 'channels') {

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.channelstats || '📁'} Top Voice Channels`));

		if (topChannels.length > 0) {
			const list = topChannels.slice(0, 10).map((c, i) =>
				`**#${i + 1}** <#${c.channelId}> — ${formatVoiceTime(c.minutes)}`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(list));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No voice activity recorded*'));
		}
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`voice_view:${authorId}:overview`)
				.setLabel('Overview')
				.setStyle(view === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`voice_view:${authorId}:users`)
				.setLabel('Top Users')
				.setStyle(view === 'users' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`voice_view:${authorId}:channels`)
				.setLabel('Top Channels')
				.setStyle(view === 'channels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`voice_view:${authorId}:refresh`)
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

async function getVoiceData(client, guildId) {
	const stats = await ensureStatsConfig(client.db, guildId);

	const activeSessions = getActiveVoiceSessions(guildId);
	const totalActiveVoiceMinutes = activeSessions.reduce((sum, s) => sum + Math.floor(s.duration / 60000), 0);

	const serverStats = getServerStats(stats, null, totalActiveVoiceMinutes);
	let topUsers = getTopVoiceUsers(stats, 50);
	const topChannels = getTopVoiceChannels(stats, 50);
	const breakdown = getDailyBreakdown(stats);

	for (const active of activeSessions) {
		const activeMinutes = Math.floor(active.duration / 60000);
		const existingIndex = topUsers.findIndex(u => u.userId === active.userId);

		if (existingIndex >= 0) {
			topUsers[existingIndex].minutes += activeMinutes;
		} else {

			topUsers.push({ userId: active.userId, minutes: activeMinutes });
		}
	}

	topUsers = topUsers.sort((a, b) => b.minutes - a.minutes).slice(0, 50);

	const voiceContributors = new Set();
	const lookback = stats.lookback || 14;
	const cutoff = Date.now() - (lookback * 24 * 60 * 60 * 1000);

	for (const [userId, user] of Object.entries(stats.users || {})) {
		const hasVoice = user.voice?.some(v => v.ts > cutoff);
		if (hasVoice) voiceContributors.add(userId);
	}

	for (const active of activeSessions) {
		voiceContributors.add(active.userId);
	}

	serverStats.activeUsers = voiceContributors.size;

	return { stats, serverStats, topUsers, topChannels, breakdown };
}

const components = [
	{
		customId: /^voice_view:(\d+):(overview|users|channels|refresh)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^voice_view:(\d+):(overview|users|channels|refresh)$/);
			if (!match) return;

			const [, authorId, view] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const data = await getVoiceData(interaction.client, interaction.guildId);
			const botName = interaction.client.user.username;
			const actualView = view === 'refresh' ? 'overview' : view;
			const panel = buildVoicePanel(
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

	const data = await getVoiceData(client, message.guildId);
	const botName = client.user.username;
	const panel = buildVoicePanel(
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
	description: 'View voice statistics',
	aliases,
	execute,
	components
};
