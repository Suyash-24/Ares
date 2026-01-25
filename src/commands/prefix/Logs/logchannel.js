

import {
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize,
	PermissionFlagsBits,
	ChannelType
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	getDefaultLoggingConfig,
	CATEGORY_NAMES
} from '../../../utils/LoggingManager.js';

export default {
	name: 'logchannel',
	description: 'Set a channel for a specific event category',
	usage: 'logchannel <category> <#channel> | logchannel <category> none | logchannel list',
	category: 'Logs',
	aliases: ['setchannel', 'setlogchannel'],

	async execute(message, args, client) {

		if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You need the **Manage Server** permission to configure logging.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
		if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
		if (!guildData.logging.channels) guildData.logging.channels = {};

		if (!args.length || args[0].toLowerCase() === 'list') {
			return showChannelList(message, guildData);
		}

		const category = args[0].toLowerCase();
		const validCategories = Object.keys(CATEGORY_NAMES);
		validCategories.push('combined', 'all');

		if (!validCategories.includes(category)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Invalid Category`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`\`${category}\` is not a valid category.\n\n` +
					`**Valid categories:** ${validCategories.join(', ')}\n\n` +
					`Use \`.logchannel list\` to see current channel configuration.`
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args[1]) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Channel`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`Please specify a channel.\n\n` +
					`Usage: \`.logchannel ${category} #channel\`\n` +
					`Or: \`.logchannel ${category} none\` to remove the channel.`
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let channelId = null;

		if (args[1].toLowerCase() !== 'none') {
			channelId = args[1].replace(/[<#>]/g, '');
			const channel = message.guild.channels.cache.get(channelId);

			if (!channel || channel.type !== ChannelType.GuildText) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Invalid Channel`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('Please specify a valid text channel.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

		if (category === 'all') {
			guildData.logging.channels = {
				message: null,
				member: null,
				mod: null,
				server: null,
				voice: null,
				role: null,
				channel: null,
				emoji: null,
				combined: channelId
			};
		} else {
			guildData.logging.channels[category] = channelId;
		}

		await client.db.updateOne({ guildId: message.guild.id }, { $set: { logging: guildData.logging } });

		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.success} Channel Updated`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		const categoryDisplay = category === 'all' ? 'All logs' : (CATEGORY_NAMES[category] || category);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				channelId
					? `**${categoryDisplay}** will now be sent to <#${channelId}>.`
					: `**${categoryDisplay}** channel has been removed.`
			)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

async function showChannelList(message, guildData) {
	const channels = guildData.logging?.channels || {};

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# 📁 Log Channel Configuration`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	let content = `**Combined Channel:** ${channels.combined ? `<#${channels.combined}>` : '*Not set*'}\n\n`;
	content += '**Category Channels:**\n';

	for (const [category, name] of Object.entries(CATEGORY_NAMES)) {
		const channelId = channels[category];
		content += `• **${name}:** ${channelId ? `<#${channelId}>` : '*Not set (uses combined)*'}\n`;
	}

	content += '\n**Usage:**\n';
	content += '• `.logchannel <category> #channel` - Set a channel\n';
	content += '• `.logchannel <category> none` - Remove a channel\n';
	content += '• `.logchannel all #channel` - Set all logs to one channel';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(content)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}
