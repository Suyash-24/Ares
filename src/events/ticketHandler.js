import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
	PermissionFlagsBits,
	ChannelType,
	TextDisplayBuilder,
	SectionBuilder,
	ChannelSelectMenuBuilder,
	RoleSelectMenuBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ComponentType,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	UserSelectMenuBuilder
} from 'discord.js';
import EMOJIS from '../utils/emojis.js';
import { generateTranscript } from '../utils/ticketTranscript.js';

const wizardCache = new Map();

function parseEmoji(emojiStr) {
	if (!emojiStr) return null;
	const match = emojiStr.match(/<(a)?:(\w+):(\d+)>/);
	if (match) {
		return { id: match[3], name: match[2], animated: !!match[1] };
	}
	return emojiStr;
}

function replaceVariables(text, vars) {
	return text
		.replace(/{user}/g, vars.user || '')
		.replace(/{user\.tag}/g, vars.userTag || '')
		.replace(/{user\.id}/g, vars.userId || '')
		.replace(/{count}/g, vars.count || '')
		.replace(/{server}/g, vars.server || '')
		.replace(/{reason}/g, vars.reason || 'No reason provided');
}

async function logTicketAction(client, guild, config, action, details) {
	if (!config?.loggingChannel) return;

	const logChannel = await guild.channels.fetch(config.loggingChannel).catch(() => null);
	if (!logChannel) return;

	const icons = {
		created: '🎫',
		closed: '🔒',
		reopened: '🔓',
		deleted: '🗑️',
		claimed: '🙋',
		renamed: '✏️',
		transcript: '📝',
		userAdded: '➕',
		userRemoved: '➖'
	};

	const icon = icons[action] || 'ℹ️';
	const container = new ContainerBuilder()
		.addTextDisplayComponents(td => td.setContent(
			`# ${icon} Ticket ${action.charAt(0).toUpperCase() + action.slice(1)}\n` +
			`${details}`
		))
		.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
}

async function getPanelConfig(client, guildId, panelMessageId) {
	const guildData = await client.db.findOne({ guildId });
	return guildData?.ticketPanels?.find(p => p.messageId === panelMessageId)?.config;
}

async function isStaff(member, config) {
	if (!member) return false;
	if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
	if (config?.supportRole && member.roles.cache.has(config.supportRole)) return true;
	return false;
}

function buildContainer(content) {
	return new ContainerBuilder().addTextDisplayComponents(td => td.setContent(content));
}

