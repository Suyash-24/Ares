import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber, formatVoiceTime, createSparkline } from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'daily';
const aliases = ['dailystats', 'today', 'todaystats'];

// Component handlers for buttons
const components = [
	{
		customId: /^stats_daily_(overview|messages|voice)$/,
		execute: async (interaction) => {
			const subCommand = interaction.customId.split('_')[2];
			const message = interaction.message;
			const client = interaction.client;
			const botName = client.user.username;

			const today = new Date();
			const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
			const stats = await ensureStatsConfig(client.db, interaction.guildId);

			const activeSessions = getActiveVoiceSessions(interaction.guildId);
			let activeVoiceMinutes = 0;
			for (const session of activeSessions) {
				activeVoiceMinutes += Math.floor(session.duration / 60000);
			}

			const now = Date.now();
			const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
			let todayMessages = 0;
			let todayVoice = 0;
			const topMessagers = [];
			const topVoice = [];

			for (const [userId, userData] of Object.entries(stats.users || {})) {
				const messagesArray = Array.isArray(userData.messages) ? userData.messages : [];
				const userTodayMsgs = messagesArray.filter(msg => {
					const msgTime = typeof msg === 'number' ? msg : msg.ts;
					return msgTime >= startOfDay;
				}).length;
				if (userTodayMsgs > 0) {
					todayMessages += userTodayMsgs;
					topMessagers.push({ userId, count: userTodayMsgs });
				}

				// Count voice from today (stored sessions)
				const voiceArray = Array.isArray(userData.voice) ? userData.voice : [];
				const userTodayVoice = voiceArray.filter(v => {
					const vTime = typeof v === 'number' ? v : v.ts;
					return vTime >= startOfDay;
				}).reduce((sum, v) => sum + (v.mins || 1), 0);
				if (userTodayVoice > 0) {
					todayVoice += userTodayVoice;
					topVoice.push({ userId, minutes: userTodayVoice });
				}
			}
			topMessagers.sort((a, b) => b.count - a.count);

			// Add active voice sessions
			for (const session of activeSessions) {
				const mins = Math.floor(session.duration / 60000);
				const existing = topVoice.find(u => u.userId === session.userId);
				if (existing) {
					existing.minutes += mins;
				} else if (mins > 0) {
					topVoice.push({ userId: session.userId, minutes: mins });
				}
			}
			topVoice.sort((a, b) => b.minutes - a.minutes);
			const totalVoiceMinutes = todayVoice + activeVoiceMinutes;

			const container = new ContainerBuilder();

			if (subCommand === 'messages' || subCommand === 'msgs') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.message || '💬'} Daily Messages\n\n` +
					`## ${interaction.guild.name} • Today`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				if (topMessagers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No message activity recorded today.`));
				} else {
					const top10 = topMessagers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}** messages`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Total Today:** ${formatNumber(todayMessages)} messages`));
			} else if (subCommand === 'voice' || subCommand === 'vc') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.voice || '🎙️'} Daily Voice Activity\n\n` +
					`## ${interaction.guild.name} • Today`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const voiceUsers = [...topVoice];
				voiceUsers.sort((a, b) => b.minutes - a.minutes);

				if (voiceUsers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent(`No voice activity recorded today.`));
				} else {
					const top10 = voiceUsers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatVoiceTime(entry.minutes)}**`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Total Today:** ${formatVoiceTime(totalVoiceMinutes)}`));
			} else {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.stats || '📊'} Daily Stats\n\n` +
					`## ${interaction.guild.name} • Today`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.message || '💬'} **Messages:** ${formatNumber(todayMessages)}\n` +
					`${EMOJIS.voice || '🎙️'} **Voice Time:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
					`${EMOJIS.member || '👤'} **Currently in VC:** ${activeSessions.length}`
				));

				if (topMessagers.length > 0) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`### Top Messagers Today`));
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
						.setCustomId('stats_daily_overview')
						.setLabel('Overview')
						.setStyle(subCommand === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'overview'),
					new ButtonBuilder()
						.setCustomId('stats_daily_messages')
						.setLabel('Messages')
						.setStyle(subCommand === 'messages' || subCommand === 'msgs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'messages' || subCommand === 'msgs'),
					new ButtonBuilder()
						.setCustomId('stats_daily_voice')
						.setLabel('Voice')
						.setStyle(subCommand === 'voice' || subCommand === 'vc' ? ButtonStyle.Primary : ButtonStyle.Secondary)
						.setDisabled(subCommand === 'voice' || subCommand === 'vc')
				)
			);

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`${botName} • ${dateKey}`));

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

	// Get today's date key
	const today = new Date();
	const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);
		const todayStats = stats.daily?.[dateKey] || { messages: 0, voiceMinutes: 0, joins: 0 };

		// Get active voice sessions
		let activeVoiceMinutes = 0;
		const activeSessions = getActiveVoiceSessions(message.guildId);
		for (const session of activeSessions) {
			activeVoiceMinutes += Math.floor(session.duration / 60000);
		}

		// Calculate today's stats from user data
		const now = Date.now();
		const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
		
		let todayMessages = 0;
		let todayVoice = 0;
		const topMessagers = [];
		const topVoice = [];

		for (const [userId, userData] of Object.entries(stats.users || {})) {
			// Count messages from today
			const messagesArray = Array.isArray(userData.messages) ? userData.messages : [];
			const userTodayMsgs = messagesArray.filter(msg => {
				const msgTime = typeof msg === 'number' ? msg : msg.ts;
				return msgTime >= startOfDay;
			}).length;
			if (userTodayMsgs > 0) {
				todayMessages += userTodayMsgs;
				topMessagers.push({ userId, count: userTodayMsgs });
			}

			// Count voice from today (stored sessions)
			const voiceArray = Array.isArray(userData.voice) ? userData.voice : [];
			const userTodayVoice = voiceArray.filter(v => {
				const vTime = typeof v === 'number' ? v : v.ts;
				return vTime >= startOfDay;
			}).reduce((sum, v) => sum + (v.mins || 1), 0);
			if (userTodayVoice > 0) {
				todayVoice += userTodayVoice;
				topVoice.push({ userId, minutes: userTodayVoice });
			}
		}

		// Sort top users
		topMessagers.sort((a, b) => b.count - a.count);

		// Add active voice sessions to topVoice
		for (const session of activeSessions) {
			const mins = Math.floor(session.duration / 60000);
			const existing = topVoice.find(u => u.userId === session.userId);
			if (existing) {
				existing.minutes += mins;
			} else if (mins > 0) {
				topVoice.push({ userId: session.userId, minutes: mins });
			}
		}
		topVoice.sort((a, b) => b.minutes - a.minutes);
		const totalVoiceMinutes = todayVoice + activeVoiceMinutes;

		// Always show overview
		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.stats || '📊'} Daily Stats\n\n` +
			`## ${message.guild.name} • Today`
		));

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		// Stats summary
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.message || '💬'} **Messages:** ${formatNumber(todayMessages)}\n` +
			`${EMOJIS.voice || '🎙️'} **Voice Time:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
			`${EMOJIS.member || '👤'} **Currently in VC:** ${activeSessions.length}`
		));

		// Top 3 messagers
		if (topMessagers.length > 0) {
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`### Top Messagers Today`));
			
			const top3 = topMessagers.slice(0, 3);
			const lines = top3.map((entry, i) => {
				const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
				return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}**`;
			});
			container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
		}

		// Navigation buttons
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addActionRowComponents(row => row
			.addComponents(
				new ButtonBuilder()
					.setCustomId('stats_daily_overview')
					.setLabel('Overview')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId('stats_daily_messages')
					.setLabel('Messages')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId('stats_daily_voice')
					.setLabel('Voice')
					.setStyle(ButtonStyle.Secondary)
			)
		);

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${botName} • ${dateKey}`));

	} catch (error) {
		console.error('[Daily] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while fetching daily stats.`
		));
	}

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View daily activity stats',
	aliases,
	execute,
	components
};
