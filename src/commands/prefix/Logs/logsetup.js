

import {
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ChannelSelectMenuBuilder,
	RoleSelectMenuBuilder,
	UserSelectMenuBuilder,
	ChannelType,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	getDefaultLoggingConfig,
	CATEGORY_NAMES,
	LOG_CATEGORIES
} from '../../../utils/LoggingManager.js';

const pendingSelections = new Map();

export default {
	name: 'logsetup',
	description: 'Interactive wizard to configure logging channels',
	usage: 'logsetup',
	category: 'Logs',
	aliases: ['setuplog', 'setuplogging', 'loggingsetup'],

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
		const loggingConfig = guildData.logging || getDefaultLoggingConfig();

		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.log} Logging Setup Wizard`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`Welcome to Ares's logging setup wizard!\n\n` +
				`**Current Status:** ${loggingConfig.enabled ? `${EMOJIS.enabletoggle} Enabled` : `${EMOJIS.disabletoggle} Disabled`}\n\n` +
				`**Choose a setup option below:**\n` +
				`• **Quick Setup** - Set one channel for all logs\n` +
				`• **Category Setup** - Set different channels per category\n` +
				`• **Toggle Events** - Enable/disable specific events\n` +
				`• **Ignore Rules** - Set channels/roles/users to ignore`
			)
		);

		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		container.addActionRowComponents(row => row.addComponents(
			new ButtonBuilder().setCustomId('logsetup_quick').setLabel('Quick Setup').setStyle(ButtonStyle.Primary).setEmoji('1445774775413637180'),
			new ButtonBuilder().setCustomId('logsetup_category').setLabel('Category Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775938980679730'),
			new ButtonBuilder().setCustomId('logsetup_events').setLabel('Toggle Events').setStyle(ButtonStyle.Secondary).setEmoji('1445776041401651240')
		));

		container.addActionRowComponents(row => row.addComponents(
			new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
			new ButtonBuilder().setCustomId(`logsetup_toggle_${loggingConfig.enabled ? 'off' : 'on'}`).setLabel(loggingConfig.enabled ? 'Disable Logging' : 'Enable Logging').setStyle(loggingConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji('1445775026161975507'),
			new ButtonBuilder().setCustomId('logsetup_status').setLabel('View Status').setStyle(ButtonStyle.Secondary).setEmoji('1445774910088548352')
		));

		const sentMessage = await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});

		const collector = sentMessage.createMessageComponentCollector({
			filter: (i) => i.user.id === message.author.id,
			time: 300000
		});

		collector.on('collect', async (interaction) => {
			const customId = interaction.customId;

			const freshGuildData = await client.db.findOne({ guildId: interaction.guild.id }) || {};

			if (customId === 'logsetup_main') {
				await handleMainMenu(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_quick') {
				await handleQuickSetup(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_quick_channel') {
				await handleQuickChannelSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_quick_remove') {
				await handleQuickRemove(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_category') {
				await handleCategorySetup(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_events') {
				await handleEventsSetup(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore') {
				await handleIgnoreSetup(interaction, client, freshGuildData);
			} else if (customId.startsWith('logsetup_toggle_')) {
				await handleToggle(interaction, client, freshGuildData, customId.endsWith('on'));
			} else if (customId === 'logsetup_status') {
				await handleStatus(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_category_select') {
				await handleCategoryChannelPrompt(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_cat_channel') {
				await handleCategoryChannelSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_cat_remove') {
				await handleCategoryChannelRemove(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_event_category') {
				await handleEventToggle(interaction, client, freshGuildData);
			} else if (customId.startsWith('logsetup_evt_toggle_')) {
				await handleSingleEventToggle(interaction, client, freshGuildData, customId);
			} else if (customId.startsWith('logsetup_evt_')) {
				await handleEventToggleAction(interaction, client, freshGuildData, customId);
			} else if (customId === 'logsetup_ignore_channels') {
				await handleIgnoreChannelsPrompt(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_channel_select') {
				await handleIgnoreChannelSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_roles') {
				await handleIgnoreRolesPrompt(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_role_select') {
				await handleIgnoreRoleSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_users') {
				await handleIgnoreUsersPrompt(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_user_select') {
				await handleIgnoreUserSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_bots') {
				await handleIgnoreBotsPrompt(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_bot_select') {
				await handleIgnoreBotSelect(interaction, client, freshGuildData);
			} else if (customId === 'logsetup_ignore_allbots') {
				await handleIgnoreAllBots(interaction, client, freshGuildData);
			}
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'time') {
				try {
					const expiredContainer = new ContainerBuilder();
					expiredContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ${EMOJIS.duration} Session Expired`)
					);
					expiredContainer.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					expiredContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(
							`This logging setup session has expired.\n\n` +
							`Run \`.logsetup\` again to continue configuring.`
						)
					);

					expiredContainer.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);

					expiredContainer.addActionRowComponents(row => row.addComponents(
						new ButtonBuilder().setCustomId('logsetup_expired_1').setLabel('Quick Setup').setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('1445774775413637180'),
						new ButtonBuilder().setCustomId('logsetup_expired_2').setLabel('Category Setup').setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('1445775938980679730'),
						new ButtonBuilder().setCustomId('logsetup_expired_3').setLabel('Toggle Events').setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji('1445776041401651240')
					));

					await sentMessage.edit({
						components: [expiredContainer],
						flags: MessageFlags.IsComponentsV2
					});
				} catch (e) {

				}
			}
		});
	}
};

async function handleMainMenu(interaction, client, guildData) {
	const loggingConfig = guildData.logging || getDefaultLoggingConfig();

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.log} Logging Setup Wizard`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Welcome to Ares's logging setup wizard!\n\n` +
			`**Current Status:** ${loggingConfig.enabled ? `${EMOJIS.enabletoggle} Enabled` : `${EMOJIS.disabletoggle} Disabled`}\n\n` +
			`**Choose a setup option below:**\n` +
			`• **Quick Setup** - Set one channel for all logs\n` +
			`• **Category Setup** - Set different channels per category\n` +
			`• **Toggle Events** - Enable/disable specific events\n` +
			`• **Ignore Rules** - Set channels/roles/users to ignore`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_quick').setLabel('Quick Setup').setStyle(ButtonStyle.Primary).setEmoji('1445774775413637180'),
		new ButtonBuilder().setCustomId('logsetup_category').setLabel('Category Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775938980679730'),
		new ButtonBuilder().setCustomId('logsetup_events').setLabel('Toggle Events').setStyle(ButtonStyle.Secondary).setEmoji('1445776041401651240')
	));

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId(`logsetup_toggle_${loggingConfig.enabled ? 'off' : 'on'}`).setLabel(loggingConfig.enabled ? 'Disable Logging' : 'Enable Logging').setStyle(loggingConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji('1445775026161975507'),
		new ButtonBuilder().setCustomId('logsetup_status').setLabel('View Status').setStyle(ButtonStyle.Secondary).setEmoji('1445774910088548352')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleQuickSetup(interaction, client, guildData) {
	const currentChannel = guildData.logging?.channels?.combined;

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.quicksetup} Quick Setup`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Set one channel for all logs.\n\n` +
			`**Current Channel:** ${currentChannel ? `<#${currentChannel}>` : '*Not set*'}\n\n` +
			`Select a channel from the dropdown below:`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId('logsetup_quick_channel')
			.setPlaceholder('Select a channel for all logs')
			.setChannelTypes(ChannelType.GuildText)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_quick_remove').setLabel('Remove Channel').setStyle(ButtonStyle.Danger).setDisabled(!currentChannel).setEmoji('1443596439367192586'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('1443596560947744939')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleQuickChannelSelect(interaction, client, guildData) {
	const channelId = interaction.values[0];
	const channel = interaction.guild.channels.cache.get(channelId);

	if (!channel) {
		return interaction.reply({ content: `${EMOJIS.error} Channel not found.`, ephemeral: true });
	}

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	guildData.logging.enabled = true;
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

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const successContainer = new ContainerBuilder();
	successContainer.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Quick Setup Complete`)
	);
	successContainer.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	successContainer.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`All logs will now be sent to ${channel}.\n\n` +
			`Logging is now **enabled**.`
		)
	);

	successContainer.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	successContainer.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_quick').setLabel('Change Channel').setStyle(ButtonStyle.Primary).setEmoji('1443596651351638046'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [successContainer],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleQuickRemove(interaction, client, guildData) {
	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (guildData.logging.channels) {
		guildData.logging.channels.combined = null;
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Channel Removed`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`Combined log channel has been removed.`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_quick').setLabel('Set New Channel').setStyle(ButtonStyle.Primary).setEmoji('1445774775413637180'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleCategorySetup(interaction, client, guildData) {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.categorysetup} Category Setup`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const currentChannels = guildData.logging?.channels || {};
	const channelStatus = Object.entries(CATEGORY_NAMES).map(([key, name]) => {
		const channelId = currentChannels[key];
		return `${getCategoryEmoji(key)} **${name}:** ${channelId ? `<#${channelId}>` : '*Not set*'}`;
	}).join('\n');

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Select a category to configure its log channel.\n\n` +
			`**Current Channels:**\n${channelStatus}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('logsetup_category_select')
			.setPlaceholder('Select a category to configure')
			.addOptions(
				Object.entries(CATEGORY_NAMES).map(([key, name]) => ({
					label: name,
					value: key,
					emoji: getCategoryEmoji(key),
					description: `Configure ${name.toLowerCase()} channel`
				}))
			)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleCategoryChannelPrompt(interaction, client, guildData) {
	const category = interaction.values[0];
	const categoryName = CATEGORY_NAMES[category];
	const currentChannel = guildData.logging?.channels?.[category];

	pendingSelections.set(`${interaction.guild.id}_${interaction.user.id}`, { category });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${getCategoryEmoji(category)} Set ${categoryName} Channel`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**Current Channel:** ${currentChannel ? `<#${currentChannel}>` : '*Not set*'}\n\n` +
			`Select a channel from the dropdown below:`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId('logsetup_cat_channel')
			.setPlaceholder(`Select channel for ${categoryName}`)
			.setChannelTypes(ChannelType.GuildText)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_cat_remove').setLabel('Remove Channel').setStyle(ButtonStyle.Danger).setDisabled(!currentChannel).setEmoji('1443596439367192586'),
		new ButtonBuilder().setCustomId('logsetup_category').setLabel('Back to Categories').setStyle(ButtonStyle.Secondary).setEmoji('1445775938980679730'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleCategoryChannelSelect(interaction, client, guildData) {
	const pending = pendingSelections.get(`${interaction.guild.id}_${interaction.user.id}`);
	if (!pending?.category) {
		return interaction.reply({ content: `${EMOJIS.error} Session expired. Please try again.`, ephemeral: true });
	}

	const category = pending.category;
	const categoryName = CATEGORY_NAMES[category];
	const channelId = interaction.values[0];
	const channel = interaction.guild.channels.cache.get(channelId);

	if (!channel) {
		return interaction.reply({ content: `${EMOJIS.error} Channel not found.`, ephemeral: true });
	}

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.channels) guildData.logging.channels = {};
	guildData.logging.channels[category] = channelId;

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Channel Set`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**${categoryName}** logs will now be sent to ${channel}.`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_category').setLabel('Configure Another').setStyle(ButtonStyle.Primary).setEmoji('1445775938980679730'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleCategoryChannelRemove(interaction, client, guildData) {
	const pending = pendingSelections.get(`${interaction.guild.id}_${interaction.user.id}`);
	if (!pending?.category) {
		return interaction.reply({ content: `${EMOJIS.error} Session expired. Please try again.`, ephemeral: true });
	}

	const category = pending.category;
	const categoryName = CATEGORY_NAMES[category];

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.channels) guildData.logging.channels = {};
	guildData.logging.channels[category] = null;

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Channel Removed`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**${categoryName}** channel has been removed.`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_category').setLabel('Configure Another').setStyle(ButtonStyle.Primary).setEmoji('1445775938980679730'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleEventsSetup(interaction, client, guildData) {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.toggleevents} Toggle Events`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const events = guildData.logging?.events || {};
	const enabledCount = Object.values(events).filter(v => v !== false).length;
	const totalCount = Object.values(LOG_CATEGORIES).flat().length;

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Select a category to view and toggle its events.\n\n` +
			`**Events Enabled:** ${enabledCount}/${totalCount}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('logsetup_event_category')
			.setPlaceholder('Select a category to view events')
			.addOptions(
				Object.entries(CATEGORY_NAMES).map(([key, name]) => {
					const catEvents = LOG_CATEGORIES[key] || [];
					const enabled = catEvents.filter(e => events[e] !== false).length;
					return {
						label: name,
						value: key,
						emoji: getCategoryEmoji(key),
						description: `${enabled}/${catEvents.length} events enabled`
					};
				})
			)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleEventToggle(interaction, client, guildData) {
	const category = interaction.values[0];
	const events = LOG_CATEGORIES[category] || [];
	const currentEvents = guildData.logging?.events || {};

	pendingSelections.set(`${interaction.guild.id}_${interaction.user.id}`, { category });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${getCategoryEmoji(category)} ${CATEGORY_NAMES[category]} Events`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const eventStatus = events.map(event => {
		const enabled = currentEvents[event] !== false;
		return `${enabled ? EMOJIS.enabletoggle : EMOJIS.disabletoggle} \`${event}\``;
	}).join('\n');

	const enabledCount = events.filter(e => currentEvents[e] !== false).length;
	const allEnabled = enabledCount === events.length;
	const allDisabled = enabledCount === 0;

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**Status:** ${enabledCount}/${events.length} enabled\n\n${eventStatus}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`logsetup_evt_toggle_${category}`)
			.setPlaceholder('Toggle a specific event')
			.addOptions(
				events.map(event => {
					const enabled = currentEvents[event] !== false;
					return {
						label: event,
						value: event,
						emoji: enabled ? '🟢' : '🔴',
						description: enabled ? 'Click to disable' : 'Click to enable'
					};
				})
			)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId(`logsetup_evt_enableall_${category}`).setLabel('Enable All').setStyle(ButtonStyle.Success).setDisabled(allEnabled).setEmoji('1445346263028600903'),
		new ButtonBuilder().setCustomId(`logsetup_evt_disableall_${category}`).setLabel('Disable All').setStyle(ButtonStyle.Danger).setDisabled(allDisabled).setEmoji('1445346396910911528')
	));

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_events').setLabel('Back to Categories').setStyle(ButtonStyle.Secondary).setEmoji('1445776041401651240'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleEventToggleAction(interaction, client, guildData, customId) {
	const parts = customId.split('_');
	const action = parts[2];
	const category = parts[3];
	const events = LOG_CATEGORIES[category] || [];

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.events) guildData.logging.events = {};

	const enable = action === 'enableall';
	for (const event of events) {
		guildData.logging.events[event] = enable;
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	await showEventCategoryView(interaction, client, guildData, category, `${enable ? 'Enabled' : 'Disabled'} all ${CATEGORY_NAMES[category]} events!`);
}

async function handleSingleEventToggle(interaction, client, guildData, customId) {
	const category = customId.replace('logsetup_evt_toggle_', '');
	const eventName = interaction.values[0];

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.events) guildData.logging.events = {};

	const currentState = guildData.logging.events[eventName] !== false;
	guildData.logging.events[eventName] = !currentState;

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	await showEventCategoryView(interaction, client, guildData, category, `${!currentState ? 'Enabled' : 'Disabled'} \`${eventName}\``);
}

