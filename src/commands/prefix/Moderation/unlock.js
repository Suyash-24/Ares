import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

export default {
	name: 'unlock',
	description: 'Unlock a channel to allow members to send messages',
	usage: 'unlock [channel] [optional reason]',
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
					textDisplay.setContent('You need **Discord Administrator** + **Antinuke Admin** permissions to unlock all channels.')
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
			return unlockAllChannels(message, args.slice(1), client);
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
					textDisplay.setContent('I need the **Manage Channels** permission to unlock channels.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const everyoneRole = message.guild.roles.everyone;
			const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);

			if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ Not Locked`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${targetChannel} is not locked.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

		markCommandInvoker(message.guild.id, 'unlock', targetChannel.id, message.author);

		await targetChannel.permissionOverwrites.edit(everyoneRole, {
			SendMessages: null,
			AddReactions: null,
			CreatePublicThreads: null,
			CreatePrivateThreads: null
		});

		await sendLog(client, message.guildId, LOG_EVENTS.MOD_UNLOCK, {
			executor: message.author,
			channel: targetChannel,
			reason: reason,
			channelId: targetChannel.id
		});

			const channelNotification = new ContainerBuilder();
			channelNotification.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.unlocked} Channel Unlocked`)
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
				textDisplay.setContent(`# ${EMOJIS.unlocked} Channel Unlocked`)
			);
			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Channel:** ${targetChannel}\n` +
					`**Unlocked By:** ${message.author.username}\n` +
					`**Reason:** ${reason}`
				)
			);

			return message.reply({
				components: [confirmContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in unlock command:', error);
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

async function unlockAllChannels(message, args, client) {
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
				textDisplay.setContent('I need the **Manage Channels** permission to unlock channels.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.length > 0 ? args.join(' ') : 'Server Unlock';
		const everyoneRole = message.guild.roles.everyone;
		let unlockedCount = 0;
		let failedCount = 0;

		const guildData = await client.db.findOne({ guildId: message.guild.id });
		const ignoredChannels = guildData?.moderation?.lockIgnoreChannels || [];

		const allChannels = message.guild.channels.cache.filter(ch => {
			if (ignoredChannels.includes(ch.id)) return false;
			if (ch.isDMBased()) return false;
			return ch.isTextBased() || ch.isVoiceBased();
		});

		const processingContainer = new ContainerBuilder();
		processingContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# 🔄 Unlocking all channels...`)
		);
		processingContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		processingContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`Found **${allChannels.size}** channels to process.`)
		);

		const processingMsg = await message.reply({
			components: [processingContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});

		for (const channel of allChannels.values()) {
			try {
				const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);

				if (!currentPermissions) {
					continue;
				}

				const isVoiceChannel = channel.isVoiceBased();
				let isLocked = false;

				if (isVoiceChannel) {

					isLocked = currentPermissions.deny.has(PermissionFlagsBits.Connect);
				} else {

					isLocked = currentPermissions.deny.has(PermissionFlagsBits.SendMessages);
				}

				if (!isLocked) {
					continue;
				}

				if (isVoiceChannel) {

					await channel.permissionOverwrites.edit(everyoneRole, {
						Connect: null
					});
				} else {

					await channel.permissionOverwrites.edit(everyoneRole, {
						SendMessages: null,
						AddReactions: null,
						CreatePublicThreads: null,
						CreatePrivateThreads: null
					});
				}

				unlockedCount++;

				if (!isVoiceChannel) {
					const channelNotification = new ContainerBuilder();
					channelNotification.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ${EMOJIS.unlocked} Channel Unlocked`)
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
				console.error(`Failed to unlock channel ${channel.name}:`, error);
			}
		}

		const completionContainer = new ContainerBuilder();
		completionContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.unlocked} Server Unlock Complete`)
		);
		completionContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		completionContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`**Unlocked By:** ${message.author.username}\n` +
				`**Channels Unlocked:** ${unlockedCount}\n` +
				`**Failed:** ${failedCount}\n` +
				`**Reason:** ${reason}`
			)
		);

		await processingMsg.edit({
			components: [completionContainer],
			flags: MessageFlags.IsComponentsV2
		});

	} catch (error) {
		console.error('Error in unlock all command:', error);
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
