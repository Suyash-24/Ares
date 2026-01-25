import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig } from '../../../utils/statsManager.js';

const name = 'statsconfig';
const aliases = ['statssettings', 'statssetup'];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Administrator** permission to use this command.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const subCommand = args[0]?.toLowerCase();
	const container = new ContainerBuilder();
	const botName = client.user.username;

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (!stats.settings) {
			stats.settings = {
				trackMessages: true,
				trackVoice: true,
				trackInvites: true,
				publicStats: true,
				ignoredChannels: [],
				ignoredRoles: []
			};
		}

		if (subCommand === 'messages') {

			stats.settings.trackMessages = !stats.settings.trackMessages;
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.settings || '⚙️'} Stats Settings\n\n` +
				`**Message Tracking:** ${stats.settings.trackMessages ? `${EMOJIS.check || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}`
			));

		} else if (subCommand === 'voice') {

			stats.settings.trackVoice = !stats.settings.trackVoice;
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.settings || '⚙️'} Stats Settings\n\n` +
				`**Voice Tracking:** ${stats.settings.trackVoice ? `${EMOJIS.check || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}`
			));

		} else if (subCommand === 'invites') {

			stats.settings.trackInvites = !stats.settings.trackInvites;
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.settings || '⚙️'} Stats Settings\n\n` +
				`**Invite Tracking:** ${stats.settings.trackInvites ? `${EMOJIS.check || '✅'} Enabled` : `${EMOJIS.error || '❌'} Disabled`}`
			));

		} else if (subCommand === 'public') {

			stats.settings.publicStats = !stats.settings.publicStats;
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.settings || '⚙️'} Stats Settings\n\n` +
				`**Public Stats:** ${stats.settings.publicStats ? `${EMOJIS.check || '✅'} Anyone can view` : `${EMOJIS.error || '❌'} Admins only`}`
			));

		} else if (subCommand === 'ignore' || subCommand === 'ignorechannel') {

			const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

			if (!channel) {
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.error || '❌'} Please mention a channel or provide a channel ID.`
				));
			} else {
				if (!stats.settings.ignoredChannels) stats.settings.ignoredChannels = [];

				if (stats.settings.ignoredChannels.includes(channel.id)) {

					stats.settings.ignoredChannels = stats.settings.ignoredChannels.filter(id => id !== channel.id);
					await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

					container.addTextDisplayComponents(td => td.setContent(
						`${EMOJIS.check || '✅'} <#${channel.id}> is no longer ignored for stats.`
					));
				} else {

					stats.settings.ignoredChannels.push(channel.id);
					await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

					container.addTextDisplayComponents(td => td.setContent(
						`${EMOJIS.check || '✅'} <#${channel.id}> will now be ignored for stats.`
					));
				}
			}

		} else if (subCommand === 'ignorerole') {

			const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

			if (!role) {
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.error || '❌'} Please mention a role or provide a role ID.`
				));
			} else {
				if (!stats.settings.ignoredRoles) stats.settings.ignoredRoles = [];

				if (stats.settings.ignoredRoles.includes(role.id)) {

					stats.settings.ignoredRoles = stats.settings.ignoredRoles.filter(id => id !== role.id);
					await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

					container.addTextDisplayComponents(td => td.setContent(
						`${EMOJIS.check || '✅'} Members with **${role.name}** will now be tracked.`
					));
				} else {

					stats.settings.ignoredRoles.push(role.id);
					await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

					container.addTextDisplayComponents(td => td.setContent(
						`${EMOJIS.check || '✅'} Members with **${role.name}** will be ignored for stats.`
					));
				}
			}

		} else if (subCommand === 'lookback') {

			const days = parseInt(args[1]);

			if (!days || isNaN(days) || days < 1 || days > 365) {
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.settings || '⚙️'} Stats Lookback Period\n\n` +
					`**Current:** ${stats.lookback || 14} days\n\n` +
					`To change, use: \`statsconfig lookback <days>\`\n` +
					`Valid range: 1-365 days\n\n` +
					`**Example:** \`statsconfig lookback 30\` for 30 days`
				));
			} else {
				stats.lookback = days;
				await client.db.updateOne({ guildId: message.guildId }, { $set: { 'stats.lookback': days } });

				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.settings || '⚙️'} Stats Lookback Period\n\n` +
					`${EMOJIS.check || '✅'} Lookback period set to **${days} days**\n\n` +
					`Daily stats older than ${days} days will be cleaned up automatically.`
				));
			}

		} else {

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.settings || '⚙️'} Stats Settings\n\n` +
				`## ${message.guild.name}`
			));

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const settings = stats.settings;
			container.addTextDisplayComponents(td => td.setContent(
				`**Tracking:**\n` +
				`${settings.trackMessages ? '✅' : '❌'} Messages\n` +
				`${settings.trackVoice ? '✅' : '❌'} Voice\n` +
				`${settings.trackInvites ? '✅' : '❌'} Invites\n\n` +
				`**Lookback Period:** ${stats.lookback || 14} days\n\n` +
				`**Access:**\n` +
				`${settings.publicStats ? '👁️ Public' : '🔒 Admins only'}`
			));

			if (settings.ignoredChannels?.length > 0) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(
					`**Ignored Channels:**\n${settings.ignoredChannels.map(id => `<#${id}>`).join(', ')}`
				));
			}

			if (settings.ignoredRoles?.length > 0) {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(
					`**Ignored Roles:**\n${settings.ignoredRoles.map(id => `<@&${id}>`).join(', ')}`
				));
			}

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(
				`**Commands:**\n` +
				`\`statsconfig messages\` - Toggle message tracking\n` +
				`\`statsconfig voice\` - Toggle voice tracking\n` +
				`\`statsconfig invites\` - Toggle invite tracking\n` +
				`\`statsconfig public\` - Toggle public access\n` +
				`\`statsconfig lookback <days>\` - Set lookback period (1-365)\n` +
				`\`statsconfig ignore #channel\` - Toggle ignored channel\n` +
				`\`statsconfig ignorerole @role\` - Toggle ignored role`
			));
		}

	} catch (error) {
		console.error('[StatsConfig] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while managing stats settings.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Configure stats tracking',
	aliases,
	execute
};
