import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
	PermissionFlagsBits,
	ChannelType
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { generateTranscript } from '../../../utils/ticketTranscript.js';

function buildResponseContainer(content) {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(content));
	return container;
}

async function sendReply(message, content) {
	const container = buildResponseContainer(content);
	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}

function parseTicketId(arg) {
	if (!arg) return null;

	const cleaned = arg.replace(/^#/, '');
	const num = parseInt(cleaned, 10);
	return isNaN(num) ? null : num;
}

async function findTicket(client, guild, channelId, ticketIdArg = null, requireOpen = true) {
	const guildData = await client.db.findOne({ guildId: guild.id });
	if (!guildData?.tickets?.length) return null;

	let ticket, ticketIdx;

	if (ticketIdArg !== null) {

		const ticketId = parseTicketId(ticketIdArg);
		if (ticketId === null) return null;

		ticketIdx = guildData.tickets.findIndex(t =>
			t.ticketId === ticketId && (requireOpen ? !t.closed : true)
		);
	} else {

		ticketIdx = guildData.tickets.findIndex(t =>
			t.channelId === channelId && (requireOpen ? !t.closed : true)
		);
	}

	if (ticketIdx === -1) return null;

	ticket = guildData.tickets[ticketIdx];
	const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);

	return { ticket, ticketIdx, guildData, channel };
}

function isStaffMember(message, guildData) {
	const member = message.member;
	if (!member) return false;

	if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
	if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
	if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;

	const supportRole = guildData?.ticketPanels?.[0]?.config?.supportRole;
	if (supportRole && member.roles.cache.has(supportRole)) return true;

	if (guildData?.ticketStaff?.length) {
		const isInStaff = guildData.ticketStaff.some(s => {
			if (s.type === 'role') return member.roles.cache.has(s.id);
			if (s.type === 'user') return s.id === member.id;
			return false;
		});
		if (isInStaff) return true;
	}

	return false;
}

async function createTicketFromCommand(message, reason = 'No reason provided') {
	const client = message.client;
	const { guild, author: user } = message;

	const guildData = await client.db.findOne({ guildId: guild.id });

	if (!guildData?.ticketPanels?.length) {
		return sendReply(message, `${EMOJIS.error} No ticket panels configured. Ask an admin to run \`.ticket setup\`.`);
	}

	const blacklist = guildData?.ticketBlacklist || [];
	const isBlacklisted = blacklist.some(b => {
		if (b.type === 'user' && b.id === user.id) return true;
		if (b.type === 'role' && message.member?.roles.cache.has(b.id)) return true;
		return false;
	});

	if (isBlacklisted) {
		return sendReply(message, `${EMOJIS.error} You are not allowed to create tickets.`);
	}

	const panel = guildData.ticketPanels[0];
	const config = panel.config;
	const maxTickets = config.maxTicketsPerUser || 1;

	const userOpenTickets = (guildData.tickets || []).filter(
		t => t.userId === user.id && !t.closed
	);

	if (userOpenTickets.length >= maxTickets) {
		const ticketChannel = await guild.channels.fetch(userOpenTickets[0].channelId).catch(() => null);
		return sendReply(message, `${EMOJIS.error} You already have an open ticket: ${ticketChannel || 'Unknown'}`);
	}

	const ticketCount = (guildData.ticketCount || 0) + 1;

	const cleanUsername = user.username.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.slice(0, 20) || 'user';
	const channelName = `${cleanUsername}-${ticketCount.toString().padStart(4, '0')}`;

	const parentCategory = config.category ? await guild.channels.fetch(config.category).catch(() => null) : null;

	const permissionOverwrites = [
		{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
		{ id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
		{ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] }
	];

	if (config.supportRole) {
		permissionOverwrites.push({
			id: config.supportRole,
			allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
		});
	}

	const ticketChannel = await guild.channels.create({
		name: channelName,
		type: ChannelType.GuildText,
		parent: parentCategory?.id,
		permissionOverwrites,
		topic: `Ticket #${ticketCount} | User: ${user.tag} (${user.id}) | Reason: ${reason.slice(0, 100)}`
	});

	guildData.tickets = guildData.tickets || [];
	guildData.tickets.push({
		channelId: ticketChannel.id,
		userId: user.id,
		panelMessageId: panel.messageId,
		createdAt: Date.now(),
		closed: false,
		ticketId: ticketCount,
		reason: reason,
		claimedBy: null
	});
	await client.db.updateOne({ guildId: guild.id }, { $set: { tickets: guildData.tickets, ticketCount } });

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
		new ButtonBuilder().setCustomId('ticket_close_ask').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
		new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋‍♂️'),
		new ButtonBuilder().setCustomId('ticket_rename').setLabel('Rename').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
		new ButtonBuilder().setCustomId('ticket_adduser').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
		new ButtonBuilder().setCustomId('ticket_removeuser').setLabel('Remove User').setStyle(ButtonStyle.Secondary).setEmoji('➖')
	);
	container.addActionRowComponents(row);

	await ticketChannel.send({
		components: [container],
		flags: MessageFlags.IsComponentsV2
	});

	if (config.loggingChannel) {
		const logChannel = await guild.channels.fetch(config.loggingChannel).catch(() => null);
		if (logChannel) {
			const logContainer = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# 🎫 Ticket Created\n**User:** <@${user.id}>\n**Channel:** ${ticketChannel}\n**Reason:** ${reason}`));
			logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
		}
	}

	return sendReply(message, `${EMOJIS.success} Ticket created: ${ticketChannel}`);
}

