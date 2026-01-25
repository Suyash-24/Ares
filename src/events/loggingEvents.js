

import { Events, AuditLogEvent, ChannelType } from 'discord.js';
import {
	sendLog,
	fetchAuditLogExecutor,
	formatDuration,
	getChannelTypeString,
	formatPermissionChanges,
	LOG_EVENTS
} from '../utils/LoggingManager.js';

const aresDeletedMessages = new Map();

export const commandInvokers = new Map();

export function markCommandInvoker(guildId, actionType, targetId, invoker) {
	const key = `${guildId}:${actionType}:${targetId}`;
	commandInvokers.set(key, {
		invoker: { tag: invoker.tag, id: invoker.id },
		timestamp: Date.now()
	});

	setTimeout(() => commandInvokers.delete(key), 10000);
}

export function getCommandInvoker(guildId, actionType, targetId) {
	const key = `${guildId}:${actionType}:${targetId}`;
	const data = commandInvokers.get(key);
	if (!data) return null;

	return Date.now() - data.timestamp < 10000 ? data.invoker : null;
}

export function markMessageAsAresDeleted(messageId) {
	aresDeletedMessages.set(messageId, Date.now());

	setTimeout(() => aresDeletedMessages.delete(messageId), 10000);
}

function wasDeletedByAres(messageId) {
	const timestamp = aresDeletedMessages.get(messageId);
	if (!timestamp) return false;

	return Date.now() - timestamp < 10000;
}

export function registerLoggingEvents(client) {
	console.log('ðŸ“‹ [Logging] Registering event handlers...');

	registerMessageEvents(client);

	registerMemberEvents(client);

	registerChannelEvents(client);

	registerRoleEvents(client);

	registerEmojiEvents(client);

	registerServerEvents(client);

	registerVoiceEvents(client);

	registerInviteEvents(client);

	registerAuditLogEvents(client);

	console.log('âœ… [Logging] All event handlers registered');
}

