import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	ChannelType
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	ensureStatsConfig,
	getChannelStats,
	formatVoiceTime,
	formatNumber
} from '../../../utils/statsManager.js';

const name = 'channel';
const aliases = ['channelstats', 'ch'];

function buildChannelPanel(channel, guild, stats, channelStats, authorId, botName) {
	const container = new ContainerBuilder();

	const isVoice = channel.type === ChannelType.GuildVoice ||
		channel.type === ChannelType.GuildStageVoice;
	const isCategory = channel.type === ChannelType.GuildCategory;

	const emoji = isVoice ? (EMOJIS.voicestats || '🎤') : (EMOJIS.channelstats || '💬');
	const typeLabel = isVoice ? 'Voice Channel' : isCategory ? 'Category' : 'Text Channel';

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${emoji} Channel Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const channelInfo = [
		`**${channel.name}**`,
		`Type: ${typeLabel}`,
		'',
	];

	if (isVoice) {
		channelInfo.push(
			`${EMOJIS.voicestats || '🎤'} **Total Time:** ${formatVoiceTime(channelStats.voiceMinutes)}`,
			`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(channelStats.contributors)}`
		);
	} else if (isCategory) {
		channelInfo.push(
			`${EMOJIS.messages || '💬'} **Messages:** ${formatNumber(channelStats.messages)}`,
			`${EMOJIS.voicestats || '🎤'} **Voice Time:** ${formatVoiceTime(channelStats.voiceMinutes)}`,
			`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(channelStats.contributors)}`
		);
	} else {
		channelInfo.push(
			`${EMOJIS.messages || '💬'} **Messages:** ${formatNumber(channelStats.messages)}`,
			`${EMOJIS.users || '👤'} **Contributors:** ${formatNumber(channelStats.contributors)}`
		);
	}

	channelInfo.push('', `*Stats from the last ${stats.lookback || 14} days*`);

	const iconUrl = guild.iconURL({ size: 64, extension: 'png' });

	container.addSectionComponents(section => {
		section.addTextDisplayComponents(td => td.setContent(channelInfo.join('\n')));
		if (iconUrl) {
			section.setThumbnailAccessory(thumb => thumb.setURL(iconUrl));
		}
		return section;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	let activityLevel = 'Low';
	if (channelStats.messages > 100 || channelStats.voiceMinutes > 60) activityLevel = 'Medium';
	if (channelStats.messages > 500 || channelStats.voiceMinutes > 300) activityLevel = 'High';
	if (channelStats.messages > 1000 || channelStats.voiceMinutes > 600) activityLevel = 'Very High';

	const activityEmoji = activityLevel === 'Very High' ? '🔥' :
		activityLevel === 'High' ? '⚡' :
		activityLevel === 'Medium' ? '📊' : '💤';

	container.addTextDisplayComponents(td => td.setContent(
		`### Activity Level\n${activityEmoji} **${activityLevel}**`
	));

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addActionRowComponents(row => {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`channel_refresh:${authorId}:${channel.id}`)
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

const components = [
	{
		customId: /^channel_refresh:(\d+):(\d+)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^channel_refresh:(\d+):(\d+)$/);
			if (!match) return;

			const [, authorId, channelId] = match;

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const channel = interaction.guild.channels.cache.get(channelId);
			if (!channel) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} Channel not found.`, ephemeral: true });
			}

			const stats = await ensureStatsConfig(interaction.client.db, interaction.guildId);
			const channelStats = getChannelStats(stats, channelId);
			const botName = interaction.client.user.username;
			const panel = buildChannelPanel(channel, interaction.guild, stats, channelStats, authorId, botName);

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

	let channel = message.mentions.channels.first();

	if (!channel && args[0]) {

		const channelId = args[0].replace(/[<#>]/g, '');
		channel = message.guild.channels.cache.get(channelId);
	}

	if (!channel) {
		channel = message.channel;
	}

	const stats = await ensureStatsConfig(client.db, message.guildId);
	const channelStats = getChannelStats(stats, channel.id);
	const botName = client.user.username;
	const panel = buildChannelPanel(channel, message.guild, stats, channelStats, message.author.id, botName);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View channel statistics',
	aliases,
	execute,
	components
};
