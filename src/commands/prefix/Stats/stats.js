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
	getTopVoiceUsers,
	formatVoiceTime,
	formatNumber,
	getDailyBreakdown,
	createSparkline
} from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'stats';
const aliases = ['serverstats', 'activity'];

function buildStatsPanel(guild, stats, serverStats, topMessages, topVoice, breakdown, authorId, botName) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.stats || '📊'} Server Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const iconUrl = guild.iconURL({ size: 128, extension: 'png' });

	const overviewText = [
		`**${guild.name}**`,
		'',
		`${EMOJIS.members || '👥'} **Members:** ${formatNumber(guild.memberCount)}`,
		`${EMOJIS.users || '👤'} **Active Users:** ${formatNumber(serverStats.activeUsers)}`,
		`${EMOJIS.channelstats || '📁'} **Active Channels:** ${formatNumber(serverStats.activeChannels)}`,
		'',
		`*Stats from the last ${serverStats.lookback} days*`
	].join('\n');

	container.addSectionComponents(section => {
		section.addTextDisplayComponents(td => td.setContent(overviewText));
		if (iconUrl) {
			section.setThumbnailAccessory(thumb => thumb.setURL(iconUrl));
		}
		return section;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const messageValues = breakdown.map(d => d.messages);
	const messageSparkline = createSparkline(messageValues);

	container.addTextDisplayComponents(td => td.setContent(
		`### ${EMOJIS.messages || '💬'} Messages\n` +
		`**Total:** ${formatNumber(serverStats.totalMessages)}\n` +
		`\`${messageSparkline}\``
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const voiceValues = breakdown.map(d => d.voice);
	const voiceSparkline = createSparkline(voiceValues);

	container.addTextDisplayComponents(td => td.setContent(
		`### ${EMOJIS.voicestats || '🎤'} Voice\n` +
		`**Total:** ${formatVoiceTime(serverStats.totalVoiceMinutes)}\n` +
		`\`${voiceSparkline}\``
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	let topText = `### ${EMOJIS.trophy || '🏆'} Top Contributors\n`;

if (topMessages.length > 0 || topVoice.length > 0) {
		const topMsgUser = topMessages[0];
		const topVoiceUser = topVoice[0];

		if (topMsgUser) {
			topText += `${EMOJIS.messages || '💬'} <@${topMsgUser.userId}> — ${formatNumber(topMsgUser.count)} msgs\n`;
		}
		if (topVoiceUser) {
			topText += `${EMOJIS.voicestats || '🎤'} <@${topVoiceUser.userId}> — ${formatVoiceTime(topVoiceUser.minutes)}`;
		}
	} else {
		topText += '*No activity recorded yet*';
	}

	container.addTextDisplayComponents(td => td.setContent(topText));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:top`)
				.setLabel('Top')
				.setStyle(ButtonStyle.Primary)
				.setEmoji(EMOJIS.trophy ? { id: EMOJIS.trophy.match(/:(\d+)>/)?.[1] } : '🏆'),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:messages`)
				.setLabel('Messages')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.messages ? { id: EMOJIS.messages.match(/:(\d+)>/)?.[1] } : '💬'),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:voice`)
				.setLabel('Voice')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.voicestats ? { id: EMOJIS.voicestats.match(/:(\d+)>/)?.[1] } : '🎤'),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:refresh`)
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.refresh ? { id: EMOJIS.refresh.match(/:(\d+)>/)?.[1] } : '🔄')
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td =>
		td.setContent(`${botName} • Use \`.top\`, \`.messages\`, \`.voice\` for detailed views`)
	);

	return container;
}

