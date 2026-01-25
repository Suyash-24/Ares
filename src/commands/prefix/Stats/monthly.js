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

const name = 'monthly';
const aliases = ['monthlystats', 'thismonth', 'monthstats'];

const components = [
	{
		customId: /^stats_monthly_(overview|messages|voice)$/,
		execute: async (interaction) => {
			const subCommand = interaction.customId.split('_')[2];
			const client = interaction.client;
			const botName = client.user.username;

			const now = new Date();
			const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			const currentMonth = monthNames[now.getMonth()];
			const currentYear = now.getFullYear();
			const startOfMonth = new Date(currentYear, now.getMonth(), 1).getTime();

			const stats = await ensureStatsConfig(client.db, interaction.guildId);
			const activeSessions = getActiveVoiceSessions(interaction.guildId);

			let monthMessages = 0;
			let monthVoice = 0;
			const topMessagers = [];
			const topVoice = [];

			for (const [userId, userData] of Object.entries(stats.users || {})) {
				const userMonthMsgs = (userData.messages || []).filter(msg => {
					const msgTime = typeof msg === 'number' ? msg : msg.ts;
					return msgTime >= startOfMonth;
				}).length;
				if (userMonthMsgs > 0) {
					monthMessages += userMonthMsgs;
					topMessagers.push({ userId, count: userMonthMsgs });
				}

				const userMonthVoice = (userData.voice || []).filter(v => {
					const vTime = typeof v === 'number' ? v : v.ts;
					return vTime >= startOfMonth;
				}).reduce((sum, v) => sum + (v.mins || 1), 0);
				if (userMonthVoice > 0) {
					monthVoice += userMonthVoice;
					topVoice.push({ userId, minutes: userMonthVoice });
				}
			}

			let activeVoiceMinutes = 0;
			for (const session of activeSessions) {
				const sessionMinutes = Math.floor(session.duration / 60000);
				activeVoiceMinutes += sessionMinutes;
				const existing = topVoice.find(v => v.userId === session.userId);
				if (existing) {
					existing.minutes += sessionMinutes;
				} else if (sessionMinutes > 0) {
					topVoice.push({ userId: session.userId, minutes: sessionMinutes });
				}
			}

			topMessagers.sort((a, b) => b.count - a.count);
			topVoice.sort((a, b) => b.minutes - a.minutes);
			const totalVoiceMinutes = monthVoice + activeVoiceMinutes;

			const container = new ContainerBuilder();

			if (subCommand === 'messages') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.message || '💬'} Monthly Messages\n\n` +
					`## ${interaction.guild.name} • ${currentMonth} ${currentYear}`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				if (topMessagers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No message activity recorded this month.`));
				} else {
					const top10 = topMessagers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}** messages`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Total This Month:** ${formatNumber(monthMessages)} messages`));
			} else if (subCommand === 'voice') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.voice || '🎙️'} Monthly Voice Activity\n\n` +
					`## ${interaction.guild.name} • ${currentMonth} ${currentYear}`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				if (topVoice.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No voice activity recorded this month.`));
				} else {
					const top10 = topVoice.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatVoiceTime(entry.minutes)}**`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Total This Month:** ${formatVoiceTime(totalVoiceMinutes)}`));
			} else {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.stats || '📊'} Monthly Stats\n\n` +
					`## ${interaction.guild.name} • ${currentMonth} ${currentYear}`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.message || '💬'} **Messages:** ${formatNumber(monthMessages)}\n` +
					`${EMOJIS.voice || '🎙️'} **Voice Time:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
					`${EMOJIS.member || '👤'} **Currently in VC:** ${activeSessions.length}`
				));

				if (topMessagers.length > 0) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`### Top Messagers This Month`));
					const top3 = topMessagers.slice(0, 3);
					const lines = top3.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
						return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}**`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
			}

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addActionRowComponents(row => row
				.addComponents(
					new ButtonBuilder()
						.setCustomId('stats_monthly_overview')
						.setLabel('Overview')
						.setStyle(subCommand === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'overview'),
					new ButtonBuilder()
						.setCustomId('stats_monthly_messages')
						.setLabel('Messages')
						.setStyle(subCommand === 'messages' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'messages'),
					new ButtonBuilder()
						.setCustomId('stats_monthly_voice')
						.setLabel('Voice')
						.setStyle(subCommand === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'voice')
				)
			);

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`${botName} • ${currentMonth} ${currentYear}`));

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

	const container = new ContainerBuilder();
	const botName = client.user.username;

	const now = new Date();
	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const currentMonth = monthNames[now.getMonth()];
	const currentYear = now.getFullYear();

	const startOfMonth = new Date(currentYear, now.getMonth(), 1).getTime();

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		let activeVoiceMinutes = 0;
		const activeSessions = getActiveVoiceSessions(message.guildId);
		for (const session of activeSessions) {
			activeVoiceMinutes += Math.floor(session.duration / 60000);
		}

		let monthMessages = 0;
		let monthVoice = 0;
		const topMessagers = [];
		const topVoice = [];

		for (const [userId, userData] of Object.entries(stats.users || {})) {

			const userMonthMsgs = (userData.messages || []).filter(msg => {
				const msgTime = typeof msg === 'number' ? msg : msg.ts;
				return msgTime >= startOfMonth;
			}).length;
			if (userMonthMsgs > 0) {
				monthMessages += userMonthMsgs;
				topMessagers.push({ userId, count: userMonthMsgs });
			}

			const userMonthVoice = (userData.voice || []).filter(v => {
				const vTime = typeof v === 'number' ? v : v.ts;
				return vTime >= startOfMonth;
			}).reduce((sum, v) => sum + (v.mins || 1), 0);
			if (userMonthVoice > 0) {
				monthVoice += userMonthVoice;
				topVoice.push({ userId, minutes: userMonthVoice });
			}
		}

		for (const session of activeSessions) {
			const sessionMinutes = Math.floor(session.duration / 60000);
			const existing = topVoice.find(v => v.userId === session.userId);
			if (existing) {
				existing.minutes += sessionMinutes;
			} else if (sessionMinutes > 0) {
				topVoice.push({ userId: session.userId, minutes: sessionMinutes });
			}
		}

		topMessagers.sort((a, b) => b.count - a.count);
		topVoice.sort((a, b) => b.minutes - a.minutes);

		const totalVoiceMinutes = monthVoice + activeVoiceMinutes;

	container.addTextDisplayComponents(td => td.setContent(
		`# ${EMOJIS.stats || '📊'} Monthly Stats\n\n` +
		`## ${message.guild.name} • ${currentMonth} ${currentYear}`
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`${EMOJIS.message || '💬'} **Messages:** ${formatNumber(monthMessages)}\n` +
		`${EMOJIS.voice || '🎙️'} **Voice Time:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
		`${EMOJIS.member || '👤'} **Currently in VC:** ${activeSessions.length}`
	));

	if (topMessagers.length > 0) {
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`**Top Messagers This Month**`));
		const top5 = topMessagers.slice(0, 5);
		const lines = top5.map((entry, i) => {
			const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
			return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}**`;
		});
		container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
	}

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addActionRowComponents(row => row
			.addComponents(
				new ButtonBuilder()
					.setCustomId('stats_monthly_overview')
					.setLabel('Overview')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId('stats_monthly_messages')
					.setLabel('Messages')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId('stats_monthly_voice')
					.setLabel('Voice')
					.setStyle(ButtonStyle.Secondary)
			)
		);

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${botName} • ${currentMonth} ${currentYear}`));

	} catch (error) {
		console.error('[Monthly] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while fetching monthly stats.`
		));
	}

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View monthly activity stats',
	aliases,
	execute,
	components
};
