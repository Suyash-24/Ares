import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import { parseDuration } from '../../../utils/durationParser.js';
import { formatDetainMessage, getDetainMessages } from '../../../utils/detainMessageFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

// Store active timers: Map<guildId_userId, timeoutId>
const detainTimers = new Map();

export default {
	name: 'detain',
	description: 'Temporarily restrict a user by removing all roles',
	usage: 'detain <user> <duration> [reason]',
	category: 'Moderation',
	detainTimers, // Export for other commands to use

	async execute(message, args, client) {
		if (args.length < 2) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`**Usage:** \`${client.prefix}detain <user> <duration> [reason]\`\n\n**Duration:** 1m, 1h, 1d, etc.`)
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		// Check if user can use detain command
		const canUse = await ModerationPermissions.canUseCommand(message.member, 'detain', client, message.guildId);
		if (!canUse.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(getModerationPermissionErrors[canUse.reason])
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		// Parse target user
		const target = await parseUserInput(args[0], message.guild, client);
		if (!target) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} User Not Found`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Could not find the specified user.')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (target.user.bot) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Cannot Detain`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You cannot detain a bot.')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		// Check self-moderation
		if (target.id === message.author.id) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Cannot Detain`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You cannot detain yourself.')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		// Parse duration
		const durationStr = args[1];
		const durationMs = parseDuration(durationStr);

		if (!durationMs || durationMs <= 0) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Invalid Duration`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Please specify a valid duration (e.g., 1h, 30m, 2d).')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.slice(2).join(' ') || 'No reason provided';

		try {
			// Get guild data
			let guildData = await client.db.findOne({ guildId: message.guildId });

			if (!guildData) {
				guildData = {
					guildId: message.guildId,
					moderation: {
						supportRoles: [],
						modRoles: [],
						headmodRoles: [],
						warnings: [],
						detains: [],
						detainRole: null
					}
				};
			}

			if (!guildData.moderation) {
				guildData.moderation = {
					supportRoles: [],
					modRoles: [],
					headmodRoles: [],
					warnings: [],
					detains: [],
					detainRole: null
				};
			}

			// Check if detain role is configured
			if (!guildData.moderation.detainRole) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Detain Role Not Configured`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Please configure a detain role first using \`${client.prefix}config set detainrole @role\``)
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			// Get the detain role
			const detainRole = message.guild.roles.cache.get(guildData.moderation.detainRole);
			if (!detainRole) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Detain Role Deleted`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`The configured detain role was deleted. Please reconfigure it using \`${client.prefix}config set detainrole @role\``)
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			// Check if user is already detained
			const existingDetain = guildData.moderation.detains?.find(d => d.userId === target.id);
			if (existingDetain) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Already Detained`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} is already detained.`)
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			// Role hierarchy checks
			const moderatorHighest = ModerationPermissions.getHighestRole(message.member);
			const targetHighest = ModerationPermissions.getHighestRole(target);
			const botHighest = message.guild.members.me.roles.highest;

			if (ModerationPermissions.compareRoles(targetHighest, moderatorHighest) >= 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Cannot Detain`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('The target user has a higher or equal role than you.')
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			if (ModerationPermissions.compareRoles(targetHighest, botHighest) >= 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Cannot Detain`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('The target user has a higher or equal role than me.')
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			// Save user's current roles (exclude @everyone and managed roles)
			const oldRoles = target.roles.cache
				.filter(role => role.id !== message.guild.id && !role.managed)
				.map(role => role.id);

			// Check if detainMode is enabled (default to true if not set)
			const detainMode = guildData.moderation.detainMode !== false; // Default true
			let rolesToSet = [detainRole.id];

			if (!detainMode) {
				// Keep existing roles and add detain role
				rolesToSet = [...oldRoles, detainRole.id];
			}

			// Mark this as a command-invoked action so logging knows who did it
			markCommandInvoker(message.guild.id, 'detain', target.id, message.author);

			// Set roles based on detain mode
			await target.roles.set(rolesToSet).catch(err => {
				throw new Error(`Failed to modify roles: ${err.message}`);
			});

			// Store detain record
			const detainRecord = {
				userId: target.id,
				moderatorId: message.author.id,
				guildId: message.guildId,
				oldRoles: oldRoles,
				detainRole: detainRole.id,
				duration: durationMs,
				reason: reason,
				timestamp: Date.now(),
				expiresAt: Date.now() + durationMs
			};

			if (!guildData.moderation.detains) {
				guildData.moderation.detains = [];
			}

			guildData.moderation.detains.push(detainRecord);
			await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

			// Set up auto-restore timer
			setupDetainTimer(client, detainRecord);

			// Send message to detain channel if configured
			if (guildData.moderation.detainChannel) {
				try {
					const detainChannel = message.guild.channels.cache.get(guildData.moderation.detainChannel);
					if (detainChannel && detainChannel.isTextBased()) {
						const durationDisplay = formatDuration(durationMs);
						await detainChannel.send(
							`${EMOJIS.jail || '⛓️'} **${formatUserDisplay(target.user)}** has been detained for **${durationDisplay}**\n**Reason:** ${reason}`
						).catch(() => {});
					}
				} catch (err) {
					console.error('Error sending detain notification:', err);
				}
			}

			// Get custom messages
			const messages = getDetainMessages(guildData);
			const durationDisplay = formatDuration(durationMs);

			// Prepare message variables
			const messageVars = {
				user: formatUserDisplay(target.user),
				duration: durationDisplay,
				reason: reason,
				moderator: message.author.username
			};

			// Send DM to user if possible
			try {
				const dmMessage = formatDetainMessage(messages.detain, messageVars);
				await target.send(dmMessage).catch(() => {});
			} catch (err) {
				console.error('Error sending DM to detained user:', err);
			}

			// Send confirmation with formatted display
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.jail || '⛓️'} User Detained`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			// Format as key-value pairs like the second image
			const displayInfo = `**User:** ${formatUserDisplay(target.user)}\n**Duration:** ${durationDisplay}\n**Reason:** ${reason}`;

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(displayInfo)
			);

			// Send log for detain
			await sendLog(client, message.guildId, LOG_EVENTS.MOD_DETAIN, {
				executor: message.author,
				target: target.user,
				reason: reason,
				duration: durationMs,
				thumbnail: target.user.displayAvatarURL({ dynamic: true })
			});

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in detain command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`An error occurred: ${error.message}`)
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

// Helper function to setup auto-restore timer
function setupDetainTimer(client, detainRecord) {
	const timeUntilExpiry = detainRecord.expiresAt - Date.now();
	const timerKey = `${detainRecord.guildId}_${detainRecord.userId}`;

	if (timeUntilExpiry <= 0) {
		// Already expired, restore immediately
		restoreDetainedUser(client, detainRecord);
		return;
	}

	const timerId = setTimeout(() => {
		restoreDetainedUser(client, detainRecord);
		// Remove from map after execution
		detainTimers.delete(timerKey);
	}, timeUntilExpiry);

	// Store the timer ID so we can cancel it later
	detainTimers.set(timerKey, timerId);
}

// Helper function to restore detained user
async function restoreDetainedUser(client, detainRecord) {
	try {
		const guild = client.guilds.cache.get(detainRecord.guildId);
		if (!guild) return;

		const member = await guild.members.fetch(detainRecord.userId).catch(() => null);
		if (!member) return;

		// Remove detain role
		await member.roles.remove(detainRecord.detainRole).catch(() => {});

		// Restore old roles
		if (detainRecord.oldRoles && detainRecord.oldRoles.length > 0) {
			await member.roles.add(detainRecord.oldRoles).catch(() => {});
		}

		// Update database to remove the record
		const guildData = await client.db.findOne({ guildId: detainRecord.guildId });
		if (guildData && guildData.moderation?.detains) {
			guildData.moderation.detains = guildData.moderation.detains.filter(
				d => !(d.userId === detainRecord.userId && d.timestamp === detainRecord.timestamp)
			);
			await client.db.updateOne({ guildId: detainRecord.guildId }, guildData);

			// Send message to detain channel if configured
			if (guildData.moderation.detainChannel) {
				try {
					const detainChannel = guild.channels.cache.get(guildData.moderation.detainChannel);
					if (detainChannel && detainChannel.isTextBased()) {
						const detainedUser = await client.users.fetch(detainRecord.userId).catch(() => null);
						const userName = detainedUser ? `${detainedUser.username}#${detainedUser.discriminator}` : `User (${detainRecord.userId})`;
						await detainChannel.send(
							`${EMOJIS.success} **${userName}** has been released from detention.`
						).catch(() => {});
					}
				} catch (err) {
					console.error('Error sending release notification:', err);
				}
			}
		}
	} catch (error) {
		console.error('Error restoring detained user:', error);
	}
}

// Helper function to format duration
function formatDuration(ms) {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}
