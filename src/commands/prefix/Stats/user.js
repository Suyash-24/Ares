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
	getUserStats,
	getUserMessageRank,
	getUserVoiceRank,
	formatVoiceTime,
	formatNumber
} from '../../../utils/statsManager.js';
import { getActiveVoiceSessions, getCurrentVoiceTime } from '../../../events/statsHandler.js';

const name = 'user';
const aliases = ['userstats', 'member', 'memberstats'];

function getTimeBasedStats(stats, userId, guildId) {
	const now = Date.now();
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const startOfToday = today.getTime();
	const startOfWeek = now - (7 * 24 * 60 * 60 * 1000);
	const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

	const user = stats.users?.[userId];

	const activeVoiceMs = getCurrentVoiceTime(guildId, userId);
	const activeVoiceMins = Math.floor(activeVoiceMs / 60000);

	if (!user) {

		return {
			todayMessages: 0, weeklyMessages: 0, monthlyMessages: 0,
			todayVoice: activeVoiceMins, weeklyVoice: activeVoiceMins, monthlyVoice: activeVoiceMins,
			activeVoice: activeVoiceMins
		};
	}

	const todayMessages = user.messages?.filter(m => m.ts >= startOfToday).length || 0;
	const weeklyMessages = user.messages?.filter(m => m.ts >= startOfWeek).length || 0;
	const monthlyMessages = user.messages?.filter(m => m.ts >= startOfMonth).length || 0;

	const todayVoiceStored = user.voice?.filter(v => v.ts >= startOfToday).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;
	const weeklyVoiceStored = user.voice?.filter(v => v.ts >= startOfWeek).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;
	const monthlyVoiceStored = user.voice?.filter(v => v.ts >= startOfMonth).reduce((sum, v) => sum + (v.mins || 0), 0) || 0;

	const todayVoice = todayVoiceStored + activeVoiceMins;
	const weeklyVoice = weeklyVoiceStored + activeVoiceMins;
	const monthlyVoice = monthlyVoiceStored + activeVoiceMins;

	return { todayMessages, weeklyMessages, monthlyMessages, todayVoice, weeklyVoice, monthlyVoice, activeVoice: activeVoiceMins };
}

function buildUserPanel(user, member, guild, stats, userStats, ranks, authorId, botName, timeStats) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.users || '👤'} User Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const avatarUrl = user.displayAvatarURL({ size: 128, extension: 'png' });
	const displayName = member?.displayName || user.globalName || user.username;

	const userInfo = [
		`**${displayName}**`,
		`@${user.username}`,
		''
	];

	const totalVoice = userStats.voiceMinutes + (timeStats.activeVoice || 0);
	const voiceDisplay = timeStats.activeVoice > 0
		? `${formatVoiceTime(totalVoice)} 🟢`
		: formatVoiceTime(userStats.voiceMinutes);

	userInfo.push(
		`${EMOJIS.messages || '💬'} **Messages:** ${formatNumber(userStats.messages)}`,
		`┣ Today: ${formatNumber(timeStats.todayMessages)} • Weekly: ${formatNumber(timeStats.weeklyMessages)} • Monthly: ${formatNumber(timeStats.monthlyMessages)}`,
		`${EMOJIS.voicestats || '🎤'} **Voice Time:** ${voiceDisplay}`,
		`┣ Today: ${formatVoiceTime(timeStats.todayVoice)} • Weekly: ${formatVoiceTime(timeStats.weeklyVoice)} • Monthly: ${formatVoiceTime(timeStats.monthlyVoice)}`
	);

	if (ranks.messageRank) {
		userInfo.push(`${EMOJIS.rank || '🏅'} **Message Rank:** #${ranks.messageRank}`);
	}
	if (ranks.voiceRank) {
		userInfo.push(`${EMOJIS.rank || '🏅'} **Voice Rank:** #${ranks.voiceRank}`);
	}

	container.addSectionComponents(section => {
		section.addTextDisplayComponents(td => td.setContent(userInfo.join('\n')));
		if (avatarUrl) {
			section.setThumbnailAccessory(thumb => thumb.setURL(avatarUrl));
		}
		return section;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	let activityLevel = 'Inactive';
	const totalActivity = userStats.messages + (totalVoice / 10);
	if (totalActivity > 5) activityLevel = 'Low';
	if (totalActivity > 50) activityLevel = 'Moderate';
	if (totalActivity > 200) activityLevel = 'Active';
	if (totalActivity > 500) activityLevel = 'Very Active';
	if (totalActivity > 1000) activityLevel = 'Super Active';

	const activityEmoji = activityLevel === 'Super Active' ? '🔥' :
		activityLevel === 'Very Active' ? '⚡' :
		activityLevel === 'Active' ? '✨' :
		activityLevel === 'Moderate' ? '📊' :
		activityLevel === 'Low' ? '💤' : '😴';

	container.addTextDisplayComponents(td => td.setContent(
		`### Activity Level\n${activityEmoji} **${activityLevel}**`
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`user_refresh:${authorId}:${user.id}`)
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(EMOJIS.refresh ? { id: EMOJIS.refresh.match(/:(\d+)>/)?.[1] } : '🔄')
		);
		return row;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • ${guild.name}`));

	return container;
}

const components = [
	{
		customId: /^user_refresh:(\d+):(\d+)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^user_refresh:(\d+):(\d+)$/);
			if (!match) return;

			const [, authorId, userId] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			let user;
			try {
				user = await interaction.client.users.fetch(userId);
			} catch {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} User not found.`, ephemeral: true });
			}

			const member = await interaction.guild.members.fetch(userId).catch(() => null);
			const stats = await ensureStatsConfig(interaction.client.db, interaction.guildId);
			const userStats = getUserStats(stats, userId);
			const timeStats = getTimeBasedStats(stats, userId, interaction.guildId);
			const messageRank = getUserMessageRank(stats, userId);
			const voiceRank = getUserVoiceRank(stats, userId);
			const botName = interaction.client.user.username;

			const panel = buildUserPanel(
				user, member, interaction.guild, stats, userStats,
				{ messageRank, voiceRank }, authorId, botName, timeStats
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

	let targetUser = message.mentions.users.first();

	if (!targetUser && args[0]) {
		const userId = args[0].replace(/[<@!>]/g, '');
		try {
			targetUser = await client.users.fetch(userId);
		} catch {
			const c = new ContainerBuilder();
			c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} User not found.`));
			return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	}

	if (!targetUser) {
		targetUser = message.author;
	}

	const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
	const stats = await ensureStatsConfig(client.db, message.guildId);
	const userStats = getUserStats(stats, targetUser.id);
	const timeStats = getTimeBasedStats(stats, targetUser.id, message.guildId);
	const messageRank = getUserMessageRank(stats, targetUser.id);
	const voiceRank = getUserVoiceRank(stats, targetUser.id);
	const botName = client.user.username;

	const panel = buildUserPanel(
		targetUser, member, message.guild, stats, userStats,
		{ messageRank, voiceRank }, message.author.id, botName, timeStats
	);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	aliases,
	category: 'Stats',
	description: 'View user statistics',
	execute,
	components
};