function registerMessageEvents(client) {

	client.on(Events.MessageDelete, async (message) => {
		if (!message.guild) return;
		if (message.partial) return;

		const deletedByAres = wasDeletedByAres(message.id);

		let resolvedExecutor;

		if (deletedByAres) {

			resolvedExecutor = { tag: `${client.user.tag}`, id: client.user.id };
		} else {

			const executor = await fetchAuditLogExecutor(
				message.guild,
				AuditLogEvent.MessageDelete,
				message.author?.id
			);

			if (executor) {
				resolvedExecutor = executor;
			} else {

				resolvedExecutor = message.author || { tag: 'Unknown', id: 'Unknown' };
			}
		}

		let contentDescription = '';

		if (message.content && message.content.trim()) {
			contentDescription = message.content;
		}

		if (message.embeds && message.embeds.length > 0) {
			const embedInfo = message.embeds.map(e => {
				const parts = [];
				if (e.title) parts.push(`Title: ${e.title}`);
				if (e.description) parts.push(`Description: ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}`);
				if (e.url) parts.push(`URL: ${e.url}`);
				return parts.length > 0 ? parts.join(' | ') : 'Embed';
			}).join('\n');
			contentDescription += (contentDescription ? '\n\n' : '') + `ðŸ“¦ **Embeds (${message.embeds.length}):**\n${embedInfo}`;
		}

		if (message.components && message.components.length > 0) {
			const componentCount = message.components.reduce((acc, row) => acc + (row.components?.length || 0), 0);
			contentDescription += (contentDescription ? '\n\n' : '') + `ðŸ”˜ **Components:** ${componentCount} button(s)/select menu(s)`;
		}

		if (message.stickers && message.stickers.size > 0) {
			const stickerNames = message.stickers.map(s => s.name).join(', ');
			contentDescription += (contentDescription ? '\n\n' : '') + `ðŸŽ¨ **Stickers:** ${stickerNames}`;
		}

		if (!contentDescription) {
			contentDescription = '*Empty message*';
		}

		const attachmentsList = message.attachments?.map(a => ({
			name: a.name,
			url: a.url,
			contentType: a.contentType,
			size: a.size
		})) || [];

		const imageAttachment = attachmentsList.find(a =>
			a.contentType?.startsWith('image/') ||
			/\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || a.url)
		);

		await sendLog(client, message.guild.id, LOG_EVENTS.MESSAGE_DELETE, {
			executor: resolvedExecutor,
			target: message.author,
			channel: message.channel,
			content: contentDescription,
			attachments: attachmentsList,
			image: imageAttachment?.url,
			messageId: message.id,
			userId: message.author?.id,
			channelId: message.channel.id,
			thumbnail: message.author?.displayAvatarURL()
		});
	});

	client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
		if (!newMessage.guild) return;
		if (newMessage.author?.bot) return;
		if (oldMessage.partial || newMessage.partial) return;
		if (oldMessage.content === newMessage.content) return;

		await sendLog(client, newMessage.guild.id, LOG_EVENTS.MESSAGE_EDIT, {
			target: newMessage.author,
			channel: newMessage.channel,
			before: oldMessage.content || '*No content*',
			after: newMessage.content || '*No content*',
			messageId: newMessage.id,
			userId: newMessage.author?.id,
			channelId: newMessage.channel.id,
			thumbnail: newMessage.author?.displayAvatarURL()
		});
	});

	client.on(Events.MessageBulkDelete, async (messages, channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.MessageBulkDelete,
			channel.id
		);

		const sortedMessages = [...messages.values()].sort((a, b) =>
			a.createdTimestamp - b.createdTimestamp
		);

		const transcriptLines = [
			`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`,
			`â•‘                    BULK DELETE TRANSCRIPT                       â•‘`,
			`â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£`,
			`â•‘ Server: ${channel.guild.name}`,
			`â•‘ Channel: #${channel.name} (${channel.id})`,
			`â•‘ Messages Deleted: ${messages.size}`,
			`â•‘ Deleted By: ${executor?.tag || 'Unknown'} (${executor?.id || 'Unknown'})`,
			`â•‘ Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
			`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`,
			``,
			`${'â”€'.repeat(70)}`,
			``
		];

		for (const msg of sortedMessages) {
			const timestamp = new Date(msg.createdTimestamp).toLocaleString('en-US', {
				timeZone: 'UTC',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});

			const author = msg.author?.tag || 'Unknown User';
			const authorId = msg.author?.id || 'Unknown';

			transcriptLines.push(`â”Œâ”€ ${author} (${authorId})`);
			transcriptLines.push(`â”‚  Time: ${timestamp} UTC`);
			transcriptLines.push(`â”‚  Message ID: ${msg.id}`);

			if (msg.content && msg.content.trim()) {
				const contentLines = msg.content.split('\n');
				transcriptLines.push(`â”‚  Content:`);
				for (const line of contentLines) {
					transcriptLines.push(`â”‚    ${line}`);
				}
			} else {
				transcriptLines.push(`â”‚  Content: [No text content]`);
			}

			if (msg.embeds && msg.embeds.length > 0) {
				transcriptLines.push(`â”‚  Embeds: ${msg.embeds.length}`);
				for (const embed of msg.embeds) {
					if (embed.title) transcriptLines.push(`â”‚    - Title: ${embed.title}`);
					if (embed.description) transcriptLines.push(`â”‚    - Description: ${embed.description.substring(0, 100)}${embed.description.length > 100 ? '...' : ''}`);
					if (embed.url) transcriptLines.push(`â”‚    - URL: ${embed.url}`);
				}
			}

			if (msg.attachments && msg.attachments.size > 0) {
				transcriptLines.push(`â”‚  Attachments: ${msg.attachments.size}`);
				msg.attachments.forEach(att => {
					transcriptLines.push(`â”‚    - ${att.name}: ${att.url}`);
				});
			}

			if (msg.stickers && msg.stickers.size > 0) {
				transcriptLines.push(`â”‚  Stickers: ${[...msg.stickers.values()].map(s => s.name).join(', ')}`);
			}

			transcriptLines.push(`â””${'â”€'.repeat(69)}`);
			transcriptLines.push(``);
		}

		transcriptLines.push(`${'â•'.repeat(70)}`);
		transcriptLines.push(`End of transcript - ${messages.size} messages`);

		const transcriptContent = transcriptLines.join('\n');

		const transcriptBuffer = Buffer.from(transcriptContent, 'utf-8');
		const fileName = `bulk-delete-${channel.id}-${Date.now()}.txt`;

		const uniqueAuthors = new Set(sortedMessages.map(m => m.author?.id).filter(Boolean));

		await sendLog(client, channel.guild.id, LOG_EVENTS.BULK_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel,
			count: messages.size,
			content: `**${messages.size}** messages deleted from ${uniqueAuthors.size} user(s)`,
			channelId: channel.id,
			files: [{
				attachment: transcriptBuffer,
				name: fileName,
				description: `Transcript of ${messages.size} deleted messages`
			}],
			transcriptFileName: fileName
		});
	});

	client.on(Events.ChannelPinsUpdate, async (channel, time) => {
		if (!channel.guild) return;

		await sendLog(client, channel.guild.id, LOG_EVENTS.MESSAGE_PIN, {
			channel,
			content: `Pins updated in channel`,
			channelId: channel.id
		});
	});
}

function registerMemberEvents(client) {

	client.on(Events.GuildMemberAdd, async (member) => {
		const accountAge = Date.now() - member.user.createdTimestamp;
		const accountAgeStr = formatDuration(accountAge);

		if (member.user.bot) {

			const executor = await fetchAuditLogExecutor(
				member.guild,
				AuditLogEvent.BotAdd,
				member.id
			);

			await sendLog(client, member.guild.id, LOG_EVENTS.BOT_ADD, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: `Bot created ${accountAgeStr} ago`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		} else {

			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_JOIN, {
				target: member.user,
				content: `Account created ${accountAgeStr} ago`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});

	client.on(Events.GuildMemberRemove, async (member) => {

		await new Promise(resolve => setTimeout(resolve, 100));

		const kickInvoker = getCommandInvoker(member.guild.id, 'kick', member.id) ||
			getCommandInvoker(member.guild.id, 'masskick', member.id);

		const banInvoker = getCommandInvoker(member.guild.id, 'ban', member.id) ||
			getCommandInvoker(member.guild.id, 'massban', member.id) ||
			getCommandInvoker(member.guild.id, 'softban', member.id) ||
			getCommandInvoker(member.guild.id, 'tempban', member.id) ||
			getCommandInvoker(member.guild.id, 'raidwipe', member.id);

		if (kickInvoker || banInvoker) {

			return;
		}

		const kickExecutor = await fetchAuditLogExecutor(
			member.guild,
			AuditLogEvent.MemberKick,
			member.id
		);

		if (kickExecutor) {

			const auditLogs = await member.guild.fetchAuditLogs({
				limit: 1,
				type: AuditLogEvent.MemberKick
			});
			const kickLog = auditLogs.entries.first();

			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_KICK, {
				executor: kickExecutor,
				target: member.user,
				reason: kickLog?.reason || 'No reason provided',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		} else {

			const joinedAt = member.joinedTimestamp;
			const memberDuration = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';

			await sendLog(client, member.guild.id, LOG_EVENTS.MEMBER_LEAVE, {
				target: member.user,
				content: `Was a member for ${memberDuration}`,
				roles: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});

	client.on(Events.GuildBanAdd, async (ban) => {

		await new Promise(resolve => setTimeout(resolve, 100));

		const commandInvoker = getCommandInvoker(ban.guild.id, 'ban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'massban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'softban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'tempban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'raidwipe', ban.user.id);

		if (commandInvoker) {

			return;
		}

		const executor = await fetchAuditLogExecutor(
			ban.guild,
			AuditLogEvent.MemberBanAdd,
			ban.user.id
		);

		await sendLog(client, ban.guild.id, LOG_EVENTS.MEMBER_BAN, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			target: ban.user,
			reason: ban.reason || 'No reason provided',
			userId: ban.user.id,
			thumbnail: ban.user.displayAvatarURL()
		});
	});

	client.on(Events.GuildBanRemove, async (ban) => {

		await new Promise(resolve => setTimeout(resolve, 100));

		const commandInvoker = getCommandInvoker(ban.guild.id, 'unban', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'unbanall', ban.user.id) ||
			getCommandInvoker(ban.guild.id, 'softban', ban.user.id);

		if (commandInvoker) {

			return;
		}

		const executor = await fetchAuditLogExecutor(
			ban.guild,
			AuditLogEvent.MemberBanRemove,
			ban.user.id
		);

		await sendLog(client, ban.guild.id, LOG_EVENTS.MEMBER_UNBAN, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			target: ban.user,
			userId: ban.user.id,
			thumbnail: ban.user.displayAvatarURL()
		});
	});

	client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {

		await new Promise(resolve => setTimeout(resolve, 100));

		if (oldMember.nickname !== newMember.nickname) {

			const nickInvoker = getCommandInvoker(newMember.guild.id, 'nick', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'forcenickname', newMember.id);

			if (nickInvoker) {

				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberUpdate,
				newMember.id
			);

			await sendLog(client, newMember.guild.id, LOG_EVENTS.NICKNAME_UPDATE, {
				executor: executor || newMember.user,
				target: newMember.user,
				before: oldMember.nickname || oldMember.user.username,
				after: newMember.nickname || newMember.user.username,
				userId: newMember.user.id,
				thumbnail: newMember.user.displayAvatarURL()
			});
		}

		const oldRoles = oldMember.roles.cache;
		const newRoles = newMember.roles.cache;

		const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
		const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

		if (addedRoles.size > 0) {

			const roleAddInvoker = getCommandInvoker(newMember.guild.id, 'roleadd', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'role', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'temprole', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolebots', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolehumans', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolerestore', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'cascade', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'detain', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'release', newMember.id);

			if (roleAddInvoker) {

				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberRoleUpdate,
				newMember.id
			);

			for (const [, role] of addedRoles) {
				await sendLog(client, newMember.guild.id, LOG_EVENTS.ROLE_ADD, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					roles: role.name,
					roleId: role.id,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}

		if (removedRoles.size > 0) {

			const roleRemoveInvoker = getCommandInvoker(newMember.guild.id, 'roleremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'role', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolebotsremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolehumansremove', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'rolerestore', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'cascade', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'detain', newMember.id) ||
				getCommandInvoker(newMember.guild.id, 'release', newMember.id);

			if (roleRemoveInvoker) {

				return;
			}

			const executor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberRoleUpdate,
				newMember.id
			);

			for (const [, role] of removedRoles) {
				await sendLog(client, newMember.guild.id, LOG_EVENTS.ROLE_REMOVE, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					roles: role.name,
					roleId: role.id,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}

		const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
		const newTimeout = newMember.communicationDisabledUntilTimestamp;

		if (oldTimeout !== newTimeout) {

			const commandInvoker = getCommandInvoker(newMember.guild.id, 'mute', newMember.id);

			if (commandInvoker) {

				return;
			}

			const auditExecutor = await fetchAuditLogExecutor(
				newMember.guild,
				AuditLogEvent.MemberUpdate,
				newMember.id
			);
			const executor = auditExecutor;

			if (newTimeout && newTimeout > Date.now()) {

				await sendLog(client, newMember.guild.id, LOG_EVENTS.TIMEOUT_ADD, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					duration: formatDuration(newTimeout - Date.now()),
					content: `Timeout until <t:${Math.floor(newTimeout / 1000)}:F>`,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			} else if (oldTimeout && oldTimeout > Date.now()) {

				await sendLog(client, newMember.guild.id, LOG_EVENTS.TIMEOUT_REMOVE, {
					executor: executor || { tag: 'Unknown', id: 'Unknown' },
					target: newMember.user,
					userId: newMember.user.id,
					thumbnail: newMember.user.displayAvatarURL()
				});
			}
		}
	});

	client.on(Events.UserUpdate, async (oldUser, newUser) => {

		for (const [, guild] of client.guilds.cache) {
			const member = guild.members.cache.get(newUser.id);
			if (!member) continue;

			if (oldUser.username !== newUser.username) {
				await sendLog(client, guild.id, LOG_EVENTS.USERNAME_UPDATE, {
					target: newUser,
					before: oldUser.username,
					after: newUser.username,
					userId: newUser.id,
					thumbnail: newUser.displayAvatarURL()
				});
			}

			if (oldUser.avatar !== newUser.avatar) {
				await sendLog(client, guild.id, LOG_EVENTS.AVATAR_UPDATE, {
					target: newUser,
					before: oldUser.displayAvatarURL() || 'Default avatar',
					after: newUser.displayAvatarURL() || 'Default avatar',
					userId: newUser.id,
					thumbnail: newUser.displayAvatarURL()
				});
			}
		}
	});
}

function registerChannelEvents(client) {

	client.on(Events.ChannelCreate, async (channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.ChannelCreate,
			channel.id
		);

		await sendLog(client, channel.guild.id, LOG_EVENTS.CHANNEL_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel,
			content: `Type: ${getChannelTypeString(channel.type)}`,
			channelId: channel.id
		});
	});

	client.on(Events.ChannelDelete, async (channel) => {
		if (!channel.guild) return;

		const executor = await fetchAuditLogExecutor(
			channel.guild,
			AuditLogEvent.ChannelDelete,
			channel.id
		);

		await sendLog(client, channel.guild.id, LOG_EVENTS.CHANNEL_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `#${channel.name} (${getChannelTypeString(channel.type)})`,
			channelId: channel.id
		});
	});

	client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
		if (!newChannel.guild) return;

		let executor = await fetchAuditLogExecutor(
			newChannel.guild,
			AuditLogEvent.ChannelUpdate,
			newChannel.id
		);

		if (!executor || executor.tag === 'Unknown') {
			executor = await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteUpdate,
				newChannel.id
			) || await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteCreate,
				newChannel.id
			) || await fetchAuditLogExecutor(
				newChannel.guild,
				AuditLogEvent.ChannelOverwriteDelete,
				newChannel.id
			) || executor;
		}

		const changes = [];

		if (oldChannel.name !== newChannel.name) {
			changes.push(`**Name:** ${oldChannel.name} â†’ ${newChannel.name}`);
		}

		if (oldChannel.topic !== newChannel.topic) {
			changes.push(`**Topic:** ${oldChannel.topic || '*None*'} â†’ ${newChannel.topic || '*None*'}`);
		}

		if (oldChannel.nsfw !== newChannel.nsfw) {
			changes.push(`**NSFW:** ${oldChannel.nsfw ? 'Yes' : 'No'} â†’ ${newChannel.nsfw ? 'Yes' : 'No'}`);
		}

		if (oldChannel.parentId !== newChannel.parentId) {
			const oldParent = oldChannel.parent?.name || 'None';
			const newParent = newChannel.parent?.name || 'None';
			changes.push(`**Category:** ${oldParent} â†’ ${newParent}`);
		}

		if (oldChannel.position !== newChannel.position) {
			changes.push(`**Position:** ${oldChannel.position} â†’ ${newChannel.position}`);
		}

		if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
			changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s â†’ ${newChannel.rateLimitPerUser}s`);
		}

		if (oldChannel.bitrate !== newChannel.bitrate) {
			changes.push(`**Bitrate:** ${oldChannel.bitrate}kbps â†’ ${newChannel.bitrate}kbps`);
		}

		if (oldChannel.userLimit !== newChannel.userLimit) {
			changes.push(`**User Limit:** ${oldChannel.userLimit || 'Unlimited'} â†’ ${newChannel.userLimit || 'Unlimited'}`);
		}

		const oldPermissions = new Map(oldChannel.permissionOverwrites.cache);
		const newPermissions = new Map(newChannel.permissionOverwrites.cache);

		const getPermissionChanges = (oldAllow, oldDeny, newAllow, newDeny) => {
			const permChanges = [];
			const allPerms = [
				'ViewChannel', 'ManageChannels', 'ManageRoles', 'CreateInstantInvite',
				'SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads',
				'EmbedLinks', 'AttachFiles', 'AddReactions', 'UseExternalEmojis', 'UseExternalStickers',
				'MentionEveryone', 'ManageMessages', 'ManageThreads', 'ReadMessageHistory',
				'SendTTSMessages', 'UseApplicationCommands', 'SendVoiceMessages', 'SendPolls',
				'Connect', 'Speak', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers',
				'DeafenMembers', 'MoveMembers', 'UseEmbeddedActivities', 'UseSoundboard',
				'UseExternalSounds', 'RequestToSpeak', 'ManageEvents', 'ManageWebhooks'
			];

			for (const perm of allPerms) {
				const oldAllowed = oldAllow.has(perm);
				const oldDenied = oldDeny.has(perm);
				const newAllowed = newAllow.has(perm);
				const newDenied = newDeny.has(perm);

				if (oldAllowed !== newAllowed || oldDenied !== newDenied) {
					let oldState = oldAllowed ? 'âœ…' : oldDenied ? 'âŒ' : 'â¬œ';
					let newState = newAllowed ? 'âœ…' : newDenied ? 'âŒ' : 'â¬œ';
					permChanges.push(`${perm}: ${oldState} â†’ ${newState}`);
				}
			}
			return permChanges;
		};

		for (const [id, newPerm] of newPermissions) {
			const oldPerm = oldPermissions.get(id);
			const target = newPerm.type === 0
				? newChannel.guild.roles.cache.get(id)
				: newChannel.guild.members.cache.get(id)?.user;

			const targetName = newPerm.type === 0
				? (target?.name || `Unknown Role`)
				: (target?.username || `Unknown User`);
			const targetType = newPerm.type === 0 ? 'ðŸ·ï¸ Role' : 'ðŸ‘¤ Member';

			if (!oldPerm) {

				const permDetails = [];
				if (newPerm.allow.bitfield > 0n) {
					const allowed = newPerm.allow.toArray();
					permDetails.push(`âœ… Allowed: ${allowed.join(', ')}`);
				}
				if (newPerm.deny.bitfield > 0n) {
					const denied = newPerm.deny.toArray();
					permDetails.push(`âŒ Denied: ${denied.join(', ')}`);
				}
				changes.push(`**${targetType} ${targetName}:** Permission overwrite added\n${permDetails.join('\n')}`);
			} else if (oldPerm.allow.bitfield !== newPerm.allow.bitfield || oldPerm.deny.bitfield !== newPerm.deny.bitfield) {

				const permChanges = getPermissionChanges(oldPerm.allow, oldPerm.deny, newPerm.allow, newPerm.deny);
				if (permChanges.length > 0) {
					changes.push(`**${targetType} ${targetName}:** Permissions changed\n${permChanges.slice(0, 10).join('\n')}${permChanges.length > 10 ? `\n...and ${permChanges.length - 10} more` : ''}`);
				}
			}
		}

		for (const [id, oldPerm] of oldPermissions) {
			if (!newPermissions.has(id)) {
				const target = oldPerm.type === 0
					? newChannel.guild.roles.cache.get(id)
					: newChannel.guild.members.cache.get(id)?.user;

				const targetName = oldPerm.type === 0
					? (target?.name || `Unknown Role`)
					: (target?.username || `Unknown User`);
				const targetType = oldPerm.type === 0 ? 'ðŸ·ï¸ Role' : 'ðŸ‘¤ Member';
				changes.push(`**${targetType} ${targetName}:** Permission overwrite removed`);
			}
		}

		if (changes.length > 0) {
			await sendLog(client, newChannel.guild.id, LOG_EVENTS.CHANNEL_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				channel: newChannel,
				content: changes.join('\n'),
				channelId: newChannel.id
			});
		}
	});

	client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
		if (!newlyCreated) return;

		await sendLog(client, thread.guild.id, LOG_EVENTS.THREAD_CREATE, {
			executor: thread.ownerId ? { id: thread.ownerId } : { tag: 'Unknown', id: 'Unknown' },
			channel: thread.parent,
			content: `Thread: ${thread.name}`,
			channelId: thread.id
		});
	});

	client.on(Events.ThreadDelete, async (thread) => {
		const executor = await fetchAuditLogExecutor(
			thread.guild,
			AuditLogEvent.ThreadDelete,
			thread.id
		);

		await sendLog(client, thread.guild.id, LOG_EVENTS.THREAD_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Thread: ${thread.name}`,
			channelId: thread.id
		});
	});

	client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
		const changes = [];

		if (oldThread.name !== newThread.name) {
			changes.push(`**Name:** ${oldThread.name} â†’ ${newThread.name}`);
		}

		if (oldThread.archived !== newThread.archived) {
			changes.push(`**Archived:** ${oldThread.archived ? 'Yes' : 'No'} â†’ ${newThread.archived ? 'Yes' : 'No'}`);
		}

		if (oldThread.locked !== newThread.locked) {
			changes.push(`**Locked:** ${oldThread.locked ? 'Yes' : 'No'} â†’ ${newThread.locked ? 'Yes' : 'No'}`);
		}

		if (changes.length > 0) {
			await sendLog(client, newThread.guild.id, LOG_EVENTS.THREAD_UPDATE, {
				channel: newThread.parent,
				content: `Thread: ${newThread.name}\n${changes.join('\n')}`,
				channelId: newThread.id
			});
		}
	});
}

