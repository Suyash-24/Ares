import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

export default {
	name: 'lock',
	description: 'Lock a channel to prevent members from sending messages',
	usage: 'lock [channel] [reason]',
	category: 'Moderation',

	async execute(message, args, client) {

		const allMode = args[0]?.toLowerCase() === 'all';
		if (allMode) {
			const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
			const isOwner = message.guild.ownerId === message.author.id;
			const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
			const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
			const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

			if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Permission Denied`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('You need **Discord Administrator** + **Antinuke Admin** permissions to lock all channels.')
				);
				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

		const guildData = await client.db.findOne({ guildId: message.guild.id });
		const headmodRoleId = guildData?.moderation?.headmodRole;

		const isHeadmod = headmodRoleId && message.member.roles.has(headmodRoleId);
		const hasPermission = message.member.permissions.has('ManageChannels') || isHeadmod;

		if (!hasPermission) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You need the **Manage Channels** permission or **Headmod** role to use this command.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (args[0]?.toLowerCase() === 'all') {
			return lockAllChannels(message, args.slice(1), client);
		}

		if (args[0]?.toLowerCase() === 'ignore') {
			return manageLockIgnore(message, args.slice(1), client);
		}

		try {
			let targetChannel = message.channel;
			let reason = 'No reason provided';
			let startArgIndex = 0;

			if (args.length > 0) {
				const channelInput = args[0];

				if (message.mentions.channels.size > 0) {
					targetChannel = message.mentions.channels.first();
					startArgIndex = 1;
				} else {

					const foundChannel = message.guild.channels.cache.get(channelInput);
					if (foundChannel) {
						targetChannel = foundChannel;
						startArgIndex = 1;
					} else {

						reason = args.join(' ');
						startArgIndex = args.length;
					}
				}
			}

			if (startArgIndex < args.length) {
				reason = args.slice(startArgIndex).join(' ');
			}

			if (!message.guild.members.me.permissions.has('ManageChannels')) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Missing Permissions`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('I need the **Manage Channels** permission to lock channels.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const everyoneRole = message.guild.roles.everyone;
			const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);

			if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ Already Locked`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${targetChannel} is already locked.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			markCommandInvoker(message.guild.id, 'lock', targetChannel.id, message.author);

			await targetChannel.permissionOverwrites.edit(everyoneRole, {
				SendMessages: false,
				AddReactions: false,
				CreatePublicThreads: false,
				CreatePrivateThreads: false
			});

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_LOCK, {
				executor: message.author,
				channel: targetChannel,
				reason: reason,
				channelId: targetChannel.id
			});

			const channelNotification = new ContainerBuilder();
			channelNotification.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.locked} Channel Locked`)
			);
			channelNotification.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			channelNotification.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Reason:** ${reason}`
				)
			);

			await targetChannel.send({
				components: [channelNotification],
				flags: MessageFlags.IsComponentsV2
			});

			const confirmContainer = new ContainerBuilder();
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.locked} Channel Locked`)
			);
			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Channel:** ${targetChannel}\n` +
					`**Locked By:** ${message.author.username}\n` +
					`**Reason:** ${reason}`
				)
			);

			return message.reply({
				components: [confirmContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in lock command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`An error occurred: ${error.message}`)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

async function lockAllChannels(message, args, client) {
	try {

		if (!message.guild.members.me.permissions.has('ManageChannels')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I need the **Manage Channels** permission to lock channels.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.length > 0 ? args.join(' ') : 'Server Lockdown';
		const everyoneRole = message.guild.roles.everyone;
		let lockedCount = 0;
		let failedCount = 0;

		const freshGuildData = await client.db.findOne({ guildId: message.guild.id });
		const ignoredChannels = (freshGuildData?.moderation?.lockIgnoreChannels || []).map(id => String(id));

		const allChannels = message.guild.channels.cache.filter(ch => {
			const isIgnored = ignoredChannels.includes(String(ch.id));
			if (isIgnored) return false;
			if (ch.isDMBased()) return false;
			return ch.isTextBased() || ch.isVoiceBased();
		});

		const processingContainer = new ContainerBuilder();
		processingContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# 🔄 Locking all channels...`)
		);
		processingContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		processingContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`Found **${allChannels.size}** channels to lock.`)
		);

		const processingMsg = await message.reply({
			components: [processingContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});

		for (const channel of allChannels.values()) {
			try {
				const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);

				const isVoiceChannel = channel.isVoiceBased();
				const lockPermission = isVoiceChannel ? PermissionFlagsBits.Connect : PermissionFlagsBits.SendMessages;

				if (currentPermissions && currentPermissions.deny.has(lockPermission)) {
					continue;
				}

				const permissionsToSet = {
					SendMessages: false,
					AddReactions: false,
					CreatePublicThreads: false,
					CreatePrivateThreads: false
				};

				if (isVoiceChannel) {
					permissionsToSet.Connect = false;
					delete permissionsToSet.SendMessages;
					delete permissionsToSet.AddReactions;
					delete permissionsToSet.CreatePublicThreads;
					delete permissionsToSet.CreatePrivateThreads;
				}

				await channel.permissionOverwrites.edit(everyoneRole, permissionsToSet);
				lockedCount++;

				if (!isVoiceChannel) {
					const channelNotification = new ContainerBuilder();
					channelNotification.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# 🔒 Channel Locked`)
					);
					channelNotification.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					channelNotification.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(
							`**Reason:** ${reason}`
						)
					);

					await channel.send({
						components: [channelNotification],
						flags: MessageFlags.IsComponentsV2
					}).catch(() => {});
				}

			} catch (error) {
				failedCount++;
				console.error(`Failed to lock channel ${channel.name}:`, error);
			}
		}

		const completionContainer = new ContainerBuilder();
		completionContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.locked} Server Lockdown Complete`)
		);
		completionContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		completionContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`**Locked By:** ${message.author.username}\n` +
				`**Channels Locked:** ${lockedCount}\n` +
				`**Failed:** ${failedCount}\n` +
				`**Reason:** ${reason}`
			)
		);

		await processingMsg.edit({
			components: [completionContainer],
			flags: MessageFlags.IsComponentsV2
		});

	} catch (error) {
		console.error('Error in lock all command:', error);
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ❌ Error`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`An error occurred: ${error.message}`)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
}