async function showEventCategoryView(interaction, client, guildData, category, successMessage = null) {
	const events = LOG_CATEGORIES[category] || [];
	const currentEvents = guildData.logging?.events || {};

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${getCategoryEmoji(category)} ${CATEGORY_NAMES[category]} Events`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const eventStatus = events.map(event => {
		const enabled = currentEvents[event] !== false;
		return `${enabled ? EMOJIS.enabletoggle : EMOJIS.disabletoggle} \`${event}\``;
	}).join('\n');

	const enabledCount = events.filter(e => currentEvents[e] !== false).length;
	const allEnabled = enabledCount === events.length;
	const allDisabled = enabledCount === 0;

	const statusText = successMessage
		? `${EMOJIS.success} ${successMessage}\n\n**Status:** ${enabledCount}/${events.length} enabled\n\n${eventStatus}`
		: `**Status:** ${enabledCount}/${events.length} enabled\n\n${eventStatus}`;

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(statusText)
	);

	container.addActionRowComponents(row => row.addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`logsetup_evt_toggle_${category}`)
			.setPlaceholder('Toggle a specific event')
			.addOptions(
				events.map(event => {
					const enabled = currentEvents[event] !== false;
					return {
						label: event,
						value: event,
						emoji: enabled ? '🟢' : '🔴',
						description: enabled ? 'Click to disable' : 'Click to enable'
					};
				})
			)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId(`logsetup_evt_enableall_${category}`).setLabel('Enable All').setStyle(ButtonStyle.Success).setDisabled(allEnabled).setEmoji('1445346263028600903'),
		new ButtonBuilder().setCustomId(`logsetup_evt_disableall_${category}`).setLabel('Disable All').setStyle(ButtonStyle.Danger).setDisabled(allDisabled).setEmoji('1445346396910911528')
	));

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_events').setLabel('Back to Categories').setStyle(ButtonStyle.Secondary).setEmoji('1445776041401651240'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreSetup(interaction, client, guildData) {
	const ignore = guildData.logging?.ignore || {};

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.ignorerules} Ignore Rules`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const channelCount = (ignore.channels || []).length;
	const roleCount = (ignore.roles || []).length;
	const userCount = (ignore.users || []).length;
	const botCount = (ignore.specificBots || []).length;

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Configure what should be ignored from logging.\n\n` +
			`${EMOJIS.channels} **Channels:** ${channelCount > 0 ? `${channelCount} ignored` : '*None*'}\n` +
			`${EMOJIS.roles} **Roles:** ${roleCount > 0 ? `${roleCount} ignored` : '*None*'}\n` +
			`${EMOJIS.members} **Users:** ${userCount > 0 ? `${userCount} ignored` : '*None*'}\n` +
			`${EMOJIS.bot} **Bots:** ${ignore.bots ? 'All bots ignored' : (botCount > 0 ? `${botCount} specific bots` : '*None*')}`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_channels').setLabel('Channels').setStyle(ButtonStyle.Primary).setEmoji('1434583519920783402'),
		new ButtonBuilder().setCustomId('logsetup_ignore_roles').setLabel('Roles').setStyle(ButtonStyle.Primary).setEmoji('1434589572112842762'),
		new ButtonBuilder().setCustomId('logsetup_ignore_users').setLabel('Users').setStyle(ButtonStyle.Primary).setEmoji('1442869391757672639'),
		new ButtonBuilder().setCustomId('logsetup_ignore_bots').setLabel('Bots').setStyle(ButtonStyle.Primary).setEmoji('1434585487770910904')
	));

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreChannelsPrompt(interaction, client, guildData) {
	const ignore = guildData.logging?.ignore || {};
	const ignoredChannels = ignore.channels || [];

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.channels} Ignore Channels`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const channelList = ignoredChannels.length > 0
		? ignoredChannels.map(id => `• <#${id}>`).join('\n')
		: '*No channels ignored*';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Select a channel to add/remove from ignore list.\n\n` +
			`**Currently Ignored:**\n${channelList}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId('logsetup_ignore_channel_select')
			.setPlaceholder('Select a channel to toggle')
			.setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory)
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreChannelSelect(interaction, client, guildData) {
	const channelId = interaction.values[0];
	const channel = interaction.guild.channels.cache.get(channelId);

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false };
	if (!guildData.logging.ignore.channels) guildData.logging.ignore.channels = [];

	const isIgnored = guildData.logging.ignore.channels.includes(channelId);

	if (isIgnored) {
		guildData.logging.ignore.channels = guildData.logging.ignore.channels.filter(id => id !== channelId);
	} else {
		guildData.logging.ignore.channels.push(channelId);
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Channel ${isIgnored ? 'Removed' : 'Added'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			isIgnored
				? `${channel} will now be logged again.`
				: `${channel} will be ignored from logging.`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_channels').setLabel('Manage More Channels').setStyle(ButtonStyle.Primary).setEmoji('1434583519920783402'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreRolesPrompt(interaction, client, guildData) {
	const ignore = guildData.logging?.ignore || {};
	const ignoredRoles = ignore.roles || [];

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.roles} Ignore Roles`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const roleList = ignoredRoles.length > 0
		? ignoredRoles.slice(0, 10).map(id => `• <@&${id}>`).join('\n') + (ignoredRoles.length > 10 ? `\n*...and ${ignoredRoles.length - 10} more*` : '')
		: '*No roles ignored*';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Actions by members with these roles will be ignored.\n\n` +
			`**Currently Ignored:**\n${roleList}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new RoleSelectMenuBuilder()
			.setCustomId('logsetup_ignore_role_select')
			.setPlaceholder('Select a role to toggle')
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreRoleSelect(interaction, client, guildData) {
	const roleId = interaction.values[0];
	const role = interaction.guild.roles.cache.get(roleId);

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false, specificBots: [] };
	if (!guildData.logging.ignore.roles) guildData.logging.ignore.roles = [];

	const isIgnored = guildData.logging.ignore.roles.includes(roleId);

	if (isIgnored) {
		guildData.logging.ignore.roles = guildData.logging.ignore.roles.filter(id => id !== roleId);
	} else {
		guildData.logging.ignore.roles.push(roleId);
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Role ${isIgnored ? 'Removed' : 'Added'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			isIgnored
				? `${role} members will now be logged again.`
				: `${role} members will be ignored from logging.`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_roles').setLabel('Manage More Roles').setStyle(ButtonStyle.Primary).setEmoji('1434589572112842762'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreUsersPrompt(interaction, client, guildData) {
	const ignore = guildData.logging?.ignore || {};
	const ignoredUsers = ignore.users || [];

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.members} Ignore Users`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const userList = ignoredUsers.length > 0
		? ignoredUsers.slice(0, 10).map(id => `• <@${id}>`).join('\n') + (ignoredUsers.length > 10 ? `\n*...and ${ignoredUsers.length - 10} more*` : '')
		: '*No users ignored*';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`Actions by these users will be ignored.\n\n` +
			`**Currently Ignored:**\n${userList}`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new UserSelectMenuBuilder()
			.setCustomId('logsetup_ignore_user_select')
			.setPlaceholder('Select a user to toggle')
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreUserSelect(interaction, client, guildData) {
	const userId = interaction.values[0];
	const user = await interaction.client.users.fetch(userId).catch(() => null);

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false, specificBots: [] };
	if (!guildData.logging.ignore.users) guildData.logging.ignore.users = [];

	const isIgnored = guildData.logging.ignore.users.includes(userId);

	if (isIgnored) {
		guildData.logging.ignore.users = guildData.logging.ignore.users.filter(id => id !== userId);
	} else {
		guildData.logging.ignore.users.push(userId);
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} User ${isIgnored ? 'Removed' : 'Added'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			isIgnored
				? `${user ? user.tag : `<@${userId}>`} will now be logged again.`
				: `${user ? user.tag : `<@${userId}>`} will be ignored from logging.`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_users').setLabel('Manage More Users').setStyle(ButtonStyle.Primary).setEmoji('1434589552617787403'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreBotsPrompt(interaction, client, guildData) {
	const ignore = guildData.logging?.ignore || {};
	const specificBots = ignore.specificBots || [];

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.bot} Ignore Bots`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	const botList = specificBots.length > 0
		? specificBots.slice(0, 10).map(id => `• <@${id}>`).join('\n') + (specificBots.length > 10 ? `\n*...and ${specificBots.length - 10} more*` : '')
		: '*No specific bots ignored*';

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			`**Ignore All Bots:** ${ignore.bots ? `${EMOJIS.enabletoggle} Yes` : `${EMOJIS.disabletoggle} No`}\n\n` +
			`**Specific Bots Ignored:**\n${botList}\n\n` +
			`*Use the dropdown to ignore specific bots, or toggle all bots.*`
		)
	);

	container.addActionRowComponents(row => row.addComponents(
		new UserSelectMenuBuilder()
			.setCustomId('logsetup_ignore_bot_select')
			.setPlaceholder('Select a bot to toggle')
	));

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_allbots').setLabel(ignore.bots ? 'Log All Bots' : 'Ignore All Bots').setStyle(ignore.bots ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('1434585487770910904'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreBotSelect(interaction, client, guildData) {
	const botId = interaction.values[0];
	const bot = await interaction.client.users.fetch(botId).catch(() => null);

	if (bot && !bot.bot) {
		return interaction.reply({ content: `${EMOJIS.error} That's not a bot! Use the Users section to ignore regular users.`, ephemeral: true });
	}

	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false, specificBots: [] };
	if (!guildData.logging.ignore.specificBots) guildData.logging.ignore.specificBots = [];

	const isIgnored = guildData.logging.ignore.specificBots.includes(botId);

	if (isIgnored) {
		guildData.logging.ignore.specificBots = guildData.logging.ignore.specificBots.filter(id => id !== botId);
	} else {
		guildData.logging.ignore.specificBots.push(botId);
	}

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Bot ${isIgnored ? 'Removed' : 'Added'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			isIgnored
				? `${bot ? bot.tag : `<@${botId}>`} will now be logged again.`
				: `${bot ? bot.tag : `<@${botId}>`} will be ignored from logging.`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_bots').setLabel('Manage More Bots').setStyle(ButtonStyle.Primary).setEmoji('1434585487770910904'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleIgnoreAllBots(interaction, client, guildData) {
	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	if (!guildData.logging.ignore) guildData.logging.ignore = { channels: [], roles: [], users: [], bots: false, specificBots: [] };

	guildData.logging.ignore.bots = !guildData.logging.ignore.bots;
	const ignoreBots = guildData.logging.ignore.bots;

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} All Bots ${ignoreBots ? 'Ignored' : 'Logged'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			ignoreBots
				? 'All bot actions will now be **ignored** from logging.'
				: 'All bot actions will now be **logged** (specific bot ignores still apply).'
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_ignore_bots').setLabel('Back to Bots').setStyle(ButtonStyle.Primary).setEmoji('1434585487770910904'),
		new ButtonBuilder().setCustomId('logsetup_ignore').setLabel('Back to Ignore Rules').setStyle(ButtonStyle.Secondary).setEmoji('1445774831990607893'),
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Main Menu').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleToggle(interaction, client, guildData, enable) {
	if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
	guildData.logging.enabled = enable;

	await client.db.updateOne({ guildId: interaction.guild.id }, { $set: { logging: guildData.logging } });

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${enable ? EMOJIS.success : EMOJIS.error} Logging ${enable ? 'Enabled' : 'Disabled'}`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(
			enable
				? 'Logging is now **enabled**. Events will be logged to configured channels.'
				: 'Logging is now **disabled**. No events will be logged.'
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

async function handleStatus(interaction, client, guildData) {
	const config = guildData.logging || getDefaultLoggingConfig();

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.viewstats} Logging Status`)
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

	const enabledEvents = Object.entries(config.events || {}).filter(([, v]) => v).length;
	const totalEvents = Object.keys(config.events || {}).length;

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
			`• Bots: ${config.ignore?.bots ? 'Yes' : 'No'}`
		)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents(row => row.addComponents(
		new ButtonBuilder().setCustomId('logsetup_main').setLabel('Back to Setup').setStyle(ButtonStyle.Secondary).setEmoji('1445775144470577286')
	));

	await interaction.update({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});
}

function getCategoryEmoji(category) {
	const emojis = {
		message: '💬',
		member: '👥',
		mod: '🔨',
		server: '⚙️',
		voice: '🎤',
		role: '🏷️',
		channel: '📁',
		emoji: '😀'
	};
	return emojis[category] || '📋';
}