function registerRoleEvents(client) {

	client.on(Events.GuildRoleCreate, async (role) => {
		const executor = await fetchAuditLogExecutor(
			role.guild,
			AuditLogEvent.RoleCreate,
			role.id
		);

		await sendLog(client, role.guild.id, LOG_EVENTS.ROLE_CREATE, {
			executor: executor,
			role: role,
			content: `**Color:** ${role.hexColor}\n**Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
			roleId: role.id
		});
	});

	client.on(Events.GuildRoleDelete, async (role) => {
		const executor = await fetchAuditLogExecutor(
			role.guild,
			AuditLogEvent.RoleDelete,
			role.id
		);

		await sendLog(client, role.guild.id, LOG_EVENTS.ROLE_DELETE, {
			executor: executor,
			role: role,
			roleId: role.id
		});
	});

	client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
		const executor = await fetchAuditLogExecutor(
			newRole.guild,
			AuditLogEvent.RoleUpdate,
			newRole.id
		);

		const changes = [];

		if (oldRole.name !== newRole.name) {
			changes.push(`**Name:** ${oldRole.name} â†’ ${newRole.name}`);
		}

		if (oldRole.hexColor !== newRole.hexColor) {
			changes.push(`**Color:** ${oldRole.hexColor} â†’ ${newRole.hexColor}`);
		}

		if (oldRole.hoist !== newRole.hoist) {
			changes.push(`**Hoisted:** ${oldRole.hoist ? 'Yes' : 'No'} â†’ ${newRole.hoist ? 'Yes' : 'No'}`);
		}

		if (oldRole.mentionable !== newRole.mentionable) {
			changes.push(`**Mentionable:** ${oldRole.mentionable ? 'Yes' : 'No'} â†’ ${newRole.mentionable ? 'Yes' : 'No'}`);
		}

		if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
			const oldPerms = oldRole.permissions.toArray();
			const newPerms = newRole.permissions.toArray();
			const added = newPerms.filter(p => !oldPerms.includes(p));
			const removed = oldPerms.filter(p => !newPerms.includes(p));

			if (added.length > 0) {
				changes.push(`**Permissions Added:** ${added.join(', ')}`);
			}
			if (removed.length > 0) {
				changes.push(`**Permissions Removed:** ${removed.join(', ')}`);
			}
		}

		if (changes.length > 0) {
			await sendLog(client, newRole.guild.id, LOG_EVENTS.ROLE_UPDATE, {
				executor: executor,
				role: newRole,
				changes: changes,
				roleId: newRole.id
			});
		}
	});
}

function registerEmojiEvents(client) {

	client.on(Events.GuildEmojiCreate, async (emoji) => {
		const executor = await fetchAuditLogExecutor(
			emoji.guild,
			AuditLogEvent.EmojiCreate,
			emoji.id
		);

		await sendLog(client, emoji.guild.id, LOG_EVENTS.EMOJI_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			emojiName: emoji.name,
			emojiPreview: `${emoji}`,
			thumbnail: emoji.imageURL()
		});
	});

	client.on(Events.GuildEmojiDelete, async (emoji) => {
		const executor = await fetchAuditLogExecutor(
			emoji.guild,
			AuditLogEvent.EmojiDelete,
			emoji.id
		);

		await sendLog(client, emoji.guild.id, LOG_EVENTS.EMOJI_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			emojiName: emoji.name,
			thumbnail: emoji.imageURL()
		});
	});

	client.on(Events.GuildEmojiUpdate, async (oldEmoji, newEmoji) => {
		const executor = await fetchAuditLogExecutor(
			newEmoji.guild,
			AuditLogEvent.EmojiUpdate,
			newEmoji.id
		);

		await sendLog(client, newEmoji.guild.id, LOG_EVENTS.EMOJI_UPDATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			oldName: oldEmoji.name,
			newName: newEmoji.name,
			emojiPreview: `${newEmoji}`,
			thumbnail: newEmoji.imageURL()
		});
	});

	client.on(Events.GuildStickerCreate, async (sticker) => {
		const executor = await fetchAuditLogExecutor(
			sticker.guild,
			AuditLogEvent.StickerCreate,
			sticker.id
		);

		await sendLog(client, sticker.guild.id, LOG_EVENTS.STICKER_CREATE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Sticker: ${sticker.name}\nDescription: ${sticker.description || 'None'}`,
			thumbnail: sticker.url
		});
	});

	client.on(Events.GuildStickerDelete, async (sticker) => {
		const executor = await fetchAuditLogExecutor(
			sticker.guild,
			AuditLogEvent.StickerDelete,
			sticker.id
		);

		await sendLog(client, sticker.guild.id, LOG_EVENTS.STICKER_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			content: `Sticker: ${sticker.name}`
		});
	});

	client.on(Events.GuildStickerUpdate, async (oldSticker, newSticker) => {
		const executor = await fetchAuditLogExecutor(
			newSticker.guild,
			AuditLogEvent.StickerUpdate,
			newSticker.id
		);

		const changes = [];
		if (oldSticker.name !== newSticker.name) {
			changes.push(`**Name:** ${oldSticker.name} â†’ ${newSticker.name}`);
		}
		if (oldSticker.description !== newSticker.description) {
			changes.push(`**Description:** ${oldSticker.description || 'None'} â†’ ${newSticker.description || 'None'}`);
		}

		if (changes.length > 0) {
			await sendLog(client, newSticker.guild.id, LOG_EVENTS.STICKER_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				content: changes.join('\n'),
				thumbnail: newSticker.url
			});
		}
	});
}

