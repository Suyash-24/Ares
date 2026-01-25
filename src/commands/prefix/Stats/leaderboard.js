import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber, formatVoiceTime } from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'statsboard';
const aliases = ['slb', 'statsleaderboard', 'statslb'];

const components = [
	{
		customId: /^stats_lb_(type|period)_(messages|voice)_(today|week|month|all)$/,
		execute: async (interaction) => {
			const parts = interaction.customId.split('_');

			const type = parts[3];
			const period = parts[4];
			const client = interaction.client;
			const botName = client.user.username;

			const now = Date.now();
			let startTime = 0;
			let periodLabel = 'All Time';

			if (period === 'today') {
				const today = new Date();
				startTime = new Date(today.setHours(0, 0, 0, 0)).getTime();
				periodLabel = 'Today';
			} else if (period === 'week') {
				const dayOfWeek = new Date().getDay();
				const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
				const startOfWeek = new Date();
				startOfWeek.setDate(startOfWeek.getDate() - diff);
				startOfWeek.setHours(0, 0, 0, 0);
				startTime = startOfWeek.getTime();
				periodLabel = 'This Week';
			} else if (period === 'month') {
				const now = new Date();
				startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
				periodLabel = 'This Month';
			}

			const stats = await ensureStatsConfig(client.db, interaction.guildId);
			const activeSessions = getActiveVoiceSessions(interaction.guildId);
			const container = new ContainerBuilder();

			if (type === 'messages') {
				const topUsers = [];
				for (const [userId, userData] of Object.entries(stats.users || {})) {
					const count = (userData.messages || []).filter(msg => {
						const msgTime = typeof msg === 'number' ? msg : msg.ts;
						return msgTime >= startTime;
					}).length;
					if (count > 0) topUsers.push({ userId, count });
				}
				topUsers.sort((a, b) => b.count - a.count);

				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.message || '💬'} Message Leaderboard\n\n` +
					`## ${interaction.guild.name} • ${periodLabel}`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				if (topUsers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No data available for this period.`));
				} else {
					const top10 = topUsers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}** messages`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
			} else if (type === 'voice') {
				const topUsers = [];
				for (const [userId, userData] of Object.entries(stats.users || {})) {
					const minutes = (userData.voice || []).filter(v => {
						const vTime = typeof v === 'number' ? v : v.ts;
						return vTime >= startTime;
					}).reduce((sum, v) => sum + (v.mins || 1), 0);
					if (minutes > 0) topUsers.push({ userId, minutes });
				}
				for (const session of activeSessions) {
					const existing = topUsers.find(u => u.userId === session.userId);
					const sessionMinutes = Math.floor(session.duration / 60000);
					if (existing) {
						existing.minutes += sessionMinutes;
					} else {
						topUsers.push({ userId: session.userId, minutes: sessionMinutes });
					}
				}
				topUsers.sort((a, b) => b.minutes - a.minutes);

				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.voice || '🎙️'} Voice Leaderboard\n\n` +
					`## ${interaction.guild.name} • ${periodLabel}`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				if (topUsers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No data available for this period.`));
				} else {
					const top10 = topUsers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatVoiceTime(entry.minutes)}**`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
			}

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent('**Type:**'));
			container.addActionRowComponents(row => row
				.addComponents(
					new ButtonBuilder()
						.setCustomId(`stats_lb_type_messages_${period}`)
						.setLabel('Messages')
						.setStyle(type === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(type === 'messages'),
					new ButtonBuilder()
						.setCustomId(`stats_lb_type_voice_${period}`)
						.setLabel('Voice')
						.setStyle(type === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(type === 'voice')
				)
			);

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent('**Period:**'));
			container.addActionRowComponents(row => row
				.addComponents(
					new ButtonBuilder()
						.setCustomId(`stats_lb_period_${type}_today`)
						.setLabel('Today')
						.setStyle(period === 'today' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(period === 'today'),
					new ButtonBuilder()
						.setCustomId(`stats_lb_period_${type}_week`)
						.setLabel('Week')
						.setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(period === 'week'),
					new ButtonBuilder()
						.setCustomId(`stats_lb_period_${type}_month`)
						.setLabel('Month')
						.setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(period === 'month'),
					new ButtonBuilder()
						.setCustomId(`stats_lb_period_${type}_all`)
						.setLabel('All')
						.setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(period === 'all')
				)
			);

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`${botName} • Leaderboard`));

			await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
		}
	}
];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const validTypes = ['messages', 'voice'];
	const validPeriods = ['today', 'week', 'month', 'all'];

	let type = args[0]?.toLowerCase();
	let period = args[1]?.toLowerCase();

	if (!validTypes.includes(type)) type = 'messages';
	if (!validPeriods.includes(period)) period = 'all';

	const container = new ContainerBuilder();
	const botName = client.user.username;

	const now = Date.now();
	let startTime = 0;
	let periodLabel = 'All Time';

	if (period === 'today') {
		const today = new Date();
		startTime = new Date(today.setHours(0, 0, 0, 0)).getTime();
		periodLabel = 'Today';
	} else if (period === 'week') {
		const dayOfWeek = new Date().getDay();
		const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const startOfWeek = new Date();
		startOfWeek.setDate(startOfWeek.getDate() - diff);
		startOfWeek.setHours(0, 0, 0, 0);
		startTime = startOfWeek.getTime();
		periodLabel = 'This Week';
	} else if (period === 'month') {
		const now = new Date();
		startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
		periodLabel = 'This Month';
	}

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);
		const activeSessions = getActiveVoiceSessions(message.guildId);

		if (type === 'messages') {
			const topUsers = [];
			for (const [userId, userData] of Object.entries(stats.users || {})) {
				const count = (userData.messages || []).filter(msg => {
					const msgTime = typeof msg === 'number' ? msg : msg.ts;
					return msgTime >= startTime;
				}).length;
				if (count > 0) topUsers.push({ userId, count });
			}
			topUsers.sort((a, b) => b.count - a.count);

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.message || '💬'} Message Leaderboard\n\n` +
				`## ${message.guild.name} • ${periodLabel}`
			));
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			if (topUsers.length === 0) {
				container.addTextDisplayComponents(td => td.setContent(`No message activity for this period.`));
			} else {
				const top10 = topUsers.slice(0, 10);
				const lines = top10.map((entry, i) => {
					const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
					return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}** messages`;
				});
				container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
			}
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(
				`**Total:** ${formatNumber(topUsers.reduce((sum, u) => sum + u.count, 0))} messages by ${topUsers.length} users`
			));
		} else if (type === 'voice') {
			const topUsers = [];
			for (const [userId, userData] of Object.entries(stats.users || {})) {
				const minutes = (userData.voice || []).filter(v => {
					const vTime = typeof v === 'number' ? v : v.ts;
					return vTime >= startTime;
				}).reduce((sum, v) => sum + (v.mins || 1), 0);
				if (minutes > 0) topUsers.push({ userId, minutes });
			}
			for (const session of activeSessions) {
				const existing = topUsers.find(u => u.userId === session.userId);
				const sessionMinutes = Math.floor(session.duration / 60000);
				if (existing) {
					existing.minutes += sessionMinutes;
				} else {
					topUsers.push({ userId: session.userId, minutes: sessionMinutes });
				}
			}
			topUsers.sort((a, b) => b.minutes - a.minutes);

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.voice || '🎙️'} Voice Leaderboard\n\n` +
				`## ${message.guild.name} • ${periodLabel}`
			));
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			if (topUsers.length === 0) {
				container.addTextDisplayComponents(td => td.setContent(`No voice activity for this period.`));
			} else {
				const top10 = topUsers.slice(0, 10);
				const lines = top10.map((entry, i) => {
					const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
					return `${medal} <@${entry.userId}> — **${formatVoiceTime(entry.minutes)}**`;
				});
				container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
			}
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(
				`**Total:** ${formatVoiceTime(topUsers.reduce((sum, u) => sum + u.minutes, 0))} by ${topUsers.length} users`
			));
		}

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('**Type:**'));
		container.addActionRowComponents(row => row
			.addComponents(
				new ButtonBuilder()
					.setCustomId(`stats_lb_type_messages_${period}`)
					.setLabel('Messages')
					.setStyle(type === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(type === 'messages'),
				new ButtonBuilder()
					.setCustomId(`stats_lb_type_voice_${period}`)
					.setLabel('Voice')
					.setStyle(type === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(type === 'voice')
			)
		);

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('**Period:**'));
		container.addActionRowComponents(row => row
			.addComponents(
				new ButtonBuilder()
					.setCustomId(`stats_lb_period_${type}_today`)
					.setLabel('Daily')
					.setStyle(period === 'today' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(period === 'today'),
				new ButtonBuilder()
					.setCustomId(`stats_lb_period_${type}_week`)
					.setLabel('Weekly')
					.setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(period === 'week'),
				new ButtonBuilder()
					.setCustomId(`stats_lb_period_${type}_month`)
					.setLabel('Monthly')
					.setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(period === 'month'),
				new ButtonBuilder()
					.setCustomId(`stats_lb_period_${type}_all`)
					.setLabel('All Time')
					.setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
					.setDisabled(period === 'all')
			)
		);

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${botName} • All Time`));

	} catch (error) {
		console.error('[Statsboard] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while fetching leaderboard stats.`
		));
	}

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View server leaderboards',
	aliases,
	execute,
	components
};