function buildTopPanel(guild, stats, topMessages, topVoice, authorId, botName, page = 'overview') {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.trophy || '🏆'} Top — ${guild.name}`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	if (page === 'overview') {

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.messages || '💬'} Top Message Users`));

		if (topMessages.length > 0) {
			const msgList = topMessages.slice(0, 5).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatNumber(u.count)} msgs`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(msgList));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No message activity recorded*'));
		}

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.voicestats || '🎤'} Top Voice Users`));

		if (topVoice.length > 0) {
			const voiceList = topVoice.slice(0, 5).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(voiceList));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No voice activity recorded*'));
		}
	} else if (page === 'messages') {
		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.messages || '💬'} Top Message Users`));

		if (topMessages.length > 0) {
			const msgList = topMessages.slice(0, 10).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatNumber(u.count)} msgs`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(msgList));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No message activity recorded*'));
		}
	} else if (page === 'voice') {
		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.voicestats || '🎤'} Top Voice Users`));

		if (topVoice.length > 0) {
			const voiceList = topVoice.slice(0, 10).map((u, i) =>
				`**#${i + 1}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`
			).join('\n');
			container.addTextDisplayComponents(td => td.setContent(voiceList));
		} else {
			container.addTextDisplayComponents(td => td.setContent('*No voice activity recorded*'));
		}
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`stats_top:${authorId}:overview`)
				.setLabel('Overview')
				.setStyle(page === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_top:${authorId}:messages`)
				.setLabel('Messages')
				.setStyle(page === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_top:${authorId}:voice`)
				.setLabel('Voice')
				.setStyle(page === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:main`)
				.setLabel('Back')
				.setStyle(ButtonStyle.Secondary)
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td =>
		td.setContent(`${botName} • Last ${stats.lookback || 14} days`)
	);

	return container;
}

function buildMessagesPanel(guild, stats, serverStats, topMessages, breakdown, authorId, botName) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.messages || '💬'} Message Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const messageValues = breakdown.map(d => d.messages);
	const sparkline = createSparkline(messageValues, 20);
	const avgDaily = Math.round(serverStats.totalMessages / (stats.lookback || 14));

	container.addTextDisplayComponents(td => td.setContent(
		`**${guild.name}**\n\n` +
		`${EMOJIS.messages || '💬'} **Total Messages:** ${formatNumber(serverStats.totalMessages)}\n` +
		`${EMOJIS.chart || '📈'} **Daily Average:** ${formatNumber(avgDaily)}\n` +
		`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(serverStats.activeUsers)}\n\n` +
		`**Activity (${stats.lookback || 14} days)**\n\`${sparkline}\``
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.trophy || '🏆'} Top Senders`));

	if (topMessages.length > 0) {
		const msgList = topMessages.slice(0, 5).map((u, i) =>
			`**#${i + 1}** <@${u.userId}> — ${formatNumber(u.count)}`
		).join('\n');
		container.addTextDisplayComponents(td => td.setContent(msgList));
	} else {
		container.addTextDisplayComponents(td => td.setContent('*No activity yet*'));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:main`)
				.setLabel('Overview')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:voice`)
				.setLabel('Voice')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:top`)
				.setLabel('Top')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:refresh_msg`)
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Last ${stats.lookback || 14} days`));

	return container;
}

function buildVoicePanel(guild, stats, serverStats, topVoice, breakdown, authorId, botName) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.voicestats || '🎤'} Voice Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const voiceValues = breakdown.map(d => d.voice);
	const sparkline = createSparkline(voiceValues, 20);
	const avgDaily = Math.round(serverStats.totalVoiceMinutes / (stats.lookback || 14));

	container.addTextDisplayComponents(td => td.setContent(
		`**${guild.name}**\n\n` +
		`${EMOJIS.voicestats || '🎤'} **Total Time:** ${formatVoiceTime(serverStats.totalVoiceMinutes)}\n` +
		`${EMOJIS.chart || '📈'} **Daily Average:** ${formatVoiceTime(avgDaily)}\n` +
		`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(serverStats.activeUsers)}\n\n` +
		`**Activity (${stats.lookback || 14} days)**\n\`${sparkline}\``
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.trophy || '🏆'} Top Voice Users`));

	if (topVoice.length > 0) {
		const voiceList = topVoice.slice(0, 5).map((u, i) =>
			`**#${i + 1}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`
		).join('\n');
		container.addTextDisplayComponents(td => td.setContent(voiceList));
	} else {
		container.addTextDisplayComponents(td => td.setContent('*No activity yet*'));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:main`)
				.setLabel('Overview')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:messages`)
				.setLabel('Messages')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:top`)
				.setLabel('Top')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`stats_view:${authorId}:refresh_voice`)
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Last ${stats.lookback || 14} days`));

	return container;
}