function registerServerEvents(client) {

	client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
		const executor = await fetchAuditLogExecutor(
			newGuild,
			AuditLogEvent.GuildUpdate,
			newGuild.id
		);

		const changes = [];

		if (oldGuild.name !== newGuild.name) {
			changes.push(`**Name:** ${oldGuild.name} â†’ ${newGuild.name}`);
		}

		if (oldGuild.icon !== newGuild.icon) {
			changes.push(`**Icon:** Changed`);
		}

		if (oldGuild.banner !== newGuild.banner) {
			changes.push(`**Banner:** Changed`);
		}

		if (oldGuild.description !== newGuild.description) {

			if ((oldGuild.description || newGuild.description)) {
				changes.push(`**Description:** ${oldGuild.description || '*None*'} â†’ ${newGuild.description || '*None*'}`);
			}
		}

		if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
			changes.push(`**Verification Level:** ${oldGuild.verificationLevel} â†’ ${newGuild.verificationLevel}`);
		}

		if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
			changes.push(`**Content Filter:** ${oldGuild.explicitContentFilter} â†’ ${newGuild.explicitContentFilter}`);
		}

		if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
			changes.push(`**System Channel:** <#${oldGuild.systemChannelId}> â†’ <#${newGuild.systemChannelId}>`);
		}

		if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
			changes.push(`**AFK Channel:** <#${oldGuild.afkChannelId}> â†’ <#${newGuild.afkChannelId}>`);
		}

		if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
			changes.push(`**AFK Timeout:** ${oldGuild.afkTimeout}s â†’ ${newGuild.afkTimeout}s`);
		}

		if (changes.length > 0) {
			await sendLog(client, newGuild.id, LOG_EVENTS.SERVER_UPDATE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				content: changes.join('\n'),
				thumbnail: newGuild.iconURL()
			});
		}
	});

}