export default {
	name: 'ticket',
	aliases: ['tickets', 't'],
	category: 'Tickets',

	async execute(message, args) {
		const client = message.client;
		const subcommand = args[0]?.toLowerCase() || '';
		const guildDataPerms = await client.db.findOne({ guildId: message.guild.id }) || {};
		const isStaff = isStaffMember(message, guildDataPerms);

		if (subcommand === 'create' || subcommand === 'new' || subcommand === 'open') {
			const reason = args.slice(1).join(' ') || 'No reason provided';
			return createTicketFromCommand(message, reason);
		}

		if (subcommand === 'setup' || subcommand === 'panel') {
			if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
				return sendReply(message, `${EMOJIS.error} You need Administrator permissions to setup tickets.`);
			}

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td =>
					td.setContent(`# Ticket System Setup\nClick the button below to start the interactive setup wizard for your ticket panel.`)
				)
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('ticket_wizard_start')
					.setLabel('Start Setup')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🪄')
			);
			container.addActionRowComponents(row);

			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (subcommand === 'removepanel' || subcommand === 'deletepanel') {
			if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
				return sendReply(message, `${EMOJIS.error} You need Administrator permissions to remove ticket panels.`);
			}

			const targetChannel = message.mentions.channels.first() ||
							  message.guild.channels.cache.get(args[1]) ||
							  message.channel;

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			const panelIdx = guildData?.ticketPanels?.findIndex(p => p.channelId === targetChannel.id);

			if (panelIdx === -1 || panelIdx === undefined) {
				return sendReply(message, `${EMOJIS.error} No ticket panel found in ${targetChannel}.`);
			}

			const panel = guildData.ticketPanels[panelIdx];

			const panelChannel = await message.guild.channels.fetch(panel.channelId).catch(() => null);
			if (panelChannel) {
				const panelMsg = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
				if (panelMsg) {
					await panelMsg.delete().catch(() => {});
				}
			}

			guildData.ticketPanels.splice(panelIdx, 1);
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketPanels: guildData.ticketPanels } });

			return sendReply(message, `${EMOJIS.success} Ticket panel removed from ${targetChannel}.`);
		}

		if (subcommand === 'add') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to add users.`);
			}

			if (!args[1] && !message.mentions.users.size) {
				return sendReply(message, `${EMOJIS.error} Please provide a user to add.\n**Usage:** \`.ticket add [ticketID] <@user/userID>\`\n**Example:** \`.ticket add #0001 @user\` or \`.ticket add @user\` (in ticket channel)`);
			}

			let ticketIdArg = null;
			let userArg = args[1];

			if (args[1] && parseTicketId(args[1]) !== null && !args[1].startsWith('<@')) {
				ticketIdArg = args[1];
				userArg = args[2];
			}

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This command can only be used in open tickets, or specify a ticket ID.\n**Usage:** \`.ticket add #0001 @user\``);
			}

			const { ticket, channel } = result;
			if (!channel) return sendReply(message, `${EMOJIS.error} Could not find the ticket channel.`);

			const user = message.mentions.users.first() || await client.users.fetch(userArg).catch(() => null);
			if (!user) return sendReply(message, `${EMOJIS.error} Could not find that user. Please provide a valid mention or user ID.`);

			const existingPerms = channel.permissionOverwrites.cache.get(user.id);
			if (existingPerms?.allow.has(PermissionFlagsBits.ViewChannel)) {
				return sendReply(message, `${EMOJIS.error} ${user} is already in ticket \`#${ticket.ticketId}\`.`);
			}

			await channel.permissionOverwrites.edit(user.id, {
				ViewChannel: true,
				SendMessages: true,
				ReadMessageHistory: true
			});

			return sendReply(message, `${EMOJIS.success} Added ${user} to ticket \`#${ticket.ticketId}\`.`);
		}

		if (subcommand === 'remove') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to remove users.`);
			}

			if (!args[1] && !message.mentions.users.size) {
				return sendReply(message, `${EMOJIS.error} Please provide a user to remove.\n**Usage:** \`.ticket remove [ticketID] <@user/userID>\`\n**Example:** \`.ticket remove #0001 @user\` or \`.ticket remove @user\` (in ticket channel)`);
			}

			let ticketIdArg = null;
			let userArg = args[1];

			if (args[1] && parseTicketId(args[1]) !== null && !args[1].startsWith('<@')) {
				ticketIdArg = args[1];
				userArg = args[2];
			}

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This command can only be used in open tickets, or specify a ticket ID.\n**Usage:** \`.ticket remove #0001 @user\``);
			}

			const { ticket, guildData, channel } = result;
			if (!channel) return sendReply(message, `${EMOJIS.error} Could not find the ticket channel.`);

			const user = message.mentions.users.first() || await client.users.fetch(userArg?.replace(/[<@!>]/g, '')).catch(() => null);
			if (!user) return sendReply(message, `${EMOJIS.error} Could not find that user. Please provide a valid mention or user ID.`);

			const existingPerms = channel.permissionOverwrites.cache.get(user.id);
			if (!existingPerms || !existingPerms.allow.has(PermissionFlagsBits.ViewChannel)) {
				return sendReply(message, `${EMOJIS.error} <@${user.id}> is not in ticket \`#${ticket.ticketId}\`.`);
			}

			if (ticket.userId === user.id) {
				return sendReply(message, `${EMOJIS.error} You cannot remove the ticket owner.`);
			}

			await channel.permissionOverwrites.delete(user.id);

			return sendReply(message, `${EMOJIS.success} Removed ${user} from ticket \`#${ticket.ticketId}\`.`);
		}

		if (subcommand === 'claim') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to claim tickets.`);
			}

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket. Use \`.ticket claim <ticketID>\` to claim a specific ticket.`);
			}

			const { ticket, ticketIdx, guildData, channel } = result;

			if (ticket.claimedBy) {
				return sendReply(message, `${EMOJIS.error} Ticket \`#${ticket.ticketId}\` is already claimed by <@${ticket.claimedBy}>.`);
			}

			guildData.tickets[ticketIdx].claimedBy = message.author.id;
			guildData.tickets[ticketIdx].claimedAt = Date.now();
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

			const container = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# Ticket Claimed\n<@${message.author.id}> is now handling ticket \`#${ticket.ticketId}\`.`))
					.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			if (channel && channel.id !== message.channel.id) {
				await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		if (subcommand === 'close') {

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is already closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket. Use \`.ticket close <ticketID>\` to close a specific ticket.`);
			}

			const { ticket, channel } = result;

			const isOwner = ticket.userId === message.author.id;
			if (!isStaff && !isOwner) {
				return sendReply(message, `${EMOJIS.error} You need ticket staff permissions or be the ticket owner to close this ticket.`);
			}

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# Close Ticket\nAre you sure you want to close ticket \`#${ticket.ticketId}\`?`))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`ticket_confirm_close_${ticket.channelId}`)
					.setLabel('Close Ticket')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('🔒'),
				new ButtonBuilder()
					.setCustomId('ticket_cancel_close')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary)
			);
			container.addActionRowComponents(row);

			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (subcommand === 'reopen' || subcommand === 'open') {

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			if (!guildData?.tickets?.length) {
				return sendReply(message, `${EMOJIS.error} No tickets found.`);
			}

			let ticket, ticketIdx;
			if (ticketIdArg !== null) {
				const ticketId = parseTicketId(ticketIdArg);
				ticketIdx = guildData.tickets.findIndex(t => t.ticketId === ticketId && t.closed);
			} else {
				ticketIdx = guildData.tickets.findIndex(t => t.channelId === message.channel.id && t.closed);
			}

			if (ticketIdx === -1) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is already open.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not a closed ticket. Use \`.ticket reopen <ticketID>\` to reopen a specific ticket.`);
			}

			ticket = guildData.tickets[ticketIdx];
			const channel = await message.guild.channels.fetch(ticket.channelId).catch(() => null);

			if (!channel) {
				return sendReply(message, `${EMOJIS.error} The ticket channel no longer exists.`);
			}

			const isOwner = ticket.userId === message.author.id;
			if (!isStaff && !isOwner) {
				return sendReply(message, `${EMOJIS.error} You need ticket staff permissions or be the ticket owner to reopen this ticket.`);
			}

			guildData.tickets[ticketIdx].closed = false;
			guildData.tickets[ticketIdx].closedAt = null;
			guildData.tickets[ticketIdx].closedBy = null;
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

			await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true });

			const ticketUser = await client.users.fetch(ticket.userId).catch(() => null);
			const cleanUsername = ticketUser ?
				ticketUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user' : 'user';
			await channel.setName(`${cleanUsername}-${ticket.ticketId.toString().padStart(4, '0')}`);

			const reopenContainer = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# 🔓 Ticket Reopened\nReopened by <@${message.author.id}>`));
			await channel.send({ components: [reopenContainer], flags: MessageFlags.IsComponentsV2 });

			if (channel.id !== message.channel.id) {
				return sendReply(message, `${EMOJIS.success} Ticket \`#${ticket.ticketId}\` has been reopened: ${channel}`);
			} else {
				return sendReply(message, `${EMOJIS.success} Ticket \`#${ticket.ticketId}\` has been reopened.`);
			}
		}

		if (subcommand === 'rename') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to rename tickets.`);
			}

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;
			const nameArgs = ticketIdArg ? args.slice(2) : args.slice(1);

			if (nameArgs.length === 0) {
				return sendReply(message, `${EMOJIS.error} Please provide a new name.\n**Usage:** \`.ticket rename [ticketID] <name>\``);
			}

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket. Use \`.ticket rename <ticketID> <name>\` to rename a specific ticket.`);
			}

			const { ticket, channel } = result;

			let newName = nameArgs.join('-').toLowerCase()
				.replace(/[^a-z0-9-_]/g, '')
				.replace(/-+/g, '-')
				.slice(0, 100);

			if (!newName || newName.length < 2) {
				return sendReply(message, `${EMOJIS.error} Invalid channel name. Use only letters, numbers, hyphens and underscores (min 2 characters).`);
			}

			try {
				await channel.setName(newName);

				const successMsg = `${EMOJIS.success} Ticket \`#${ticket.ticketId}\` renamed to \`${newName}\`.`;

				if (channel.id !== message.channel.id) {
					const notifyContainer = new ContainerBuilder()
						.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success} This ticket was renamed to \`${newName}\` by <@${message.author.id}>.`));
					await channel.send({ components: [notifyContainer], flags: MessageFlags.IsComponentsV2 });
				}

				return sendReply(message, successMsg);
			} catch (err) {
				return sendReply(message, `${EMOJIS.error} Failed to rename ticket. Try a different name.`);
			}
		}

		if (subcommand === 'transcript' || subcommand === 'save') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to generate transcripts.`);
			}

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, false);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not a ticket channel. Use \`.ticket transcript <ticketID>\` to generate transcript for a specific ticket.`);
			}

			const { ticket, channel } = result;

			const loadingMsg = await sendReply(message, `${EMOJIS.loading} Generating transcript for ticket \`#${ticket.ticketId}\`...`);

			try {
				const transcriptFile = await generateTranscript(channel, ticket, message.guild);

				await message.channel.send({
					files: [transcriptFile],
					allowedMentions: { parse: [] }
				});

				const successContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success} **Transcript Generated**\nTicket \`#${ticket.ticketId}\` - Saved by <@${message.author.id}>`));

				await message.channel.send({
					components: [successContainer],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { parse: [] }
				});
				await loadingMsg.delete().catch(() => {});
			} catch (err) {
				console.error('Transcript error:', err);
				const errorContainer = buildResponseContainer(`${EMOJIS.error} Failed to generate transcript.`);
				await loadingMsg.edit({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			}
			return;
		}

		if (subcommand === 'delete') {
			if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels permission.`);
			}

			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, false);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not a ticket channel. Use \`.ticket delete <ticketID>\` to delete a specific ticket.`);
			}

			const { ticket } = result;

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# ⚠️ Delete Ticket\nAre you sure you want to **permanently delete** ticket \`#${ticket.ticketId}\`?\nThis action cannot be undone.`))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`ticket_confirm_delete_${ticket.channelId}`)
					.setLabel('Delete Permanently')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('🗑️'),
				new ButtonBuilder()
					.setCustomId('ticket_cancel_close')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary)
			);
			container.addActionRowComponents(row);

			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (subcommand === 'list') {
			if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels permission.`);
			}

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			const tickets = guildData?.tickets || [];

			const openTickets = tickets.filter(t => !t.closed).slice(0, 10);
			const closedTickets = tickets.filter(t => t.closed).slice(0, 10);

			let text = `# Ticket Overview\n`;
			text += `**Open Tickets:** ${tickets.filter(t => !t.closed).length}\n`;
			text += `**Closed Tickets:** ${tickets.filter(t => t.closed).length}\n`;
			text += `**Total:** ${tickets.length}\n\n`;

			if (openTickets.length > 0) {
				text += `### Open Tickets\n`;
				for (const t of openTickets) {
					const paddedId = t.ticketId.toString().padStart(4, '0');
					text += `• \`#${paddedId}\` - <@${t.userId}> - <#${t.channelId}>\n`;
				}
			}

			if (closedTickets.length > 0) {
				text += `\n### Recently Closed\n`;
				for (const t of closedTickets.slice(0, 5)) {
					const paddedId = t.ticketId.toString().padStart(4, '0');
					text += `• \`#${paddedId}\` - <@${t.userId}>\n`;
				}
			}

			text += `\n*Use \`.ticket <cmd> <ticketID>\` to manage any ticket*`;

			return sendReply(message, text);
		}

		if (subcommand === 'stats' || subcommand === 'statistics') {
			if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels permission.`);
			}

			const targetUser = message.mentions.users.first() || (args[1] && !args[1].startsWith('<') ? await client.users.fetch(args[1]).catch(() => null) : null);

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			const tickets = guildData?.tickets || [];

			if (targetUser) {

				const userTickets = tickets.filter(t => t.claimedBy === targetUser.id);
				const userCreated = tickets.filter(t => t.userId === targetUser.id);
				const avgRating = userTickets.filter(t => t.rating).reduce((sum, t) => sum + t.rating, 0) / (userTickets.filter(t => t.rating).length || 1);

				const text = `# Stats for ${targetUser.tag}
### As Ticket Creator
**Tickets Opened:** ${userCreated.length}
**Open:** ${userCreated.filter(t => !t.closed).length}
**Closed:** ${userCreated.filter(t => t.closed).length}

### As Support Staff
**Tickets Claimed:** ${userTickets.length}
**Avg Rating:** ${userTickets.filter(t => t.rating).length > 0 ? `${'⭐'.repeat(Math.round(avgRating))} (${avgRating.toFixed(1)})` : 'No ratings yet'}`;
				return sendReply(message, text);
			}

			const totalTickets = tickets.length;
			const openCount = tickets.filter(t => !t.closed).length;
			const closedCount = tickets.filter(t => t.closed).length;
			const claimedCount = tickets.filter(t => t.claimedBy).length;

			const closedWithTime = tickets.filter(t => t.closed && t.closedAt && t.createdAt);
			let avgCloseTime = 'N/A';
			if (closedWithTime.length > 0) {
				const totalTime = closedWithTime.reduce((sum, t) => sum + (t.closedAt - t.createdAt), 0);
				const avgMs = totalTime / closedWithTime.length;
				const avgMinutes = Math.floor(avgMs / (1000 * 60));
				if (avgMinutes < 60) avgCloseTime = `${avgMinutes} min`;
				else if (avgMinutes < 1440) avgCloseTime = `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`;
				else avgCloseTime = `${Math.floor(avgMinutes / 1440)} days`;
			}

			const ratedTickets = tickets.filter(t => t.rating);
			const avgRating = ratedTickets.length > 0 ?
				(ratedTickets.reduce((sum, t) => sum + t.rating, 0) / ratedTickets.length).toFixed(1) : 'N/A';

			const staffStats = {};
			for (const t of tickets.filter(t => t.claimedBy)) {
				staffStats[t.claimedBy] = (staffStats[t.claimedBy] || 0) + 1;
			}
			const topStaff = Object.entries(staffStats)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([id, count]) => `<@${id}>: ${count} tickets`)
				.join('\n') || 'No claimed tickets yet';

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const todayTimestamp = today.getTime();
			const todayCreated = tickets.filter(t => t.createdAt >= todayTimestamp).length;
			const todayClosed = tickets.filter(t => t.closedAt && t.closedAt >= todayTimestamp).length;

			const priorityStats = {
				high: tickets.filter(t => t.priority === 'high' && !t.closed).length,
				medium: tickets.filter(t => t.priority === 'medium' && !t.closed).length,
				low: tickets.filter(t => t.priority === 'low' && !t.closed).length
			};

			const text = `# Ticket Statistics

### Overview
**Total Tickets:** ${totalTickets}
**Open:** ${openCount} | **Closed:** ${closedCount}
**Claimed:** ${claimedCount}
**Avg. Resolution Time:** ${avgCloseTime}
**Avg. Rating:** ${avgRating !== 'N/A' ? `${'⭐'.repeat(Math.round(parseFloat(avgRating)))} (${avgRating})` : 'No ratings yet'}

### By Priority
🔴 High: ${priorityStats.high} | 🟡 Medium: ${priorityStats.medium} | 🟢 Low: ${priorityStats.low}

### Today
**Created:** ${todayCreated} | **Closed:** ${todayClosed}

### Top Support Staff
${topStaff}

*Use \`.ticket stats @user\` for individual stats*`;

			return sendReply(message, text);
		}

		if (subcommand === 'priority') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to change priority.`);
			}
			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;
			const priorityArg = ticketIdArg ? args[2]?.toLowerCase() : args[1]?.toLowerCase();

			if (!priorityArg || !['high', 'medium', 'low', 'none'].includes(priorityArg)) {
				return sendReply(message, `${EMOJIS.error} Please specify a priority: \`high\`, \`medium\`, \`low\`, or \`none\`.\n**Usage:** \`.ticket priority [ticketID] <high/medium/low/none>\``);
			}

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket.`);
			}

			const { ticket, ticketIdx, guildData, channel } = result;

			guildData.tickets[ticketIdx].priority = priorityArg === 'none' ? null : (priorityArg === 'med' ? 'medium' : priorityArg);
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

			const priorityEmoji = { high: '🔴', med: '🟡', medium: '🟡', low: '🟢', none: '⚪' };
			const emoji = priorityEmoji[priorityArg];

			if (channel && priorityArg !== 'none') {

				const baseName = channel.name.replace(/^[🔴🟡🟢]-/, '');
				await channel.setName(`${emoji}-${baseName}`).catch(() => {});
			} else if (channel && priorityArg === 'none') {

				const baseName = channel.name.replace(/^[🔴🟡🟢]-/, '');
				await channel.setName(baseName).catch(() => {});
			}

			const priorityText = priorityArg === 'none' ? 'cleared' : `set to **${priorityArg}**`;

			if (channel && channel.id !== message.channel.id) {
				const notifyContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`${emoji} Priority ${priorityText} by <@${message.author.id}>`));
				await channel.send({ components: [notifyContainer], flags: MessageFlags.IsComponentsV2 });
			}

			return sendReply(message, `${EMOJIS.success} Ticket \`#${ticket.ticketId}\` priority ${priorityText}.`);
		}

		if (subcommand === 'transfer') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to transfer tickets.`);
			}
			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;
			const targetUserArg = ticketIdArg ? args[2] : args[1];

			let targetUser = message.mentions.users.first();
			if (!targetUser && targetUserArg) {
				const cleanId = targetUserArg.replace(/[<@!>]/g, '');
				targetUser = await client.users.fetch(cleanId).catch(() => null);
			}

			if (!targetUser) {
				return sendReply(message, `${EMOJIS.error} Please mention a user or provide a user ID.\n**Usage:** \`.ticket transfer [ticketID] <@user/userID>\``);
			}

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket.`);
			}

			const { ticket, ticketIdx, guildData, channel } = result;

			if (!ticket.claimedBy) {
				return sendReply(message, `${EMOJIS.error} This ticket is not claimed. Use \`.ticket claim\` first.`);
			}

			if (ticket.claimedBy !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} Only the current claimer or staff with Manage Channels can transfer.`);
			}

			guildData.tickets[ticketIdx].claimedBy = targetUser.id;
			guildData.tickets[ticketIdx].transferredAt = Date.now();
			guildData.tickets[ticketIdx].transferredBy = message.author.id;
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# Ticket Transferred\n<@${message.author.id}> transferred this ticket to <@${targetUser.id}>.`));

			if (channel && channel.id !== message.channel.id) {
				await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		if (subcommand === 'unclaim') {
			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket.`);
			}

			const { ticket, ticketIdx, guildData, channel } = result;

			if (!isStaff && ticket.claimedBy !== message.author.id) {
				return sendReply(message, `${EMOJIS.error} You need ticket staff permissions or be the current claimer to unclaim.`);
			}

			if (!ticket.claimedBy) {
				return sendReply(message, `${EMOJIS.error} This ticket is not claimed.`);
			}

			if (ticket.claimedBy !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} Only the current claimer or staff with Manage Channels can unclaim.`);
			}

			guildData.tickets[ticketIdx].claimedBy = null;
			guildData.tickets[ticketIdx].claimedAt = null;
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(`# Ticket Unclaimed\n<@${message.author.id}> has released this ticket.`))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			if (channel && channel.id !== message.channel.id) {
				await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		if (subcommand === 'closerequest' || subcommand === 'cr') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to request close.`);
			}
			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;
			const reasonArgs = ticketIdArg ? args.slice(2) : args.slice(1);
			const reason = reasonArgs.join(' ') || 'Staff has requested to close this ticket.';

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket.`);
			}

			const { ticket, channel } = result;

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(
					`# Close Request\n<@${ticket.userId}>, staff has requested to close this ticket.\n\n**Requested by:** <@${message.author.id}>\n**Reason:** ${reason}`
				))
				.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`ticket_closerequest_approve_${ticket.channelId}`)
					.setLabel('Close Ticket')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('✅'),
				new ButtonBuilder()
					.setCustomId(`ticket_closerequest_deny_${ticket.channelId}`)
					.setLabel('Keep Open')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('❌')
			);
			container.addActionRowComponents(row);

			if (channel && channel.id !== message.channel.id) {
				await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
				return sendReply(message, `${EMOJIS.success} Close request sent to ticket \`#${ticket.ticketId}\`.`);
			}

			return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
		}

		if (subcommand === 'blacklist' || subcommand === 'bl') {
			if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels permission.`);
			}

			const action = args[1]?.toLowerCase();

			if (!action || action === 'list') {

				const guildData = await client.db.findOne({ guildId: message.guild.id });
				const blacklist = guildData?.ticketBlacklist || [];

				if (blacklist.length === 0) {
					return sendReply(message, `# Ticket Blacklist\nNo users or roles are blacklisted.`);
				}

				const userList = blacklist.filter(b => b.type === 'user').map(b => `• <@${b.id}> (by <@${b.addedBy}>)`);
				const roleList = blacklist.filter(b => b.type === 'role').map(b => `• <@&${b.id}> (by <@${b.addedBy}>)`);

				let text = `# Ticket Blacklist\n`;
				if (userList.length > 0) text += `### Users\n${userList.join('\n')}\n`;
				if (roleList.length > 0) text += `### Roles\n${roleList.join('\n')}\n`;
				text += `\n*Use \`.ticket blacklist add/remove @user/@role\`*`;

				return sendReply(message, text);
			}

			if (action === 'add') {
				const target = message.mentions.users.first() || message.mentions.roles.first();
				if (!target) {
					return sendReply(message, `${EMOJIS.error} Please mention a user or role.\n**Usage:** \`.ticket blacklist add <@user/@role>\``);
				}

				const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
				guildData.ticketBlacklist = guildData.ticketBlacklist || [];

				const type = message.mentions.users.first() ? 'user' : 'role';
				const existing = guildData.ticketBlacklist.find(b => b.id === target.id);

				if (existing) {
					return sendReply(message, `${EMOJIS.error} ${type === 'user' ? 'User' : 'Role'} is already blacklisted.`);
				}

				guildData.ticketBlacklist.push({
					id: target.id,
					type,
					addedBy: message.author.id,
					addedAt: Date.now()
				});

				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketBlacklist: guildData.ticketBlacklist } }, { upsert: true });
				return sendReply(message, `${EMOJIS.success} ${type === 'user' ? `<@${target.id}>` : `<@&${target.id}>`} has been blacklisted from tickets.`);
			}

			if (action === 'remove') {
				const target = message.mentions.users.first() || message.mentions.roles.first();
				if (!target) {
					return sendReply(message, `${EMOJIS.error} Please mention a user or role.\n**Usage:** \`.ticket blacklist remove <@user/@role>\``);
				}

				const guildData = await client.db.findOne({ guildId: message.guild.id });
				if (!guildData?.ticketBlacklist?.length) {
					return sendReply(message, `${EMOJIS.error} Blacklist is empty.`);
				}

				const idx = guildData.ticketBlacklist.findIndex(b => b.id === target.id);
				if (idx === -1) {
					return sendReply(message, `${EMOJIS.error} Not found in blacklist.`);
				}

				guildData.ticketBlacklist.splice(idx, 1);
				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketBlacklist: guildData.ticketBlacklist } });
				return sendReply(message, `${EMOJIS.success} Removed from ticket blacklist.`);
			}

			return sendReply(message, `${EMOJIS.error} Invalid action. Use \`list\`, \`add\`, or \`remove\`.`);
		}

		if (subcommand === 'tag' || subcommand === 'tags' || subcommand === 't') {
			const action = args[1]?.toLowerCase();
			const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
			guildData.ticketTags = guildData.ticketTags || [];

			if (!action || action === 'list') {
				if (guildData.ticketTags.length === 0) {
					return sendReply(message, `# Ticket Tags\nNo tags created yet.\n\n*Use \`.ticket tag add <name> <content>\` to create one.*`);
				}

				const tagList = guildData.ticketTags.map(t => `• \`${t.name}\` - ${t.content.slice(0, 50)}${t.content.length > 50 ? '...' : ''}`).join('\n');
				return sendReply(message, `# Ticket Tags\n${tagList}\n\n*Use \`.ticket tag <name>\` to send a tag*`);
			}

			if (action === 'add' || action === 'create') {
				if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
					return sendReply(message, `${EMOJIS.error} You need Manage Channels permission to create tags.`);
				}

				const tagName = args[2]?.toLowerCase();
				const tagContent = args.slice(3).join(' ');

				if (!tagName || !tagContent) {
					return sendReply(message, `${EMOJIS.error} Please provide tag name and content.\n**Usage:** \`.ticket tag add <name> <content>\``);
				}

				if (guildData.ticketTags.find(t => t.name === tagName)) {
					return sendReply(message, `${EMOJIS.error} Tag \`${tagName}\` already exists.`);
				}

				guildData.ticketTags.push({
					name: tagName,
					content: tagContent,
					createdBy: message.author.id,
					createdAt: Date.now()
				});

				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketTags: guildData.ticketTags } }, { upsert: true });
				return sendReply(message, `${EMOJIS.success} Tag \`${tagName}\` created!`);
			}

			if (action === 'delete' || action === 'remove') {
				if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
					return sendReply(message, `${EMOJIS.error} You need Manage Channels permission to delete tags.`);
				}

				const tagName = args[2]?.toLowerCase();
				if (!tagName) {
					return sendReply(message, `${EMOJIS.error} Please provide tag name.\n**Usage:** \`.ticket tag delete <name>\``);
				}

				const idx = guildData.ticketTags.findIndex(t => t.name === tagName);
				if (idx === -1) {
					return sendReply(message, `${EMOJIS.error} Tag \`${tagName}\` not found.`);
				}

				guildData.ticketTags.splice(idx, 1);
				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketTags: guildData.ticketTags } });
				return sendReply(message, `${EMOJIS.success} Tag \`${tagName}\` deleted.`);
			}

			const tag = guildData.ticketTags.find(t => t.name === action);
			if (tag) {
				const container = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(tag.content));
				return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			return sendReply(message, `${EMOJIS.error} Tag \`${action}\` not found. Use \`.ticket tag list\` to see all tags.`);
		}

		if (subcommand === 'notes' || subcommand === 'note') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need Manage Channels or be ticket support staff to create notes threads.`);
			}
			const ticketIdArg = args[1] && parseTicketId(args[1]) !== null ? args[1] : null;

			const result = await findTicket(client, message.guild, message.channel.id, ticketIdArg, true);
			if (!result) {
				if (ticketIdArg) {
					return sendReply(message, `${EMOJIS.error} Ticket \`#${parseTicketId(ticketIdArg)}\` not found or is closed.`);
				}
				return sendReply(message, `${EMOJIS.error} This is not an open ticket.`);
			}

			const { ticket, ticketIdx, guildData, channel } = result;

			if (ticket.notesThreadId) {
				const existingThread = await channel.threads.fetch(ticket.notesThreadId).catch(() => null);
				if (existingThread) {
					return sendReply(message, `${EMOJIS.error} Notes thread already exists: ${existingThread}`);
				}
			}

			try {
				const thread = await channel.threads.create({
					name: `📝-staff-notes-${ticket.ticketId}`,
					type: ChannelType.PrivateThread,
					reason: `Staff notes for ticket #${ticket.ticketId}`
				});

				guildData.tickets[ticketIdx].notesThreadId = thread.id;
				await client.db.updateOne({ guildId: message.guild.id }, { $set: { tickets: guildData.tickets } });

				const container = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(
						`# 📝 Staff Notes\nThis is a private thread for staff discussion about ticket \`#${ticket.ticketId}\`.\n\n` +
						`**Ticket User:** <@${ticket.userId}>\n**Created:** <t:${Math.floor(ticket.createdAt / 1000)}:R>`
					));
				await thread.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

				return sendReply(message, `${EMOJIS.success} Staff notes thread created: ${thread}`);
			} catch (err) {
				return sendReply(message, `${EMOJIS.error} Failed to create notes thread. Make sure the bot has permission to create private threads.`);
			}
		}

		if (subcommand === 'addstaff' || subcommand === 'addsupport') {
			if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
				return sendReply(message, `${EMOJIS.error} You need Administrator permissions.`);
			}

			const target = message.mentions.roles.first() || message.mentions.users.first();
			if (!target) {
				return sendReply(message, `${EMOJIS.error} Please mention a role or user.\n**Usage:** \`.ticket addstaff <@role/@user>\``);
			}

			const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
			guildData.ticketStaff = guildData.ticketStaff || [];

			const type = message.mentions.roles.first() ? 'role' : 'user';
			if (guildData.ticketStaff.find(s => s.id === target.id)) {
				return sendReply(message, `${EMOJIS.error} ${type === 'role' ? `**${target.name}**` : `<@${target.id}>`} is already added as support staff.`);
			}

			guildData.ticketStaff.push({ id: target.id, type, addedBy: message.author.id, addedAt: Date.now() });
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketStaff: guildData.ticketStaff } }, { upsert: true });

			return sendReply(message, `${EMOJIS.success} ${type === 'role' ? `**${target.name}**` : `<@${target.id}>`} added as support staff.`);
		}

		if (subcommand === 'removestaff' || subcommand === 'removesupport') {
			if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
				return sendReply(message, `${EMOJIS.error} You need Administrator permissions.`);
			}

			const target = message.mentions.roles.first() || message.mentions.users.first();
			if (!target) {
				return sendReply(message, `${EMOJIS.error} Please mention a role or user.\n**Usage:** \`.ticket removestaff <@role/@user>\``);
			}

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			if (!guildData?.ticketStaff?.length) {
				return sendReply(message, `${EMOJIS.error} No support staff configured.`);
			}

			const idx = guildData.ticketStaff.findIndex(s => s.id === target.id);
			if (idx === -1) {
				return sendReply(message, `${EMOJIS.error} Not found in support staff.`);
			}

			guildData.ticketStaff.splice(idx, 1);
			await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketStaff: guildData.ticketStaff } });

			return sendReply(message, `${EMOJIS.success} Removed from support staff.`);
		}

		if (subcommand === 'viewstaff' || subcommand === 'staff') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need ticket staff permissions to view staff lists.`);
			}
			const guildData = await client.db.findOne({ guildId: message.guild.id });
			const staff = guildData?.ticketStaff || [];
			const panels = guildData?.ticketPanels || [];

			let text = `# Support Staff\n`;

			if (panels.length > 0) {
				text += `### Panel Support Roles\n`;
				for (const panel of panels) {
					if (panel.config?.supportRole) {
						text += `• <@&${panel.config.supportRole}>\n`;
					}
				}
			}

			if (staff.length > 0) {
				const roles = staff.filter(s => s.type === 'role').map(s => `<@&${s.id}>`);
				const users = staff.filter(s => s.type === 'user').map(s => `<@${s.id}>`);

				if (roles.length > 0) text += `### Additional Roles\n${roles.join(', ')}\n`;
				if (users.length > 0) text += `### Individual Staff\n${users.join(', ')}\n`;
			}

			if (panels.length === 0 && staff.length === 0) {
				text += `No support staff configured.\n\n*Use \`.ticket addstaff @role\` to add support staff.*`;
			}

			return sendReply(message, text);
		}

		if (subcommand === 'oncall' || subcommand === 'on-call') {
			if (!isStaff) {
				return sendReply(message, `${EMOJIS.error} You need ticket staff permissions to toggle on-call.`);
			}
			const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
			guildData.ticketOnCall = guildData.ticketOnCall || [];

			const idx = guildData.ticketOnCall.indexOf(message.author.id);

			if (idx === -1) {

				guildData.ticketOnCall.push(message.author.id);
				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketOnCall: guildData.ticketOnCall } }, { upsert: true });
				return sendReply(message, `${EMOJIS.success} You are now **on-call**. You will be pinged for new tickets.`);
			} else {

				guildData.ticketOnCall.splice(idx, 1);
				await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketOnCall: guildData.ticketOnCall } });
				return sendReply(message, `${EMOJIS.success} You are no longer on-call.`);
			}
		}

		if (subcommand === 'config' || subcommand === 'settings') {
			if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
				return sendReply(message, `${EMOJIS.error} You need Administrator permissions.`);
			}

			const setting = args[1]?.toLowerCase();
			const value = args.slice(2).join(' ');

			const guildData = await client.db.findOne({ guildId: message.guild.id });
			if (!guildData?.ticketPanels?.length) {
				return sendReply(message, `${EMOJIS.error} No ticket panels configured. Run \`.ticket setup\` first.`);
			}

			if (!setting) {
				const config = guildData.ticketPanels[0].config;
				const inactivityText = config.inactivityClose > 0 ? `${config.inactivityClose} hours` : 'Disabled';
				const onCallList = guildData.ticketOnCall?.length > 0 ?
					guildData.ticketOnCall.map(id => `<@${id}>`).join(', ') : 'None';

				const text = `# Ticket Configuration

### Channels & Roles
**Support Role:** ${config.supportRole ? `<@&${config.supportRole}>` : 'Not set'}
**Log Channel:** ${config.loggingChannel ? `<#${config.loggingChannel}>` : 'Not set'}
**Category:** ${config.category ? `<#${config.category}>` : 'Not set'}

### General
**Max Tickets Per User:** ${config.maxTicketsPerUser || 1}
**Inactivity Auto-Close:** ${inactivityText}
**Auto-Close on Leave:** ${config.autoCloseOnLeave ? 'Enabled' : 'Disabled'}

### Notifications
**DM on Create:** ${config.dmOnCreate ? 'Enabled' : 'Disabled'}
**DM on Close:** ${config.dmOnClose ? 'Enabled' : 'Disabled'}
**Ping On-Call Staff:** ${config.pingOnCall === true ? 'Enabled' : 'Disabled'}

### Features
**Auto Transcript on Close:** ${config.transcriptOnClose !== false ? 'Enabled' : 'Disabled'}
**User Feedback/Rating:** ${config.feedbackEnabled ? 'Enabled' : 'Disabled'}

### Staff On-Call
${onCallList}

### Usage
\`.ticket config supportrole @role|remove\` - Set/remove support role
\`.ticket config logchannel #channel|remove\` - Set/remove log channel
\`.ticket config category #category\` - Set ticket category
\`.ticket config maxtickets <1-10>\` - Max open tickets
\`.ticket config dmcreate <on/off>\` - DM on ticket create
\`.ticket config dmclose <on/off>\` - DM on ticket close
\`.ticket config autotranscript <on/off>\` - Auto transcript
\`.ticket config autocloseleave <on/off>\` - Close on leave
\`.ticket config inactivity <hours|off>\` - Auto-close inactive
\`.ticket config feedback <on/off>\` - Star ratings
\`.ticket config pingoncall <on/off>\` - Ping on-call staff`;

				return sendReply(message, text);
			}

			const validOn = ['on', 'true', 'yes', 'enable', 'enabled', '1'];
			const validOff = ['off', 'false', 'no', 'disable', 'disabled', '0'];
			const isValidToggle = (v) => validOn.includes(v) || validOff.includes(v);
			const isOn = (v) => validOn.includes(v);

			const applyToAllPanels = (key, val) => {
				for (const panel of guildData.ticketPanels) {
					panel.config[key] = val;
				}
			};

			let newValue;

			if (setting === 'supportrole' || setting === 'role') {
				const removeKeywords = ['remove', 'disable', 'none', 'off', 'delete'];
				if (removeKeywords.includes(value?.toLowerCase())) {
					const currentRole = guildData.ticketPanels[0]?.config?.supportRole;
					if (!currentRole) {
						return sendReply(message, `${EMOJIS.error} Support role is already not set.`);
					}
					applyToAllPanels('supportRole', null);
					newValue = 'removed';
				} else {
					const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
					if (!role) {
						return sendReply(message, `${EMOJIS.error} Please mention a role or use \`remove\` to disable.\n**Usage:** \`.ticket config supportrole @role\` or \`.ticket config supportrole remove\``);
					}
					const currentRole = guildData.ticketPanels[0]?.config?.supportRole;
					if (currentRole === role.id) {
						return sendReply(message, `${EMOJIS.error} Support role is already set to ${role}.`);
					}
					applyToAllPanels('supportRole', role.id);
					newValue = role.name;
				}
			} else if (setting === 'logchannel' || setting === 'loggingchannel' || setting === 'logs') {
				const removeKeywords = ['remove', 'disable', 'none', 'off', 'delete'];
				if (removeKeywords.includes(value?.toLowerCase())) {
					const currentChannel = guildData.ticketPanels[0]?.config?.loggingChannel;
					if (!currentChannel) {
						return sendReply(message, `${EMOJIS.error} Log channel is already not set.`);
					}
					applyToAllPanels('loggingChannel', null);
					newValue = 'removed';
				} else {
					const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
					if (!channel) {
						return sendReply(message, `${EMOJIS.error} Please mention a channel or use \`remove\` to disable.\n**Usage:** \`.ticket config logchannel #channel\` or \`.ticket config logchannel remove\``);
					}
					const currentChannel = guildData.ticketPanels[0]?.config?.loggingChannel;
					if (currentChannel === channel.id) {
						return sendReply(message, `${EMOJIS.error} Log channel is already set to ${channel}.`);
					}
					applyToAllPanels('loggingChannel', channel.id);
					newValue = channel.name;
				}
			} else if (setting === 'category') {
				const cat = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
				if (!cat || cat.type !== ChannelType.GuildCategory) {
					return sendReply(message, `${EMOJIS.error} Please provide a category ID.\n**Usage:** \`.ticket config category <categoryID>\``);
				}
				const currentCategory = guildData.ticketPanels[0]?.config?.category;
				if (currentCategory === cat.id) {
					return sendReply(message, `${EMOJIS.error} Category is already set to ${cat}.`);
				}
				applyToAllPanels('category', cat.id);
				newValue = cat.name;
			} else if (setting === 'maxtickets' || setting === 'limit') {
				const num = parseInt(value);
				if (isNaN(num) || num < 1 || num > 10) {
					return sendReply(message, `${EMOJIS.error} Please provide a number between 1-10.`);
				}
				const currentMax = guildData.ticketPanels[0]?.config?.maxTicketsPerUser;
				if (currentMax === num) {
					return sendReply(message, `${EMOJIS.error} Max tickets per user is already set to ${num}.`);
				}
				applyToAllPanels('maxTicketsPerUser', num);
				newValue = num;
			} else if (setting === 'dmcreate') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config dmcreate <on/off>\``);
				}
				const newVal = isOn(value);
				const currentVal = guildData.ticketPanels[0]?.config?.dmOnCreate;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} DM on Create is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('dmOnCreate', newVal);
				newValue = newVal ? 'on' : 'off';
			} else if (setting === 'dmclose') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config dmclose <on/off>\``);
				}
				const newVal = isOn(value);

				const currentVal = guildData.ticketPanels[0]?.config?.dmOnClose;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} DM on Close is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('dmOnClose', newVal);
				newValue = newVal ? 'on' : 'off';
			} else if (setting === 'autotranscript') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config autotranscript <on/off>\``);
				}
				const newVal = isOn(value);
				const currentVal = guildData.ticketPanels[0]?.config?.transcriptOnClose;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} Auto Transcript is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('transcriptOnClose', newVal);
				newValue = newVal ? 'on' : 'off';
			} else if (setting === 'autocloseleave') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config autocloseleave <on/off>\``);
				}
				const newVal = isOn(value);
				const currentVal = guildData.ticketPanels[0]?.config?.autoCloseOnLeave;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} Auto Close on Leave is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('autoCloseOnLeave', newVal);
				newValue = newVal ? 'on' : 'off';
			} else if (setting === 'inactivity') {
				if (!value) {
					return sendReply(message, `${EMOJIS.error} Please provide hours (1-168) or \`off\`.\nUsage: \`.ticket config inactivity <hours|off>\``);
				}
				if (value === 'off' || value === '0' || value === 'disable' || value === 'disabled') {
					const currentVal = guildData.ticketPanels[0]?.config?.inactivityClose;
					if (currentVal === 0) {
						return sendReply(message, `${EMOJIS.error} Inactivity auto-close is already disabled.`);
					}
					applyToAllPanels('inactivityClose', 0);
					newValue = 'off';
				} else {
					const hours = parseInt(value);
					if (isNaN(hours) || hours < 1 || hours > 168) {
						return sendReply(message, `${EMOJIS.error} Please provide hours between 1-168 (1 week), or \`off\`.`);
					}
					const currentVal = guildData.ticketPanels[0]?.config?.inactivityClose;
					if (currentVal === hours) {
						return sendReply(message, `${EMOJIS.error} Inactivity auto-close is already set to ${hours} hours.`);
					}
					applyToAllPanels('inactivityClose', hours);
					newValue = `${hours} hours`;
				}
			} else if (setting === 'feedback' || setting === 'rating') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config feedback <on/off>\``);
				}
				const newVal = isOn(value);

				const currentVal = guildData.ticketPanels[0]?.config?.feedbackEnabled;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} Feedback/Rating is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('feedbackEnabled', newVal);
				newValue = newVal ? 'on' : 'off';
			} else if (setting === 'pingoncall') {
				if (!value || !isValidToggle(value)) {
					return sendReply(message, `${EMOJIS.error} Please specify \`on\` or \`off\`.\nUsage: \`.ticket config pingoncall <on/off>\``);
				}
				const newVal = isOn(value);

				const currentVal = guildData.ticketPanels[0]?.config?.pingOnCall;
				if (currentVal === newVal) {
					return sendReply(message, `${EMOJIS.error} Ping On-Call is already ${newVal ? 'enabled' : 'disabled'}.`);
				}
				applyToAllPanels('pingOnCall', newVal);
				newValue = newVal ? 'on' : 'off';
			} else {
				return sendReply(message, `${EMOJIS.error} Unknown setting: \`${setting}\`\n\nValid settings: \`supportrole\`, \`logchannel\`, \`category\`, \`maxtickets\`, \`dmcreate\`, \`dmclose\`, \`autotranscript\`, \`autocloseleave\`, \`inactivity\`, \`feedback\`, \`pingoncall\``);
			}

			await client.db.updateOne(
				{ guildId: message.guild.id },
				{ $set: { ticketPanels: guildData.ticketPanels } }
			);

			return sendReply(message, `${EMOJIS.success} Setting \`${setting}\` updated to \`${newValue}\` for all panels!`);
		}

		const helpText = `# Ticket System Commands

### Basic Commands
\`.ticket create [reason]\` - Create a new ticket
\`.new [reason]\` - Quick create ticket
\`.ticket close [ticketID]\` - Close ticket
\`.ticket reopen [ticketID]\` - Reopen closed ticket
\`.ticket transcript [ticketID]\` - Save transcript

### Ticket Management
\`.ticket add [ticketID] @user\` - Add user to ticket
\`.ticket remove [ticketID] @user\` - Remove user
\`.ticket rename [ticketID] <name>\` - Rename ticket
\`.ticket priority [ticketID] <high/med/low>\` - Set priority
\`.ticket notes [ticketID]\` - Create staff notes thread

### Claiming System
\`.ticket claim [ticketID]\` - Claim ticket
\`.ticket unclaim [ticketID]\` - Release ticket
\`.ticket transfer [ticketID] @user\` - Transfer to staff
\`.ticket closerequest [ticketID]\` - Ask user to close

### Tags (Quick Replies)
\`.ticket tag list\` - List all tags
\`.ticket tag add <name> <content>\` - Create tag
\`.ticket tag delete <name>\` - Delete tag
\`.ticket tag <name>\` - Send a tag

### Staff Management
\`.ticket addstaff @role/@user\` - Add support staff
\`.ticket removestaff @role/@user\` - Remove staff
\`.ticket viewstaff\` - List all staff
\`.ticket oncall\` - Toggle on-call status
\`.ticket blacklist [add/remove] @user\` - Manage blacklist

### Admin Commands
\`.ticket setup\` - Create ticket panel
\`.ticket config\` - View/edit settings
\`.ticket list\` - List all tickets
\`.ticket stats [@user]\` - View statistics
\`.ticket delete [ticketID]\` - Delete ticket

**Tip:** Ticket IDs: \`#0001\`, \`0001\`, or \`1\``;

		return sendReply(message, helpText);
	}
};
