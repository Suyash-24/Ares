

import {
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize,
	PermissionFlagsBits,
	AttachmentBuilder
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	getDefaultLoggingConfig,
	searchLogs,
	exportLogs,
	purgeLogs,
	getLoggingStats,
	CATEGORY_NAMES,
	LOG_CATEGORIES
} from '../../../utils/LoggingManager.js';

export default {
	name: 'logs',
	description: 'Search, export, and manage logs',
	usage: 'logs <search|export|ignore|status|purge|stats> [options]',
	category: 'Logs',
	aliases: ['log'],

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
				textDisplay.setContent('You need the **Manage Server** permission to access logs.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args.length) {
			return showHelp(message, client);
		}

		const subcommand = args[0].toLowerCase();
		const subArgs = args.slice(1);

		switch (subcommand) {
			case 'search':
				return handleSearch(message, subArgs, client);
			case 'export':
				return handleExport(message, subArgs, client);
			case 'ignore':
				return handleIgnore(message, subArgs, client);
			case 'status':
				return handleStatus(message, client);
			case 'purge':
				return handlePurge(message, subArgs, client);
			case 'stats':
				return handleStats(message, client);
			default:
				return showHelp(message, client);
		}
	}
};

async function showHelp(message, client) {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.log} Logs Command Help`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**Available Subcommands:**`)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**\`.logs search\`** - Search through logs\n` +
			`• \`.logs search user <@user>\` - Search logs for a user\n` +
			`• \`.logs search channel <#channel>\` - Search logs for a channel\n` +
			`• \`.logs search type <event>\` - Search by event type\n` +
			`• \`.logs search keyword <text>\` - Search by keyword`
		)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**\`.logs export\`** - Export logs to JSON\n` +
			`• \`.logs export all\` - Export all logs\n` +
			`• \`.logs export <category>\` - Export specific category`
		)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**\`.logs ignore\`** - Manage ignore rules\n` +
			`• \`.logs ignore channel <#channel>\` - Toggle channel ignore\n` +
			`• \`.logs ignore role <@role>\` - Toggle role ignore\n` +
			`• \`.logs ignore user <@user>\` - Toggle user ignore\n` +
			`• \`.logs ignore bots\` - Toggle bot ignore`
		)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**\`.logs status\`** - Show current logging configuration\n\n` +
			`**\`.logs stats\`** - Show logging statistics`
		)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**\`.logs purge\`** - Delete stored logs\n` +
			`• \`.logs purge all\` - Delete all logs\n` +
			`• \`.logs purge <category>\` - Delete specific category`
		)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

async function handleSearch(message, args, client) {
	if (!args.length) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`Please specify search criteria.\n\n` +
				`**Usage:**\n` +
				`• \`.logs search user <@user>\`\n` +
				`• \`.logs search channel <#channel>\`\n` +
				`• \`.logs search type <event>\`\n` +
				`• \`.logs search keyword <text>\``
			)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const searchType = args[0].toLowerCase();
	const searchValue = args.slice(1).join(' ');

	let options = { limit: 25 };

	switch (searchType) {
		case 'user':
			const userId = searchValue.replace(/[<@!>]/g, '');
			options.userId = userId;
			break;
		case 'channel':
			const channelId = searchValue.replace(/[<#>]/g, '');
			options.channelId = channelId;
			break;
		case 'type':
			options.eventType = searchValue;
			break;
		case 'category':
			options.category = searchValue;
			break;
		case 'keyword':
			options.keyword = searchValue;
			break;
		default:
			options.keyword = args.join(' ');
	}

	const logs = await searchLogs(client, message.guild.id, options);

	if (!logs.length) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# 🔍 No Results`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent('No logs found matching your search criteria.')
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# 🔍 Search Results (${logs.length})`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const logEntries = logs.slice(0, 10).map(log => {
		const timestamp = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
		const target = log.data?.target?.name || log.data?.target?.id || 'Unknown';
		return `• **${log.eventType}** - ${target} - ${timestamp}`;
	}).join('\n');

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			logEntries + (logs.length > 10 ? `\n\n*...and ${logs.length - 10} more. Use \`.logs export\` for full results.*` : '')
		)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