function registerVoiceEvents(client) {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		const member = newState.member || oldState.member;
		if (!member) return;

		const guild = newState.guild || oldState.guild;
		if (!guild) return;

		if (!oldState.channelId && newState.channelId) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_JOIN, {
				target: member.user,
				channel: newState.channel,
				userId: member.user.id,
				channelId: newState.channelId,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		else if (oldState.channelId && !newState.channelId) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_LEAVE, {
				target: member.user,
				channel: oldState.channel,
				userId: member.user.id,
				channelId: oldState.channelId,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberMove,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MOVE, {
				executor: executor || member.user,
				target: member.user,
				before: `<#${oldState.channelId}>`,
				after: `<#${newState.channelId}>`,
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		if (oldState.channelId && oldState.serverMute !== newState.serverMute) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberUpdate,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MUTE, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: newState.serverMute ? 'Server muted' : 'Server unmuted',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		if (oldState.channelId && oldState.selfMute !== newState.selfMute) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_MUTE, {
				executor: member.user,
				target: member.user,
				content: newState.selfMute ? 'Self-muted' : 'Self-unmuted',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		if (oldState.channelId && oldState.serverDeaf !== newState.serverDeaf) {
			const executor = await fetchAuditLogExecutor(
				guild,
				AuditLogEvent.MemberUpdate,
				member.id
			);

			await sendLog(client, guild.id, LOG_EVENTS.VOICE_DEAFEN, {
				executor: executor || { tag: 'Unknown', id: 'Unknown' },
				target: member.user,
				content: newState.serverDeaf ? 'Server deafened' : 'Server undeafened',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}

		if (oldState.channelId && oldState.selfDeaf !== newState.selfDeaf) {
			await sendLog(client, guild.id, LOG_EVENTS.VOICE_DEAFEN, {
				executor: member.user,
				target: member.user,
				content: newState.selfDeaf ? 'Self-deafened' : 'Self-undeafened',
				userId: member.user.id,
				thumbnail: member.user.displayAvatarURL()
			});
		}
	});
}

function registerInviteEvents(client) {

	client.on(Events.InviteCreate, async (invite) => {
		if (!invite.guild) return;

		await sendLog(client, invite.guild.id, LOG_EVENTS.INVITE_CREATE, {
			executor: invite.inviter,
			channel: invite.channel,
			content: `Code: ${invite.code}\nMax Uses: ${invite.maxUses || 'Unlimited'}\nExpires: ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never'}`,
			channelId: invite.channel?.id
		});
	});

	client.on(Events.InviteDelete, async (invite) => {
		if (!invite.guild) return;

		const executor = await fetchAuditLogExecutor(
			invite.guild,
			AuditLogEvent.InviteDelete,
			invite.code
		);

		await sendLog(client, invite.guild.id, LOG_EVENTS.INVITE_DELETE, {
			executor: executor || { tag: 'Unknown', id: 'Unknown' },
			channel: invite.channel,
			content: `Code: ${invite.code}`,
			channelId: invite.channel?.id
		});
	});
}

function registerAuditLogEvents(client) {

	client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {

		if (auditLogEntry.executorId === client.user.id) return;

		if (auditLogEntry.action === AuditLogEvent.AutoModerationBlockMessage ||
			auditLogEntry.action === AuditLogEvent.AutoModerationFlagToChannel ||
			auditLogEntry.action === AuditLogEvent.AutoModerationUserCommunicationDisabled) {

			await sendLog(client, guild.id, LOG_EVENTS.AUTOMOD_ACTION, {
				executor: { tag: 'AutoMod', id: 'AutoMod' },
				target: auditLogEntry.target,
				reason: auditLogEntry.reason || 'AutoMod action triggered',
				content: `Action: ${auditLogEntry.action}`
			});
		}
	});
}

export default { registerLoggingEvents };