async function getStatsData(client, guildId) {
	const stats = await ensureStatsConfig(client.db, guildId);

	const activeSessions = getActiveVoiceSessions(guildId);
	const totalActiveVoiceMinutes = activeSessions.reduce((sum, s) => sum + Math.floor(s.duration / 60000), 0);

	const serverStats = getServerStats(stats, null, totalActiveVoiceMinutes);
	let topVoice = getTopVoiceUsers(stats, 10);
	const topMessages = getTopMessageUsers(stats, 10);
	const breakdown = getDailyBreakdown(stats);

	if (activeSessions.length > 0) {
		for (const active of activeSessions) {
			const activeMinutes = Math.floor(active.duration / 60000);
			const existingIndex = topVoice.findIndex(v => v.userId === active.userId);

			if (existingIndex >= 0) {
				topVoice[existingIndex].minutes += activeMinutes;
			} else {
				topVoice.push({ userId: active.userId, minutes: activeMinutes });
			}
		}

		topVoice = topVoice.sort((a, b) => b.minutes - a.minutes).slice(0, 10);
	}

	return { stats, serverStats, topMessages, topVoice, breakdown };
}

const components = [
	{
		customId: /^stats_view:(\d+):(main|top|messages|voice|refresh|refresh_msg|refresh_voice)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^stats_view:(\d+):(main|top|messages|voice|refresh|refresh_msg|refresh_voice)$/);
			if (!match) return;

			const [, authorId, view] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const { stats, serverStats, topMessages, topVoice, breakdown } = await getStatsData(interaction.client, interaction.guildId);
			const botName = interaction.client.user.username;
			let panel;

			switch (view) {
				case 'top':
					panel = buildTopPanel(interaction.guild, stats, topMessages, topVoice, authorId, botName, 'overview');
					break;
				case 'messages':
				case 'refresh_msg':
					panel = buildMessagesPanel(interaction.guild, stats, serverStats, topMessages, breakdown, authorId, botName);
					break;
				case 'voice':
				case 'refresh_voice':
					panel = buildVoicePanel(interaction.guild, stats, serverStats, topVoice, breakdown, authorId, botName);
					break;
				case 'main':
				case 'refresh':
				default:
					panel = buildStatsPanel(interaction.guild, stats, serverStats, topMessages, topVoice, breakdown, authorId, botName);
					break;
			}

			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
		}
	},
	{
		customId: /^stats_top:(\d+):(overview|messages|voice)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^stats_top:(\d+):(overview|messages|voice)$/);
			if (!match) return;

			const [, authorId, page] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const { stats, topMessages, topVoice } = await getStatsData(interaction.client, interaction.guildId);
			const botName = interaction.client.user.username;
			const panel = buildTopPanel(interaction.guild, stats, topMessages, topVoice, authorId, botName, page);

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

	const { stats, serverStats, topMessages, topVoice, breakdown } = await getStatsData(client, message.guildId);
	const botName = client.user.username;
	const panel = buildStatsPanel(message.guild, stats, serverStats, topMessages, topVoice, breakdown, message.author.id, botName);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View server statistics',
	aliases,
	execute,
	components
};

export { buildStatsPanel, buildTopPanel, buildMessagesPanel, buildVoicePanel, getStatsData };
