import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber, formatVoiceTime, getTopMessageUsers, getTopVoiceUsers, getTodayKey } from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'daily';
const aliases = ['dailystats', 'today', 'todaystats'];

function getDateKey() {
	return new Date().toISOString().split('T')[0];
}

const components = [
	{
		customId: /^stats_daily_(overview|messages|voice)$/,
		execute: async (interaction) => {
			const subCommand = interaction.customId.split('_')[2];
			const client = interaction.client;
			const botName = client.user.username;

			const dateKey = getDateKey();
			const stats = await ensureStatsConfig(client.db, interaction.guildId);

			const todayDaily = stats.daily?.[dateKey] || { messages: 0, voice: 0, joins: 0, leaves: 0 };
			const todayMessages = todayDaily.messages || 0;
			const todayVoice = todayDaily.voice || 0;

			const activeSessions = getActiveVoiceSessions(interaction.guildId);
			let activeVoiceMinutes = 0;
			for (const session of activeSessions) {
				activeVoiceMinutes += Math.floor(session.duration / 60000);
			}

			const totalVoiceMinutes = todayVoice + activeVoiceMinutes;

			const topMessagers = getTopMessageUsers(stats, 10);
			const topVoiceUsers = getTopVoiceUsers(stats, 10);

			const voiceWithActive = [...topVoiceUsers];
			for (const session of activeSessions) {
				const mins = Math.floor(session.duration / 60000);
				const existing = voiceWithActive.find(u => u.userId === session.userId);
				if (existing) {
					existing.minutes += mins;
				} else if (mins > 0) {
					voiceWithActive.push({ userId: session.userId, minutes: mins });
				}
			}
			voiceWithActive.sort((a, b) => b.minutes - a.minutes);

			const container = new ContainerBuilder();

			if (subCommand === 'messages' || subCommand === 'msgs') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.message || '💬'} Daily Messages\n\n` +
					`## ${interaction.guild.name} • Today`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addTextDisplayComponents(td => td.setContent(
					`**Today's Total:** ${formatNumber(todayMessages)} messages`
				));

				if (topMessagers.length > 0) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`### Top Messagers (All Time)`));
					const top10 = topMessagers.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}** messages`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				} else {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`No message activity recorded yet.`));
				}
			} else if (subCommand === 'voice' || subCommand === 'vc') {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.voice || '🎙️'} Daily Voice Activity\n\n` +
					`## ${interaction.guild.name} • Today`
				));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addTextDisplayComponents(td => td.setContent(
					`**Today's Total:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
					`**Currently in VC:** ${activeSessions.length} user(s)`
				));

				if (voiceWithActive.length > 0) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`### Top Voice Users (All Time)`));
					const top10 = voiceWithActive.slice(0, 10);
					const lines = top10.map((entry, i) => {
						const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
						return `${medal} <@${entry.userId}> — **${formatVoiceTime(entry.minutes)}**`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				} else {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`No voice activity recorded yet.`));
				}
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
					container.addTextDisplayComponents(td => td.setContent(`### Top Messagers (All Time)`));
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

	const dateKey = getDateKey();

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		const todayDaily = stats.daily?.[dateKey] || { messages: 0, voice: 0, joins: 0, leaves: 0 };
		const todayMessages = todayDaily.messages || 0;
		const todayVoice = todayDaily.voice || 0;

		let activeVoiceMinutes = 0;
		const activeSessions = getActiveVoiceSessions(message.guildId);
		for (const session of activeSessions) {
			activeVoiceMinutes += Math.floor(session.duration / 60000);
		}

		const totalVoiceMinutes = todayVoice + activeVoiceMinutes;

		const topMessagers = getTopMessageUsers(stats, 10);

		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.stats || '📊'} Daily Stats\n\n` +
			`## ${message.guild.name} • Today`
		));

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.message || '💬'} **Messages:** ${formatNumber(todayMessages)}\n` +
			`${EMOJIS.voice || '🎙️'} **Voice Time:** ${formatVoiceTime(totalVoiceMinutes)}\n` +
			`${EMOJIS.member || '👤'} **Currently in VC:** ${activeSessions.length}`
		));

		if (topMessagers.length > 0) {
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`### Top Messagers (All Time)`));

			const top3 = topMessagers.slice(0, 3);
			const lines = top3.map((entry, i) => {
				const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
				return `${medal} <@${entry.userId}> — **${formatNumber(entry.count)}**`;
			});
			container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
		}

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