async function manageLockIgnore(message, args, client) {
	try {
		const action = args[0]?.toLowerCase();

		if (!action || !['add', 'remove', 'list'].includes(action)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Usage`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Valid actions:**\n` +
					`\`!lock ignore add [channel]\` - Add channel to ignore list\n` +
					`\`!lock ignore remove [channel]\` - Remove channel from ignore list\n` +
					`\`!lock ignore list\` - View ignored channels`
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const guildData = await client.db.findOne({ guildId: message.guild.id });
		let ignoredChannels = guildData?.moderation?.lockIgnoreChannels || [];

		if (action === 'list') {
			let listContent = ignoredChannels.length > 0
				? ignoredChannels.map(id => `<#${id}>`).join('\n')
				: 'No channels are currently ignored.';

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.locked} Lock Ignored Channels`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(listContent)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let targetChannel = null;
		if (message.mentions.channels.size > 0) {
			targetChannel = message.mentions.channels.first();
		} else if (args[1]) {
			targetChannel = message.guild.channels.cache.get(args[1]);
		}

		if (!targetChannel) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Channel Not Found`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Please mention a channel or provide a valid channel ID.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (action === 'add') {
			if (ignoredChannels.includes(targetChannel.id)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ Already Ignored`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${targetChannel} is already in the ignore list.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			ignoredChannels.push(targetChannel.id);

			const result = await client.db.updateOne(
				{ guildId: message.guild.id },
				{
					$set: {
						moderation: {
							...guildData?.moderation,
							lockIgnoreChannels: ignoredChannels
						}
					}
				},
				{ upsert: true }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success} Channel Added`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`${targetChannel} has been added to the lock ignore list.`)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (action === 'remove') {
			if (!ignoredChannels.includes(targetChannel.id)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ Not In List`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${targetChannel} is not in the ignore list.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			ignoredChannels = ignoredChannels.filter(id => id !== targetChannel.id);
			await client.db.updateOne(
				{ guildId: message.guild.id },
				{
					$set: {
						moderation: {
							...guildData?.moderation,
							lockIgnoreChannels: ignoredChannels
						}
					}
				},
				{ upsert: true }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success} Channel Removed`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`${targetChannel} has been removed from the lock ignore list.`)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

	} catch (error) {
		console.error('Error in lock ignore command:', error);
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ❌ Error`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`An error occurred: ${error.message}`)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
}
