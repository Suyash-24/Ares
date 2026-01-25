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
	getTopMessageUsers,
	getTopVoiceUsers,
	getTopMessageChannels,
	getTopVoiceChannels,
	formatVoiceTime,
	formatNumber
} from '../../../utils/statsManager.js';
import { getActiveVoiceSessions } from '../../../events/statsHandler.js';

const name = 'top';
const aliases = ['leaderboards', 'rankings', 'topstats'];

const PER_PAGE = 10;

function buildTopPanel(guild, stats, data, authorId, botName, page = 'overview', pageNum = 0) {
	const container = new ContainerBuilder();

	const iconUrl = guild.iconURL({ size: 64, extension: 'png' });
	const headerText = `# ${EMOJIS.trophy || '🏆'} Top — ${guild.name}`;

	container.addTextDisplayComponents(td => td.setContent(headerText));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	switch (page) {
		case 'overview': {

			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.messages || '💬'} Top Message Users`));

			if (data.topMessages.length > 0) {
				const list = data.topMessages.slice(0, 5).map((u, i) =>
					`**#${i + 1}** <@${u.userId}> — ${formatNumber(u.count)} msgs`
				).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.voicestats || '🎤'} Top Voice Users`));

			if (data.topVoice.length > 0) {
				const list = data.topVoice.slice(0, 5).map((u, i) =>
					`**#${i + 1}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`
				).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}
			break;
		}

		case 'msg-users': {
			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.messages || '💬'} Top Message Users`));

			const totalPages = Math.max(1, Math.ceil(data.topMessages.length / PER_PAGE));
			const currentPage = Math.min(Math.max(0, pageNum), totalPages - 1);
			const slice = data.topMessages.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

			if (slice.length > 0) {
				const list = slice.map((u, i) => {
					const rank = currentPage * PER_PAGE + i + 1;
					return `**#${rank}** <@${u.userId}> — ${formatNumber(u.count)} msgs`;
				}).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}

			if (totalPages > 1) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Page ${currentPage + 1}/${totalPages}`));
			}
			break;
		}

		case 'voice-users': {
			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.voicestats || '🎤'} Top Voice Users`));

			const totalPages = Math.max(1, Math.ceil(data.topVoice.length / PER_PAGE));
			const currentPage = Math.min(Math.max(0, pageNum), totalPages - 1);
			const slice = data.topVoice.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

			if (slice.length > 0) {
				const list = slice.map((u, i) => {
					const rank = currentPage * PER_PAGE + i + 1;
					return `**#${rank}** <@${u.userId}> — ${formatVoiceTime(u.minutes)}`;
				}).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}

			if (totalPages > 1) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Page ${currentPage + 1}/${totalPages}`));
			}
			break;
		}

		case 'msg-channels': {
			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.channelstats || '📁'} Top Message Channels`));

			const totalPages = Math.max(1, Math.ceil(data.topMsgChannels.length / PER_PAGE));
			const currentPage = Math.min(Math.max(0, pageNum), totalPages - 1);
			const slice = data.topMsgChannels.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

			if (slice.length > 0) {
				const list = slice.map((c, i) => {
					const rank = currentPage * PER_PAGE + i + 1;
					return `**#${rank}** <#${c.channelId}> — ${formatNumber(c.count)} msgs`;
				}).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}

			if (totalPages > 1) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Page ${currentPage + 1}/${totalPages}`));
			}
			break;
		}

		case 'voice-channels': {
			container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.voicestats || '🎤'} Top Voice Channels`));

			const totalPages = Math.max(1, Math.ceil(data.topVoiceChannels.length / PER_PAGE));
			const currentPage = Math.min(Math.max(0, pageNum), totalPages - 1);
			const slice = data.topVoiceChannels.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

			if (slice.length > 0) {
				const list = slice.map((c, i) => {
					const rank = currentPage * PER_PAGE + i + 1;
					return `**#${rank}** <#${c.channelId}> — ${formatVoiceTime(c.minutes)}`;
				}).join('\n');
				container.addTextDisplayComponents(td => td.setContent(list));
			} else {
				container.addTextDisplayComponents(td => td.setContent('*No activity recorded*'));
			}

			if (totalPages > 1) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Page ${currentPage + 1}/${totalPages}`));
			}
			break;
		}
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`top_page:${authorId}:overview:0`)
				.setLabel('Overview')
				.setStyle(page === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`top_page:${authorId}:msg-users:0`)
				.setLabel('Msg Users')
				.setStyle(page === 'msg-users' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`top_page:${authorId}:voice-users:0`)
				.setLabel('Voice Users')
				.setStyle(page === 'voice-users' ? ButtonStyle.Primary : ButtonStyle.Secondary)
		);
		return row;
	});

	container.addActionRowComponents(row => {
		const buttons = [
			new ButtonBuilder()
				.setCustomId(`top_page:${authorId}:msg-channels:0`)
				.setLabel('Msg Channels')
				.setStyle(page === 'msg-channels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`top_page:${authorId}:voice-channels:0`)
				.setLabel('Voice Channels')
				.setStyle(page === 'voice-channels' ? ButtonStyle.Primary : ButtonStyle.Secondary)
		];

		if (page !== 'overview') {
			let dataLen = 0;
			if (page === 'msg-users') dataLen = data.topMessages.length;
			else if (page === 'voice-users') dataLen = data.topVoice.length;
			else if (page === 'msg-channels') dataLen = data.topMsgChannels.length;
			else if (page === 'voice-channels') dataLen = data.topVoiceChannels.length;

			const totalPages = Math.max(1, Math.ceil(dataLen / PER_PAGE));
			const currentPage = Math.min(Math.max(0, pageNum), totalPages - 1);

			buttons.push(
				new ButtonBuilder()
					.setCustomId(`top_page:${authorId}:${page}:${currentPage - 1}`)
					.setLabel('◀')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage === 0),
				new ButtonBuilder()
					.setCustomId(`top_page:${authorId}:${page}:${currentPage + 1}`)
					.setLabel('▶')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage >= totalPages - 1)
			);
		}

		row.addComponents(...buttons);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Last ${stats.lookback || 14} days`));

	return container;
}

async function getTopData(client, guildId) {
	const stats = await ensureStatsConfig(client.db, guildId);
	const topMessages = getTopMessageUsers(stats, 100);
	let topVoice = getTopVoiceUsers(stats, 100);
	const topMsgChannels = getTopMessageChannels(stats, 100);
	const topVoiceChannels = getTopVoiceChannels(stats, 100);

	const activeSessions = getActiveVoiceSessions(guildId);
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

		topVoice = topVoice.sort((a, b) => b.minutes - a.minutes).slice(0, 100);
	}

	return { stats, topMessages, topVoice, topMsgChannels, topVoiceChannels };
}

const components = [
	{
		customId: /^top_page:(\d+):(overview|msg-users|voice-users|msg-channels|voice-channels):(-?\d+)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^top_page:(\d+):(overview|msg-users|voice-users|msg-channels|voice-channels):(-?\d+)$/);
			if (!match) return;

			const [, authorId, page, pageStr] = match;
			const pageNum = parseInt(pageStr, 10);

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const data = await getTopData(interaction.client, interaction.guildId);
			const botName = interaction.client.user.username;
			const panel = buildTopPanel(interaction.guild, data.stats, data, authorId, botName, page, pageNum);

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

	const data = await getTopData(client, message.guildId);
	const botName = client.user.username;
	const panel = buildTopPanel(message.guild, data.stats, data, message.author.id, botName, 'overview', 0);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View top members',
	aliases,
	execute,
	components
};