async function handleExport(message, args, client) {
	let options = {};

	if (args.length && args[0].toLowerCase() !== 'all') {
		const category = args[0].toLowerCase();
		if (CATEGORY_NAMES[category]) {
			options.category = category;
		}
	}

	const exportData = await exportLogs(client, message.guild.id, options);
	const buffer = Buffer.from(exportData, 'utf-8');

	const timestamp = new Date().toISOString().split('T')[0];
	const filename = `logs_${message.guild.id}_${timestamp}.json`;

	const attachment = new AttachmentBuilder(buffer, { name: filename });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Logs Exported`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent('Your log export is attached below.')
	);

	return message.reply({
		components: [container],
		files: [attachment],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

async function handleIgnore(message, args, client) {
	const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) {
		guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false };
	}

	if (!args.length) {

		const ignore = guildData.logging.ignore;

		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# 🚫 Ignore Rules`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		const ignoredChannels = (ignore.channels || []).map(id => `<#${id}>`).join(', ') || '*None*';
		const ignoredRoles = (ignore.roles || []).map(id => `<@&${id}>`).join(', ') || '*None*';
		const ignoredUsers = (ignore.users || []).map(id => `<@${id}>`).join(', ') || '*None*';

		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`**Ignored Channels:** ${ignoredChannels}\n` +
				`**Ignored Roles:** ${ignoredRoles}\n` +
				`**Ignored Users:** ${ignoredUsers}\n` +
				`**Ignore Bots:** ${ignore.bots ? 'Yes' : 'No'}`
			)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const ignoreType = args[0].toLowerCase();
	const ignoreValue = args[1];

	let result = '';

	switch (ignoreType) {
		case 'channel':
			if (!ignoreValue) {
				return message.reply({ content: `${EMOJIS.error} Please specify a channel.` });
			}
			const channelId = ignoreValue.replace(/[<#>]/g, '');
			if (!guildData.logging.ignore.channels) guildData.logging.ignore.channels = [];

			const channelIndex = guildData.logging.ignore.channels.indexOf(channelId);
			if (channelIndex > -1) {
				guildData.logging.ignore.channels.splice(channelIndex, 1);
				result = `Channel <#${channelId}> will now be logged.`;
			} else {
				guildData.logging.ignore.channels.push(channelId);
				result = `Channel <#${channelId}> will now be ignored.`;
			}
			break;

		case 'role':
			if (!ignoreValue) {
				return message.reply({ content: `${EMOJIS.error} Please specify a role.` });
			}
			const roleId = ignoreValue.replace(/[<@&>]/g, '');
			if (!guildData.logging.ignore.roles) guildData.logging.ignore.roles = [];

			const roleIndex = guildData.logging.ignore.roles.indexOf(roleId);
			if (roleIndex > -1) {
				guildData.logging.ignore.roles.splice(roleIndex, 1);
				result = `Role <@&${roleId}> will now be logged.`;
			} else {
				guildData.logging.ignore.roles.push(roleId);
				result = `Role <@&${roleId}> will now be ignored.`;
			}
			break;

		case 'user':
			if (!ignoreValue) {
				return message.reply({ content: `${EMOJIS.error} Please specify a user.` });
			}
			const userId = ignoreValue.replace(/[<@!>]/g, '');
			if (!guildData.logging.ignore.users) guildData.logging.ignore.users = [];

			const userIndex = guildData.logging.ignore.users.indexOf(userId);
			if (userIndex > -1) {
				guildData.logging.ignore.users.splice(userIndex, 1);
				result = `User <@${userId}> will now be logged.`;
			} else {
				guildData.logging.ignore.users.push(userId);
				result = `User <@${userId}> will now be ignored.`;
			}
			break;

		case 'bots':
		case 'bot':
			guildData.logging.ignore.bots = !guildData.logging.ignore.bots;
			result = guildData.logging.ignore.bots
				? 'Bot actions will now be ignored.'
				: 'Bot actions will now be logged.';
			break;

		default:
			return message.reply({
				content: `${EMOJIS.error} Invalid ignore type. Use: \`channel\`, \`role\`, \`user\`, or \`bots\``
			});
	}

	await client.db.updateOne({ guildId: message.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Ignore Rule Updated`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(result)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

async function handleStatus(message, client) {
	const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
	const config = guildData.logging || getDefaultLoggingConfig();

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# 📊 Logging Status`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const channels = config.channels || {};
	const channelStatus = Object.entries(CATEGORY_NAMES).map(([key, name]) => {
		const channelId = channels[key];
		return `• **${name}:** ${channelId ? `<#${channelId}>` : '*Not set*'}`;
	}).join('\n');

	const combinedChannel = channels.combined ? `<#${channels.combined}>` : '*Not set*';

	const enabledEvents = Object.entries(config.events || {}).filter(([, v]) => v !== false).length;
	const totalEvents = Object.keys(LOG_CATEGORIES).reduce((acc, cat) => acc + LOG_CATEGORIES[cat].length, 0);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**Status:** ${config.enabled ? `${EMOJIS.enabletoggle} Enabled` : `${EMOJIS.disabletoggle} Disabled`}\n\n` +
			`**Combined Channel:** ${combinedChannel}\n\n` +
			`**Category Channels:**\n${channelStatus}\n\n` +
			`**Events:** ${enabledEvents}/${totalEvents} enabled\n\n` +
			`**Ignore Rules:**\n` +
			`• Channels: ${(config.ignore?.channels || []).length}\n` +
			`• Roles: ${(config.ignore?.roles || []).length}\n` +
			`• Users: ${(config.ignore?.users || []).length}\n` +
			`• Bots: ${config.ignore?.bots ? 'Yes' : 'No'}\n\n` +
			`**Retention:**\n` +
			`• Days: ${config.retention?.days || 30}\n` +
			`• Max Events: ${config.retention?.maxEvents || 10000}`
		)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

async function handlePurge(message, args, client) {
	if (!args.length) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`Please specify what to purge.\n\n` +
				`**Usage:**\n` +
				`• \`.logs purge all\` - Delete all logs\n` +
				`• \`.logs purge <category>\` - Delete specific category\n\n` +
				`**Categories:** ${Object.keys(CATEGORY_NAMES).join(', ')}`
			)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const purgeTarget = args[0].toLowerCase();
	let options = {};

	if (purgeTarget === 'all') {
		options.all = true;
	} else if (CATEGORY_NAMES[purgeTarget]) {
		options.category = purgeTarget;
	} else {
		return message.reply({
			content: `${EMOJIS.error} Invalid purge target. Use \`all\` or a category name.`
		});
	}

	const confirmMessage = await message.reply({
		content: `⚠️ Are you sure you want to purge ${purgeTarget === 'all' ? 'all logs' : `${CATEGORY_NAMES[purgeTarget]} logs`}? This cannot be undone. Type \`confirm\` to proceed.`
	});

	const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
	const collected = await message.channel.awaitMessages({
		filter,
		max: 1,
		time: 30000
	});

	if (!collected.size) {
		return confirmMessage.edit({ content: 'Purge cancelled (timed out).' });
	}

	try {
		await collected.first().delete();
	} catch (e) {}

	const purgedCount = await purgeLogs(client, message.guild.id, options);

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Logs Purged`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`Successfully deleted **${purgedCount}** log entries.`)
	);

	return confirmMessage.edit({
		content: null,
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleStats(message, client) {
	const stats = await getLoggingStats(client, message.guild.id);

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# 📈 Logging Statistics`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	let categoryStats = Object.entries(stats.byCategory)
		.sort((a, b) => b[1] - a[1])
		.map(([cat, count]) => `• **${CATEGORY_NAMES[cat] || cat}:** ${count}`)
		.join('\n') || '*No logs recorded*';

	let topEvents = Object.entries(stats.byEvent)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([event, count]) => `• \`${event}\`: ${count}`)
		.join('\n') || '*No events recorded*';

	const oldestStr = stats.oldestLog ? `<t:${Math.floor(stats.oldestLog / 1000)}:R>` : '*N/A*';
	const newestStr = stats.newestLog ? `<t:${Math.floor(stats.newestLog / 1000)}:R>` : '*N/A*';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**Total Logs:** ${stats.total}\n\n` +
			`**By Category:**\n${categoryStats}\n\n` +
			`**Top 5 Events:**\n${topEvents}\n\n` +
			`**Oldest Log:** ${oldestStr}\n` +
			`**Newest Log:** ${newestStr}`
		)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}
