// Add this after line 291 in ticket.js - after the setup command closes

// ─────────────────────────────────────────────────────────────────────────
// Subcommand: REMOVEPANEL (Remove ticket panel from channel)
// ─────────────────────────────────────────────────────────────────────────
if (subcommand === 'removepanel' || subcommand === 'deletepanel') {
	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		return sendReply(message, `${EMOJIS.error} You need Administrator permissions to remove ticket panels.`);
	}

	// Get channel from mention or ID
	const targetChannel = message.mentions.channels.first() || 
					  message.guild.channels.cache.get(args[1]) || 
					  message.channel;

	const guildData = await client.db.findOne({ guildId: message.guild.id });
	const panelIdx = guildData?.ticketPanels?.findIndex(p => p.channelId === targetChannel.id);
	
	if (panelIdx === -1 || panelIdx === undefined) {
		return sendReply(message, `${EMOJIS.error} No ticket panel found in ${targetChannel}.`);
	}

	const panel = guildData.ticketPanels[panelIdx];
	
	// Delete the panel message
	const panelChannel = await message.guild.channels.fetch(panel.channelId).catch(() => null);
	if (panelChannel) {
		const panelMsg = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
		if (panelMsg) {
			await panelMsg.delete().catch(() => {});
		}
	}

	// Remove from database
	guildData.ticketPanels.splice(panelIdx, 1);
	await client.db.updateOne({ guildId: message.guild.id }, { $set: { ticketPanels: guildData.ticketPanels } });

	return sendReply(message, `${EMOJIS.success} Ticket panel removed from ${targetChannel}.`);
}