export default async (client, interaction) => {
	const { customId, guild, user, channel } = interaction;

	if (interaction.isButton() && customId === 'ticket_wizard_start') {
		wizardCache.set(user.id, { step: 1, data: {} });

		const row = new ActionRowBuilder().addComponents(
			new ChannelSelectMenuBuilder()
				.setCustomId('ticket_wizard_channel')
				.setPlaceholder('Select channel for the panel')
				.setChannelTypes(ChannelType.GuildText)
		);

		const wizardContainer = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# Step 1: Select Panel Channel\nWhere should the ticket panel be sent?'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(row);

		return interaction.reply({
			components: [wizardContainer],
			flags: MessageFlags.IsComponentsV2,
			ephemeral: true
		});
	}

	if (interaction.isChannelSelectMenu() && customId === 'ticket_wizard_channel') {
		const state = wizardCache.get(user.id);
		if (!state) return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Session expired. Please start over.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });

		state.data.panelChannel = interaction.values[0];
		state.step = 2;
		wizardCache.set(user.id, state);

		const row = new ActionRowBuilder().addComponents(
			new ChannelSelectMenuBuilder()
				.setCustomId('ticket_wizard_category')
				.setPlaceholder('Select category for new tickets')
				.setChannelTypes(ChannelType.GuildCategory)
		);

		const step2Container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# Step 2: Select Ticket Category\nWhere should new tickets be created?'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(row);

		return interaction.update({
			components: [step2Container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	if (interaction.isChannelSelectMenu() && customId === 'ticket_wizard_category') {
		const state = wizardCache.get(user.id);
		if (!state) return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Session expired. Please start over.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });

		state.data.category = interaction.values[0];
		state.step = 3;
		wizardCache.set(user.id, state);

		const row = new ActionRowBuilder().addComponents(
			new RoleSelectMenuBuilder()
				.setCustomId('ticket_wizard_role')
				.setPlaceholder('Select support team role')
		);

		const step3Container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# Step 3: Select Support Role\nWhich role should have access to tickets?'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(row);

		return interaction.update({
			components: [step3Container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	if (interaction.isRoleSelectMenu() && customId === 'ticket_wizard_role') {
		const state = wizardCache.get(user.id);
		if (!state) return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Session expired. Please start over.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });

		state.data.supportRole = interaction.values[0];
		state.step = 4;
		wizardCache.set(user.id, state);

		const row = new ActionRowBuilder().addComponents(
			new ChannelSelectMenuBuilder()
				.setCustomId('ticket_wizard_logs')
				.setPlaceholder('Select logging channel (Optional)')
				.setChannelTypes(ChannelType.GuildText)
				.setMinValues(0)
				.setMaxValues(1)
		);

		const skipRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('ticket_wizard_skip_logs')
				.setLabel('Skip Logging')
				.setStyle(ButtonStyle.Secondary)
		);

		const step4Container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# Step 4: Select Logging Channel\nWhere should ticket logs be sent?'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(row)
			.addActionRowComponents(skipRow);

		return interaction.update({
			components: [step4Container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	if ((interaction.isChannelSelectMenu() && customId === 'ticket_wizard_logs') ||
		(interaction.isButton() && customId === 'ticket_wizard_skip_logs')) {

		const state = wizardCache.get(user.id);
		if (!state) return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Session expired. Please start over.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });

		if (interaction.isChannelSelectMenu()) {
			state.data.loggingChannel = interaction.values[0];
		} else {
			state.data.loggingChannel = null;
		}
		state.step = 5;
		wizardCache.set(user.id, state);

		const modal = new ModalBuilder()
			.setCustomId('ticket_wizard_modal')
			.setTitle('Customize Panel');

		modal.addComponents(
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('panel_title')
					.setLabel('Panel Title (emojis supported)')
					.setStyle(TextInputStyle.Short)
					.setValue('Support Tickets')
					.setPlaceholder('🎫 Support Tickets')
					.setRequired(true)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('panel_desc')
					.setLabel('Panel Description (emojis supported)')
					.setStyle(TextInputStyle.Paragraph)
					.setValue('Click the button below to open a ticket.')
					.setPlaceholder('Need help? Click below! 👇')
					.setRequired(true)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('btn_label')
					.setLabel('Button Label')
					.setStyle(TextInputStyle.Short)
					.setValue('Create Ticket')
					.setRequired(true)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('btn_emoji')
					.setLabel('Button Emoji (Unicode or <:name:id>)')
					.setStyle(TextInputStyle.Short)
					.setValue('🎫')
					.setPlaceholder('🎫 or <:ticket:123456789>')
					.setRequired(false)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('panel_color')
					.setLabel('Panel Color (Hex)')
					.setStyle(TextInputStyle.Short)
					.setValue('#5865F2')
					.setRequired(false)
			)
		);

		return interaction.showModal(modal);
	}

	if (interaction.isModalSubmit() && customId === 'ticket_wizard_modal') {
		const state = wizardCache.get(user.id);
		if (!state) return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Session expired. Please start over.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });

		const title = interaction.fields.getTextInputValue('panel_title');
		const description = interaction.fields.getTextInputValue('panel_desc');
		const btnLabel = interaction.fields.getTextInputValue('btn_label');
		const btnEmoji = interaction.fields.getTextInputValue('btn_emoji');
		const colorHex = interaction.fields.getTextInputValue('panel_color') || '#5865F2';
		const color = parseInt(colorHex.replace('#', ''), 16) || 0x5865F2;

		const config = {
			title,
			description,
			color,
			buttonLabel: btnLabel,
			buttonEmoji: btnEmoji,
			buttonStyle: ButtonStyle.Primary,
			category: state.data.category,
			supportRole: state.data.supportRole,
			loggingChannel: state.data.loggingChannel,

			maxTicketsPerUser: 1,
			dmOnClose: false,
			dmOnCreate: false,
			autoCloseOnLeave: false,
			inactivityClose: 0,
			transcriptOnClose: true
		};

		const container = new ContainerBuilder();

		container.addTextDisplayComponents(td =>
			td.setContent(`# ${config.title}`)
		);
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td =>
			td.setContent(config.description)
		);

		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('ticket_create')
				.setLabel(config.buttonLabel)
				.setEmoji(parseEmoji(config.buttonEmoji))
				.setStyle(config.buttonStyle)
		);
		container.addActionRowComponents(row);

		const targetChannel = await guild.channels.fetch(state.data.panelChannel).catch(() => null);
		if (!targetChannel) {
			return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Could not find the target channel.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });
		}

		const guildData = await client.db.findOne({ guildId: guild.id }) || { guildId: guild.id };
		guildData.ticketPanels = guildData.ticketPanels || [];
		if (guildData.ticketPanels.length > 0) {
			const existingPanel = guildData.ticketPanels[0];
			const existingChannel = await guild.channels.fetch(existingPanel.channelId).catch(() => null);
			return interaction.reply({ components: [buildContainer(`${EMOJIS.error} This server already has a ticket panel in ${existingChannel || 'a channel'}. Remove it first using \`.ticket removepanel\`.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });
		}

		let sentMsg;
		let usedFallback = false;
		try {
			sentMsg = await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		} catch (err) {
			if (err.code === 50035 && err.message.includes('Invalid emoji')) {

				config.buttonEmoji = '🎫';
				const fallbackContainer = new ContainerBuilder();
				fallbackContainer.addTextDisplayComponents(td => td.setContent(`# ${config.title}`));
				fallbackContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				fallbackContainer.addTextDisplayComponents(td => td.setContent(config.description));
				fallbackContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				const fallbackRow = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('ticket_create')
						.setLabel(config.buttonLabel)
						.setEmoji('🎫')
						.setStyle(config.buttonStyle)
				);
				fallbackContainer.addActionRowComponents(fallbackRow);
				sentMsg = await targetChannel.send({ components: [fallbackContainer], flags: MessageFlags.IsComponentsV2 });
				usedFallback = true;
			} else {
				throw err;
			}
		}

		guildData.ticketPanels.push({
			messageId: sentMsg.id,
			channelId: sentMsg.channel.id,
			config: config
		});
		await client.db.updateOne({ guildId: guild.id }, { $set: { ticketPanels: guildData.ticketPanels } }, { upsert: true });

		wizardCache.delete(user.id);
		const successMsg = usedFallback
			? `${EMOJIS.success} Ticket panel created in ${targetChannel}!\n⚠️ Invalid emoji detected, used default 🎫 instead.`
			: `${EMOJIS.success} Ticket panel created in ${targetChannel}!`;
		return interaction.reply({ components: [buildContainer(successMsg)], flags: MessageFlags.IsComponentsV2, ephemeral: true });
	}

	if (interaction.isModalSubmit() && customId === 'ticket_rename_modal') {

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === channel.id);
		const config = ticket ? await getPanelConfig(client, guild.id, ticket.panelMessageId) : null;

		const hasPermission = await isStaff(interaction.member, config);
		if (!hasPermission) {
			return interaction.reply({
				components: [buildContainer(`${EMOJIS.error} You need Manage Guild permission or be a support staff to rename tickets.`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const newName = interaction.fields.getTextInputValue('new_name');

		const cleanName = newName.toLowerCase()
			.replace(/[^a-z0-9-_]/g, '')
			.replace(/-+/g, '-')
			.slice(0, 100);

		if (!cleanName || cleanName.length < 2) {
			return interaction.reply({
				components: [buildContainer(`${EMOJIS.error} Invalid channel name. Use only letters, numbers, hyphens and underscores (min 2 characters).`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		try {
			await channel.setName(cleanName);
			return interaction.reply({
				components: [buildContainer(`${EMOJIS.success} Ticket renamed to \`${cleanName}\`.`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		} catch (err) {
			return interaction.reply({
				components: [buildContainer(`${EMOJIS.error} Failed to rename ticket. Try a different name.`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}

	if (interaction.isUserSelectMenu() && customId === 'ticket_adduser_select') {

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === channel.id);
		const config = ticket ? await getPanelConfig(client, guild.id, ticket.panelMessageId) : null;

		const hasPermission = await isStaff(interaction.member, config);
		if (!hasPermission) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} You need Manage Guild permission or be a support staff to add users.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		const targetUser = interaction.users.first();

		if (!targetUser) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} Could not find that user.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		const existingPerms = channel.permissionOverwrites.cache.get(targetUser.id);
		if (existingPerms?.allow.has(PermissionFlagsBits.ViewChannel)) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} <@${targetUser.id}> is already in this ticket.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		await channel.permissionOverwrites.edit(targetUser.id, {
			ViewChannel: true,
			SendMessages: true,
			ReadMessageHistory: true
		});

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success} Added <@${targetUser.id}> to this ticket.`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		return interaction.update({
			components: [buildContainer(`${EMOJIS.success} User added successfully.`)],
			flags: MessageFlags.IsComponentsV2
		});
	}

	if (interaction.isUserSelectMenu() && customId === 'ticket_removeuser_select') {

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === channel.id);
		const config = ticket ? await getPanelConfig(client, guild.id, ticket.panelMessageId) : null;

		const hasPermission = await isStaff(interaction.member, config);
		if (!hasPermission) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} You need Manage Guild permission or be a support staff to remove users.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		const targetUser = interaction.users.first();

		if (!targetUser) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} Could not find that user.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		if (ticket && ticket.userId === targetUser.id) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} You cannot remove the ticket owner.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		const existingPerms = channel.permissionOverwrites.cache.get(targetUser.id);
		if (!existingPerms || !existingPerms.allow.has(PermissionFlagsBits.ViewChannel)) {
			return interaction.update({
				components: [buildContainer(`${EMOJIS.error} <@${targetUser.id}> is not in this ticket.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		await channel.permissionOverwrites.delete(targetUser.id);

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success} Removed <@${targetUser.id}> from this ticket.`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		return interaction.update({
			components: [buildContainer(`${EMOJIS.success} User removed successfully.`)],
				flags: MessageFlags.IsComponentsV2
		});
	}

	if (!interaction.isButton()) return;

	if (customId === 'ticket_create') {
		await interaction.deferReply({ ephemeral: true });

		const guildData = await client.db.findOne({ guildId: guild.id });
		const panel = guildData?.ticketPanels?.find(p => p.messageId === interaction.message.id);

		if (!panel) {
			return interaction.editReply({ components: [buildContainer(`${EMOJIS.error} This ticket panel is no longer valid.`)], flags: MessageFlags.IsComponentsV2 });
		}

		const blacklist = guildData?.ticketBlacklist || [];
		const member = await guild.members.fetch(user.id).catch(() => null);
		const isBlacklisted = blacklist.some(b => {
			if (b.type === 'user' && b.id === user.id) return true;
			if (b.type === 'role' && member?.roles.cache.has(b.id)) return true;
			return false;
		});

		if (isBlacklisted) {
			return interaction.editReply({
				components: [buildContainer(`${EMOJIS.error} You are not allowed to create tickets.`)],
				flags: MessageFlags.IsComponentsV2
			});
		}

		const config = panel.config;
		const maxTickets = config.maxTicketsPerUser || 1;

		const userOpenTickets = (guildData.tickets || []).filter(
			t => t.userId === user.id && !t.closed && t.panelMessageId === interaction.message.id
		);

		if (userOpenTickets.length >= maxTickets) {
			const ticketChannel = await guild.channels.fetch(userOpenTickets[0].channelId).catch(() => null);
			if (ticketChannel) {
				return interaction.editReply({
					components: [buildContainer(`${EMOJIS.error} You already have ${maxTickets} open ticket(s). Max allowed: ${maxTickets}\nExisting: ${ticketChannel}`)],
					flags: MessageFlags.IsComponentsV2
				});
			}
		}

		const ticketCount = (guildData.ticketCount || 0) + 1;

		const vars = {
			user: user.username,
			userTag: user.tag,
			userId: user.id,
			count: ticketCount.toString().padStart(4, '0'),
			server: guild.name
		};

		const cleanUsername = user.username.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 20) || 'user';
		const channelName = `${cleanUsername}-${vars.count}`;

		const parentCategory = config.category ? await guild.channels.fetch(config.category).catch(() => null) : null;

		const permissionOverwrites = [
			{
				id: guild.id,
				deny: [PermissionFlagsBits.ViewChannel]
			},
			{
				id: user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
			},
			{
				id: client.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles]
			}
		];

		if (config.supportRole) {
			permissionOverwrites.push({
				id: config.supportRole,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
			});
		}

		const ticketChannel = await guild.channels.create({
			name: channelName,
			type: ChannelType.GuildText,
			parent: parentCategory?.id,
			permissionOverwrites,
			topic: `Ticket #${ticketCount} | User: ${user.tag} (${user.id}) | Created: ${new Date().toLocaleDateString()}`
		});

		guildData.tickets = guildData.tickets || [];
		const newTicket = {
			channelId: ticketChannel.id,
			userId: user.id,
			panelMessageId: interaction.message.id,
			createdAt: Date.now(),
			closed: false,
			ticketId: ticketCount,
			reason: 'No reason provided',
			claimedBy: null
		};
		guildData.tickets.push(newTicket);
		await client.db.updateOne({ guildId: guild.id }, {
			$set: { tickets: guildData.tickets, ticketCount: ticketCount }
		});

		let mentionContent = `<@${user.id}>`;

		if (config.pingOnCall === true) {
			if (config.supportRole) mentionContent += ` <@&${config.supportRole}>`;
			if (guildData.ticketOnCall?.length > 0) {
				mentionContent += ' ' + guildData.ticketOnCall.map(id => `<@${id}>`).join(' ');
			}
		}

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# Ticket #${ticketCount}`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(td => td.setContent(`${mentionContent}\n\nWelcome! Support will be with you shortly.`));

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('ticket_close_ask')
				.setLabel('Close')
				.setStyle(ButtonStyle.Danger)
				.setEmoji('🔒'),
			new ButtonBuilder()
				.setCustomId('ticket_claim')
				.setLabel('Claim')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('🙋‍♂️'),
			new ButtonBuilder()
				.setCustomId('ticket_rename')
				.setLabel('Rename')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('✏️'),
			new ButtonBuilder()
				.setCustomId('ticket_adduser')
				.setLabel('Add User')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('➕'),
			new ButtonBuilder()
				.setCustomId('ticket_removeuser')
				.setLabel('Remove User')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('➖')
		);
		container.addActionRowComponents(row);

		await ticketChannel.send({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});

		await logTicketAction(client, guild, config, 'created',
			`User: <@${user.id}>\nChannel: ${ticketChannel}\nTicket ID: #${ticketCount}`
		);

		if (config.dmOnCreate) {
			try {
				await user.send({
					content: `Your ticket **#${ticketCount}** has been created in **${guild.name}**!\nChannel: ${ticketChannel}`
				});
			} catch {}
		}

		return interaction.editReply({ components: [buildContainer(`${EMOJIS.success} Ticket created: ${ticketChannel}`)], flags: MessageFlags.IsComponentsV2 });
	}

	if (customId === 'ticket_close_ask') {
		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# Close Ticket'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(td => td.setContent('Are you sure you want to close this ticket?'))

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('ticket_confirm_close')
				.setLabel('Close Ticket')
				.setStyle(ButtonStyle.Danger)
				.setEmoji('🔒'),
			new ButtonBuilder()
				.setCustomId('ticket_cancel_close')
				.setLabel('Cancel')
				.setStyle(ButtonStyle.Secondary)
		);
		container.addActionRowComponents(row);

		return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
	}

	if (customId === 'ticket_cancel_close') {
		const container = buildContainer('Close cancelled.');
		return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
	}

	if (customId === 'ticket_confirm_close' || customId.startsWith('ticket_confirm_close_')) {
		await interaction.deferUpdate();

		const targetChannelId = customId.startsWith('ticket_confirm_close_')
			? customId.replace('ticket_confirm_close_', '')
			: channel.id;

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticketIdx = guildData?.tickets?.findIndex(t => t.channelId === targetChannelId && !t.closed);

		if (ticketIdx === -1 || ticketIdx === undefined) {
			const container = buildContainer(`${EMOJIS.error} Ticket not found or already closed.`);
			return interaction.followUp({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		}

		const ticket = guildData.tickets[ticketIdx];
		const config = await getPanelConfig(client, guild.id, ticket.panelMessageId);

		const ticketChannel = await guild.channels.fetch(targetChannelId).catch(() => null);
		if (!ticketChannel) {
			const container = buildContainer(`${EMOJIS.error} Ticket channel no longer exists.`);
			return interaction.followUp({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		}

		guildData.tickets[ticketIdx].closed = true;
		guildData.tickets[ticketIdx].closedAt = Date.now();
		guildData.tickets[ticketIdx].closedBy = user.id;
		await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets } });

		const ticketUserId = ticket.userId;
		const ticketUser = await client.users.fetch(ticketUserId).catch(() => null);
		const cleanUsername = ticketUser ?
			ticketUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user' : 'user';

		if (ticketChannel) {
			await ticketChannel.setName(`closed-${cleanUsername}-${ticket.ticketId.toString().padStart(4, '0')}`).catch(() => {});
		}

		await ticketChannel.permissionOverwrites.edit(ticketUserId, { ViewChannel: false }).catch(() => {});

		const everyoneRoleId = guild.roles.everyone.id;
		await ticketChannel.permissionOverwrites.edit(everyoneRoleId, { SendMessages: false }).catch(() => {});

		let transcriptFile = null;
		if (config?.transcriptOnClose) {
			try {
				transcriptFile = await generateTranscript(ticketChannel, ticket, guild);
			} catch (err) {
				console.error('[Ticket] Failed to generate transcript:', err);
			}
		}

		await logTicketAction(client, guild, config, 'closed',
			`Ticket: #${ticket.ticketId}\nClosed by: <@${user.id}>\nOriginal User: <@${ticketUserId}>`
		);

		if (config?.dmOnClose) {
			try {
				const ticketOwner = ticketUser || await client.users.fetch(ticketUserId);
				const dmContent = { content: `Your ticket **#${ticket.ticketId}** in **${guild.name}** has been closed.` };
				if (transcriptFile) dmContent.files = [transcriptFile];
				await ticketOwner.send(dmContent);
			} catch (err) {
				console.error('[Ticket] Failed to send DM:', err.message);
			}
		}

		if (config?.feedbackEnabled) {
			const feedbackContainer = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent('# ⭐ Rate Your Experience\nHow would you rate the support you received?'))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const ratingRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId(`ticket_rate_1_${guild.id}_${ticket.channelId}`).setLabel('1').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
				new ButtonBuilder().setCustomId(`ticket_rate_2_${guild.id}_${ticket.channelId}`).setLabel('2').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
				new ButtonBuilder().setCustomId(`ticket_rate_3_${guild.id}_${ticket.channelId}`).setLabel('3').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
				new ButtonBuilder().setCustomId(`ticket_rate_4_${guild.id}_${ticket.channelId}`).setLabel('4').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
				new ButtonBuilder().setCustomId(`ticket_rate_5_${guild.id}_${ticket.channelId}`).setLabel('5').setStyle(ButtonStyle.Secondary).setEmoji('⭐')
			);
			feedbackContainer.addActionRowComponents(ratingRow);

			try {
				const ticketOwner = await client.users.fetch(ticketUserId);
				await ticketOwner.send({ components: [feedbackContainer], flags: MessageFlags.IsComponentsV2 });
			} catch (err) {
				console.error('[Ticket] Failed to send feedback DM:', err.message);
			}
		}

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# 🔒 Ticket Closed`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(td => td.setContent(`Closed by <@${user.id}>\n\nUse the buttons below to manage this ticket.`));

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('ticket_reopen')
				.setLabel('Reopen')
				.setStyle(ButtonStyle.Success)
				.setEmoji('🔓'),
			new ButtonBuilder()
				.setCustomId('ticket_transcript')
				.setLabel('Transcript')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('📝'),
			new ButtonBuilder()
				.setCustomId('ticket_delete')
				.setLabel('Delete')
				.setStyle(ButtonStyle.Danger)
				.setEmoji('🗑️')
		);
		container.addActionRowComponents(row);

		await ticketChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

		const successContainer = buildContainer(`${EMOJIS.success} Ticket has been closed successfully.`);
		await interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(async () => {

			await interaction.followUp({ components: [successContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
		});

		if (channel.id !== ticketChannel.id) {
			const confirmContainer = buildContainer(`${EMOJIS.success} Ticket \`#${ticket.ticketId}\` has been closed.`);
			await interaction.followUp({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2 });
		}
	}

	if (customId === 'ticket_reopen') {
		await interaction.deferUpdate();

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticketIdx = guildData?.tickets?.findIndex(t => t.channelId === channel.id);

		if (ticketIdx === -1) return;

		const ticket = guildData.tickets[ticketIdx];
		const config = await getPanelConfig(client, guild.id, ticket.panelMessageId);

		guildData.tickets[ticketIdx].closed = false;
		await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets } });

		const ticketUser = await client.users.fetch(ticket.userId).catch(() => null);
		const cleanUsername = ticketUser ?
			ticketUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user' : 'user';
		await channel.setName(`${cleanUsername}-${ticket.ticketId.toString().padStart(4, '0')}`);

		await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true });

		const everyoneRoleId = guild.roles.everyone.id;
		await channel.permissionOverwrites.edit(everyoneRoleId, { SendMessages: null }).catch(() => {});

		await logTicketAction(client, guild, config, 'reopened',
			`Ticket: #${ticket.ticketId}\nReopened by: <@${user.id}>`
		);

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# 🔓 Ticket Reopened\nReopened by <@${user.id}>`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

		await interaction.message.delete().catch(() => {});
	}

	if (customId === 'ticket_transcript') {
		await interaction.deferReply({ ephemeral: true });

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === channel.id);

		if (!ticket) {
			return interaction.editReply({ components: [buildContainer(`${EMOJIS.error} Could not find ticket data.`)], flags: MessageFlags.IsComponentsV2 });
		}

		const config = await getPanelConfig(client, guild.id, ticket.panelMessageId);

		const transcriptFile = await generateTranscript(channel, ticket, guild);

		await channel.send({
			files: [transcriptFile],
			allowedMentions: { parse: [] }
		});

		const transcriptContainer = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# 📝 Transcript Saved\n**Ticket:** #${ticket.ticketId}\n**Saved by:** <@${user.id}>`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await channel.send({
			components: [transcriptContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		});

		await interaction.editReply({
			components: [buildContainer(`${EMOJIS.success} Transcript saved to this channel!`)],
			flags: MessageFlags.IsComponentsV2
		});
	}

	if (customId === 'ticket_delete' || customId === 'ticket_confirm_delete' || customId.startsWith('ticket_confirm_delete_')) {

		await interaction.deferReply({ ephemeral: false }).catch(() => {});

		const targetChannelId = customId.startsWith('ticket_confirm_delete_')
			? customId.replace('ticket_confirm_delete_', '')
			: channel.id;

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === targetChannelId);

		if (!ticket) {
			const container = buildContainer(`${EMOJIS.error} Ticket not found.`);
			return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		const config = ticket ? await getPanelConfig(client, guild.id, ticket.panelMessageId) : null;

		const ticketChannel = await guild.channels.fetch(targetChannelId).catch(() => null);
		if (!ticketChannel) {
			const container = buildContainer(`${EMOJIS.error} Ticket channel no longer exists.`);
			return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		if (config?.transcriptOnClose && config?.loggingChannel) {
			const logChannel = await guild.channels.fetch(config.loggingChannel).catch(() => null);
			if (logChannel) {
				try {
					const transcriptFile = await generateTranscript(ticketChannel, ticket, guild);

					await logChannel.send({
						files: [transcriptFile],
						allowedMentions: { parse: [] }
					});

					const logContainer = new ContainerBuilder()
						.addTextDisplayComponents(td => td.setContent(`# 📝 Transcript (Before Delete)\n**Ticket:** #${ticket.ticketId}\n**Deleted by:** <@${user.id}>`))
						.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					await logChannel.send({
						components: [logContainer],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { parse: [] }
					});
				} catch (err) {
					console.error('Failed to save transcript before delete:', err);
				}
			}
		}

		await logTicketAction(client, guild, config, 'deleted',
			`Ticket: #${ticket?.ticketId || 'Unknown'}\nDeleted by: <@${user.id}>\nOriginal User: <@${ticket?.userId || 'Unknown'}>`
		);

		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# 🗑️ Deleting Ticket\nTicket \`#${ticket.ticketId}\` will be deleted in 5 seconds...`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

		if (channel.id !== ticketChannel.id) {
			const ticketContainer = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# 🗑️ Ticket Scheduled for Deletion\nThis ticket will be deleted in 5 seconds by <@${user.id}>.`))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			await ticketChannel.send({ components: [ticketContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
		}

		setTimeout(() => {
			ticketChannel.delete().catch(() => {});
		}, 5000);
	}

	if (customId === 'ticket_claim' || customId === 'ticket_unclaim') {
		await interaction.deferUpdate();

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticketIdx = guildData?.tickets?.findIndex(t => t.channelId === channel.id);

		if (ticketIdx !== -1) {
			const ticket = guildData.tickets[ticketIdx];
			const config = await getPanelConfig(client, guild.id, ticket.panelMessageId);

			if (customId === 'ticket_claim') {

				const hasPermission = await isStaff(interaction.member, config);
				if (!hasPermission) {
					return interaction.followUp({
						components: [buildContainer(`${EMOJIS.error} You need Manage Guild permission or be a support staff to claim tickets.`)],
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				if (ticket.claimedBy) {
					return interaction.followUp({
						components: [buildContainer(`${EMOJIS.error} This ticket is already claimed by <@${ticket.claimedBy}>.`)],
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				guildData.tickets[ticketIdx].claimedBy = user.id;
				guildData.tickets[ticketIdx].claimedAt = Date.now();
				await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets } });

				const claimContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# 🙋 Ticket Claimed\n<@${user.id}> is now handling this ticket.`))
					.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				await channel.send({ components: [claimContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

				await logTicketAction(client, guild, config, 'claimed', `Ticket: #${ticket.ticketId}\nClaimed by: <@${user.id}>`);
			} else {

				if (!ticket.claimedBy) {
					return interaction.followUp({
						components: [buildContainer(`${EMOJIS.error} This ticket is not claimed.`)],
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				if (ticket.claimedBy !== user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
					return interaction.followUp({
						components: [buildContainer(`${EMOJIS.error} Only the claimer or staff with Manage Channels can unclaim.`)],
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				guildData.tickets[ticketIdx].claimedBy = null;
				guildData.tickets[ticketIdx].claimedAt = null;
				await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets } });

				const unclaimContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# 🔓 Ticket Unclaimed\n<@${user.id}> has released this ticket.`))
					.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				await channel.send({ components: [unclaimContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
			}
		}
	}

	if (customId.startsWith('ticket_closerequest_approve_') || customId.startsWith('ticket_closerequest_deny_')) {
		const targetChannelId = customId.split('_').pop();
		const isApprove = customId.includes('_approve_');

		const guildData = await client.db.findOne({ guildId: guild.id });
		const ticket = guildData?.tickets?.find(t => t.channelId === targetChannelId);

		if (!ticket) {
			return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Ticket not found.`)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		}

		if (user.id !== ticket.userId) {
			return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Only the ticket owner can respond to this.`)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		}

		await interaction.deferUpdate();

		if (isApprove) {

			const ticketIdx = guildData.tickets.findIndex(t => t.channelId === targetChannelId);
			const config = await getPanelConfig(client, guild.id, ticket.panelMessageId);

			guildData.tickets[ticketIdx].closed = true;
			guildData.tickets[ticketIdx].closedAt = Date.now();
			guildData.tickets[ticketIdx].closedBy = user.id;
			await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets } });

			const ticketChannel = await guild.channels.fetch(targetChannelId).catch(() => null);
			if (ticketChannel) {

				const ticketUser = await client.users.fetch(ticket.userId).catch(() => null);
				const cleanUsername = ticketUser ?
					ticketUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user' : 'user';
				await ticketChannel.setName(`closed-${cleanUsername}-${ticket.ticketId.toString().padStart(4, '0')}`);
				await ticketChannel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false });

				if (config?.transcriptOnClose) {
					const transcriptFile = await generateTranscript(ticketChannel, ticket, guild);
					if (transcriptFile && config.loggingChannel) {
						const logChannel = await guild.channels.fetch(config.loggingChannel).catch(() => null);
						if (logChannel) {
							await logChannel.send({ files: [transcriptFile] });
						}
					}
				}

				if (config?.feedbackEnabled) {
					const feedbackContainer = new ContainerBuilder()
						.addTextDisplayComponents(td => td.setContent('# ⭐ Rate Your Experience\nHow would you rate the support you received?'))
						.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

					const ratingRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId(`ticket_rate_1_${guild.id}_${ticket.channelId}`).setLabel('1').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
						new ButtonBuilder().setCustomId(`ticket_rate_2_${guild.id}_${ticket.channelId}`).setLabel('2').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
						new ButtonBuilder().setCustomId(`ticket_rate_3_${guild.id}_${ticket.channelId}`).setLabel('3').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
						new ButtonBuilder().setCustomId(`ticket_rate_4_${guild.id}_${ticket.channelId}`).setLabel('4').setStyle(ButtonStyle.Secondary).setEmoji('⭐'),
						new ButtonBuilder().setCustomId(`ticket_rate_5_${guild.id}_${ticket.channelId}`).setLabel('5').setStyle(ButtonStyle.Secondary).setEmoji('⭐')
					);
					feedbackContainer.addActionRowComponents(ratingRow);

					try {
						const ticketOwner = await client.users.fetch(ticket.userId);
						await ticketOwner.send({ components: [feedbackContainer], flags: MessageFlags.IsComponentsV2 });
					} catch {}
				}

				const closedContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# 🔒 Ticket Closed\nClosed by <@${user.id}> (approved close request)`))
					.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const row = new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
					new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
					new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
				);
				closedContainer.addActionRowComponents(row);

				await ticketChannel.send({ components: [closedContainer], flags: MessageFlags.IsComponentsV2 });
			}
		} else {

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# Close Request Denied\n<@${user.id}> has chosen to keep this ticket open.`))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		const resultContainer = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(isApprove ? `${EMOJIS.success} Close request approved.` : `${EMOJIS.error} Close request denied.`));
		await interaction.editReply({ components: [resultContainer] });
	}

	if (customId === 'ticket_rename') {
		const modal = new ModalBuilder()
			.setCustomId('ticket_rename_modal')
			.setTitle('Rename Ticket');

		const nameInput = new TextInputBuilder()
			.setCustomId('new_name')
			.setLabel('New Channel Name')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter new channel name (letters, numbers, hyphens only)')
			.setRequired(true)
			.setMaxLength(50);

		const row = new ActionRowBuilder().addComponents(nameInput);
		modal.addComponents(row);

		return interaction.showModal(modal);
	}

	if (customId === 'ticket_adduser') {
		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# ➕ Add User to Ticket\nSelect a user to add to this ticket.'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const userSelectRow = new ActionRowBuilder().addComponents(
			new UserSelectMenuBuilder()
				.setCustomId('ticket_adduser_select')
				.setPlaceholder('Select a user...')
				.setMinValues(1)
				.setMaxValues(1)
		);
		container.addActionRowComponents(userSelectRow);

		return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	}

	if (customId === 'ticket_removeuser') {
		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent('# ➖ Remove User from Ticket\nSelect a user to remove from this ticket.'))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const userSelectRow = new ActionRowBuilder().addComponents(
			new UserSelectMenuBuilder()
				.setCustomId('ticket_removeuser_select')
				.setPlaceholder('Select a user...')
				.setMinValues(1)
				.setMaxValues(1)
		);
		container.addActionRowComponents(userSelectRow);

		return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	}

	if (customId.startsWith('ticket_rate_')) {
		const parts = customId.split('_');
		const rating = parseInt(parts[2]);
		const ratingGuildId = parts[3];
		const ticketChannelId = parts[4];

		const guildData = await client.db.findOne({ guildId: ratingGuildId });
		const ticketIdx = guildData?.tickets?.findIndex(t => t.channelId === ticketChannelId);

		if (ticketIdx === -1 || ticketIdx === undefined) {
			return interaction.reply({ components: [buildContainer(`${EMOJIS.error} Ticket not found.`)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
		}

		guildData.tickets[ticketIdx].rating = rating;
		guildData.tickets[ticketIdx].ratedAt = Date.now();
		await client.db.updateOne({ guildId: ratingGuildId }, { $set: { tickets: guildData.tickets } });

		const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# Thank You!\nYou rated this ticket: ${stars}\n\nWe appreciate your feedback!`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		await interaction.update({ components: [container] });

		const ticket = guildData.tickets[ticketIdx];
		const ratingGuild = await client.guilds.fetch(ratingGuildId).catch(() => null);
		if (ratingGuild) {
			const config = await getPanelConfig(client, ratingGuildId, ticket.panelMessageId);
			await logTicketAction(client, ratingGuild, config, 'rated',
				`Ticket: #${ticket.ticketId}\nRating: ${stars}\nUser: <@${user.id}>`
			);
		}
	}
};
