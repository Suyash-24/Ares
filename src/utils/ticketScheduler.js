import { ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { generateTranscript } from './ticketTranscript.js';

// Map to track scheduled inactivity closures
const inactivityTimers = new Map();

/**
 * Initialize the ticket inactivity scheduler for a guild
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID to check
 */
async function checkTicketInactivity(client, guildId) {
	try {
		const guildData = await client.db.findOne({ guildId });
		if (!guildData?.tickets?.length || !guildData?.ticketPanels?.length) return;

		const guild = await client.guilds.fetch(guildId).catch(() => null);
		if (!guild) return;

		const now = Date.now();

		for (const ticket of guildData.tickets) {
			if (ticket.closed) continue;

			// Get panel config
			const panel = guildData.ticketPanels.find(p => p.messageId === ticket.panelMessageId);
			if (!panel?.config?.inactivityClose || panel.config.inactivityClose <= 0) continue;

			const inactivityMs = panel.config.inactivityClose * 60 * 60 * 1000; // Convert hours to ms
			const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
			if (!channel) continue;

			// Get last message time
			const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
			if (!messages?.size) continue;

			const lastMessage = messages.first();
			const lastActivity = lastMessage?.createdTimestamp || ticket.createdAt;
			const timeSinceActivity = now - lastActivity;

			if (timeSinceActivity >= inactivityMs) {
				// Auto-close due to inactivity
				await autoCloseTicket(client, guildData, ticket, channel, 'INACTIVITY', panel);
			}
		}
	} catch (err) {
		console.error(`[Ticket Scheduler] Error checking inactivity for ${guildId}:`, err);
	}
}

/**
 * Auto-close a ticket
 */
async function autoCloseTicket(client, guildData, ticket, channel, reason, panel) {
	try {
		// Update ticket in DB
		const idx = guildData.tickets.findIndex(t => t.channelId === ticket.channelId);
		if (idx === -1) return;

		guildData.tickets[idx].closed = true;
		guildData.tickets[idx].closedAt = Date.now();
		guildData.tickets[idx].closedBy = `AUTO_${reason}`;

		// Rename channel
		const ticketUser = await client.users.fetch(ticket.userId).catch(() => null);
		const cleanUsername = ticketUser ? 
			ticketUser.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user' : 'user';
		await channel.setName(`closed-${cleanUsername}-${ticket.ticketId.toString().padStart(4, '0')}`).catch(() => {});

		// Generate transcript if configured
		let transcriptAttachment = null;
		if (panel?.config?.transcriptOnClose) {
			transcriptAttachment = await generateTranscript(channel, ticket, channel.guild);
		}

		// Build close message
		const container = new ContainerBuilder()
			.addTextDisplayComponents(td => td.setContent(`# 🔒 Ticket Auto-Closed\nThis ticket was automatically closed due to **${reason === 'INACTIVITY' ? 'inactivity' : 'user leaving'}**.`))
			.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
			new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
			new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
		);
		container.addActionRowComponents(row);

		const sendOptions = { components: [container], flags: MessageFlags.IsComponentsV2 };
		if (transcriptAttachment) {
			sendOptions.files = [transcriptAttachment];
		}
		await channel.send(sendOptions);

		// Log to logging channel
		if (panel?.config?.loggingChannel) {
			const logChannel = await channel.guild.channels.fetch(panel.config.loggingChannel).catch(() => null);
			if (logChannel) {
				const logContainer = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# 🔒 Ticket Auto-Closed`))
					.addTextDisplayComponents(td => td.setContent(
						`**Ticket:** #${ticket.ticketId}\n` +
						`**Channel:** ${channel}\n` +
						`**Opened By:** <@${ticket.userId}>\n` +
						`**Reason:** ${reason === 'INACTIVITY' ? 'Inactivity timeout' : 'User left server'}\n` +
						`**Closed At:** <t:${Math.floor(Date.now() / 1000)}:F>`
					));

				const logSendOptions = { components: [logContainer], flags: MessageFlags.IsComponentsV2 };
				if (transcriptAttachment) {
					logSendOptions.files = [transcriptAttachment];
				}
				await logChannel.send(logSendOptions).catch(() => {});
			}
		}

		// Update database
		await client.db.updateOne({ guildId: channel.guild.id }, { $set: { tickets: guildData.tickets } });

	} catch (err) {
		console.error('[Ticket Scheduler] Error auto-closing ticket:', err);
	}
}

/**
 * Start the inactivity checker for all guilds
 * @param {Client} client - Discord client
 */
function startInactivityScheduler(client) {
	// Run every 15 minutes
	setInterval(async () => {
		try {
			// Iterate through all guilds the bot is in
			for (const [guildId, guild] of client.guilds.cache) {
				await checkTicketInactivity(client, guildId);
			}
		} catch (err) {
			console.error('[Ticket Scheduler] Error in interval:', err);
		}
	}, 15 * 60 * 1000); // 15 minutes

	console.log('[Ticket Scheduler] Inactivity checker started (runs every 15 minutes)');
}

/**
 * Schedule a warning message before auto-close
 * @param {Client} client - Discord client
 * @param {string} channelId - Ticket channel ID
 * @param {number} closeInMs - Time until close in ms
 */
function scheduleInactivityWarning(client, channelId, closeInMs) {
	// Clear existing timer
	if (inactivityTimers.has(channelId)) {
		clearTimeout(inactivityTimers.get(channelId));
	}

	// Schedule warning 1 hour before close (or half the time if less than 2 hours)
	const warningTime = closeInMs > 2 * 60 * 60 * 1000 ? closeInMs - (60 * 60 * 1000) : closeInMs / 2;

	const timer = setTimeout(async () => {
		try {
			const channel = await client.channels.fetch(channelId).catch(() => null);
			if (!channel) return;

			const container = new ContainerBuilder()
				.addTextDisplayComponents(td => td.setContent(
					`# ⚠️ Inactivity Warning\nThis ticket will be automatically closed due to inactivity if there's no response soon.`
				));

			await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
		} catch (err) {
			// Ignore
		}
	}, warningTime);

	inactivityTimers.set(channelId, timer);
}

/**
 * Clear inactivity timer for a ticket
 * @param {string} channelId - Ticket channel ID
 */
function clearInactivityTimer(channelId) {
	if (inactivityTimers.has(channelId)) {
		clearTimeout(inactivityTimers.get(channelId));
		inactivityTimers.delete(channelId);
	}
}

export {
	checkTicketInactivity,
	startInactivityScheduler,
	scheduleInactivityWarning,
	clearInactivityTimer
};