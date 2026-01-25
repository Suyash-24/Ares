
import { PermissionsBitField, ChannelType, ContainerBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } };
};

const scheduledNukes = globalThis._scheduledNukes = globalThis._scheduledNukes || new Map();

export default {
	name: 'nuke',
	description: 'Nuke a channel or manage scheduled nukes (add, remove, view)',
	usage: 'nuke [add|remove|view]',
	category: 'Moderation',
	async execute(message, args, client) {
		const sub = args[0]?.toLowerCase();

		if (sub === 'archive') {
			if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				const hasCustomAdmin = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'antinukeadmin');
				if (!hasCustomAdmin) {
					return message.reply(buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'Administrator permission required.'));
				}
			}
			if (args.length < 3) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: nuke archive <channel> <on|off>'));
			}
			const channelMention = args[1];
			const settingRaw = args[2].toLowerCase();
			const channelId = channelMention.replace(/[^0-9]/g, '');
			const channel = message.guild.channels.cache.get(channelId);
			if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Please specify a valid text-based channel.'));
			}
			let value;

			if (settingRaw === 'on') value = true;
			else if (settingRaw === 'off') value = false;
			else {
				return message.reply(buildNotice(`# ${EMOJIS.error} Invalid Setting`, 'Setting must be `on` or `off`. Example: `nuke archive #general on`'));
			}
			const guildId = message.guildId;
			const db = client.db;
			let guildData = await db.findOne({ guildId });
			if (!guildData) guildData = { guildId, moderation: {} };
			if (!guildData.moderation) guildData.moderation = {};
			if (!guildData.moderation.nukeArchive) guildData.moderation.nukeArchive = {};
			guildData.moderation.nukeArchive[channelId] = value;
			await db.updateOne({ guildId }, { $set: { moderation: guildData.moderation } });
			return message.reply(buildNotice(`# ${EMOJIS.success} Nuke Archive Updated`, `Channel: <#${channelId}>\nArchive before nuke: **${value ? 'Enabled' : 'Disabled'}**`));
		}

		if (sub === 'view') {
			if (!message.member.permissions.has('Administrator')) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'Administrator permission required.'));
			}
			if (scheduledNukes.size === 0) {
				return message.reply(buildNotice(`# ${EMOJIS.info} No Scheduled Nukes`, 'There are currently no scheduled nukes.'));
			}

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.info || ':information_source:'} Scheduled Nukes`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			let first = true;
			for (const [channelId, nuke] of scheduledNukes.entries()) {
				if (!first) {
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
				}
				first = false;
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**Channel:** <#${channelId}>\n` +
						`**By:** <@${nuke.scheduledBy}>\n` +
						`**Interval:** ${nuke.interval}\n` +
						`**Message:** ${nuke.nukeMsg}`
					)
				);
			}
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (sub === 'add') {
			if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'Administrator permission required.'));
			}
			if (args.length < 4) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: nuke add <channel> <interval> <message>\nExample: nuke add #general 10m This channel will be nuked in 10 minutes!'));
			}
			const channelMention = args[1];
			const intervalRaw = args[2];
			const nukeMsg = args.slice(3).join(' ');
			const channelId = channelMention.replace(/[^0-9]/g, '');
			const channel = message.guild.channels.cache.get(channelId);
			if (!channel || channel.type !== ChannelType.GuildText) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Please specify a valid text channel.'));
			}

			const match = intervalRaw.match(/^(\d+)(s|m|h|d)?$/i);
			if (!match) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Invalid Interval`, 'Interval must be a positive number optionally followed by s (seconds), m (minutes), h (hours), or d (days). Example: 10m'));
			}
			let intervalMs = 0;
			const value = parseInt(match[1], 10);
			const unit = (match[2] || 'm').toLowerCase();
			if (unit === 's') intervalMs = value * 1000;
			else if (unit === 'm') intervalMs = value * 60 * 1000;
			else if (unit === 'h') intervalMs = value * 60 * 60 * 1000;
			else if (unit === 'd') intervalMs = value * 24 * 60 * 60 * 1000;
			else intervalMs = value * 60 * 1000;
			if (isNaN(intervalMs) || intervalMs < 1000) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Invalid Interval`, 'Interval must be at least 1 second.'));
			}
			if (scheduledNukes.has(channelId)) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Already Scheduled`, 'A nuke is already scheduled for this channel.'));
			}

			const confirmContainer = new ContainerBuilder();
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.loading} Confirm Scheduled Nuke`)
			);
			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`Are you sure you want to schedule a nuke for <#${channelId}>?\n\n` +
					`**Interval:** ${intervalRaw}\n` +
					`**Message:** ${nukeMsg}`
				)
			);

			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			let userId = null;
			if (message.author && message.author.id) userId = message.author.id;
			else if (message.user && message.user.id) userId = message.user.id;
			else if (message.member && message.member.user && message.member.user.id) userId = message.member.user.id;
			else if (message.member && message.member.id) userId = message.member.id;
			if (!userId) {
				console.error('[nuke add] Could not determine userId', {author: message.author, user: message.user, member: message.member});
				return message.reply(buildNotice(`# ${EMOJIS.error} Internal Error`, 'Could not determine your user ID. Please try again.'));
			}

			let archiveEnabled = false;
			let guildData = await client.db.findOne({ guildId: message.guildId });
			if (guildData && guildData.moderation && guildData.moderation.nukeArchive && guildData.moderation.nukeArchive[channelId]) {
				archiveEnabled = true;
			}
			confirmContainer.addActionRowComponents((row) => {
				const confirmBtn = new ButtonBuilder()
					.setCustomId(`nukeadd_confirm_${userId}_${channelId}_${intervalRaw}`)
					.setLabel('Confirm')
					.setStyle(ButtonStyle.Danger);
				const cancelBtn = new ButtonBuilder()
					.setCustomId(`nukeadd_cancel_${userId}_${channelId}`)
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Secondary);
				if (archiveEnabled) {
					const pinsBtn = new ButtonBuilder()
						.setCustomId(`nukeadd_pins_${userId}_${channelId}`)
						.setLabel('Download Pins')
						.setStyle(ButtonStyle.Primary);
					row.setComponents(confirmBtn, cancelBtn, pinsBtn);
				} else {
					row.setComponents(confirmBtn, cancelBtn);
				}
				return row;
			});

			const sentMsg = await message.reply({
				components: [confirmContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			if (!client.nukeAddConfirmations) client.nukeAddConfirmations = new Map();
			client.nukeAddConfirmations.set(`nukeadd_confirm_${userId}_${channelId}_${intervalRaw}`, {
				authorId: userId,
				channelId,
				intervalMs,
				intervalRaw,
				nukeMsg,
				originalMsgId: sentMsg.id
			});
			client.nukeAddConfirmations.set(`nukeadd_cancel_${userId}_${channelId}`, {
				authorId: userId,
				channelId,
				originalMsgId: sentMsg.id
			});
			return;
		}

		if (sub === 'remove') {
			if (!message.member.permissions.has('Administrator')) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'Administrator permission required.'));
			}
			if (!args[1]) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: nuke remove <channel>'));
			}
			const channelMention = args[1];
			const channelId = channelMention.replace(/[^0-9]/g, '');
			if (!scheduledNukes.has(channelId)) {
				return message.reply(buildNotice(`# ${EMOJIS.error} Not Scheduled`, 'No nuke scheduled for this channel.'));
			}
			const nuke = scheduledNukes.get(channelId);
			clearTimeout(nuke.timeout);
			scheduledNukes.delete(channelId);
			return message.reply(buildNotice(`# ${EMOJIS.success} Nuke Removed`, `Scheduled nuke for <#${channelId}> has been cancelled.`));
		}

		const hasAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
		const hasAntinukeAdmin = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'antinukeadmin');

		if (!hasAdmin && !hasAntinukeAdmin) {
			return message.reply(buildNotice(
				`# ${EMOJIS.error} Missing Permissions`,
				getModerationPermissionErrors.insufficient_permissions
			));
		}

		const channel = message.channel;
		if (!channel || channel.type !== ChannelType.GuildText) {
			return message.reply(buildNotice(
				`# ${EMOJIS.error} Invalid Channel`,
				'This command can only be used in text channels.'
			));
		}

		const confirmContainer = new ContainerBuilder();
		confirmContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${EMOJIS.loading} Confirm Channel Nuke`)
		);
		confirmContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		confirmContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`Are you sure you want to nuke (clone and delete) this channel?\n\n` +
				`**This action is irreversible.**\n\n` +
				`Channel: <#${channel.id}>`
			)
		);

		let archiveEnabled = false;
		let guildData = await client.db.findOne({ guildId: message.guildId });

		if (!guildData) guildData = { guildId: message.guildId, moderation: {} };
		if (!guildData.moderation) guildData.moderation = {};
		if (!guildData.moderation.nukeArchive) {
			guildData.moderation.nukeArchive = {};

			await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } });
		}
		if (guildData.moderation.nukeArchive[channel.id]) {
			archiveEnabled = true;
		}

		confirmContainer.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		confirmContainer.addActionRowComponents((row) => {
			const confirmBtn = new ButtonBuilder()
				.setCustomId(`nuke_confirm_${message.author.id}_${channel.id}`)
				.setLabel('Confirm')
				.setStyle(ButtonStyle.Danger);
			const cancelBtn = new ButtonBuilder()
				.setCustomId(`nuke_cancel_${message.author.id}_${channel.id}`)
				.setLabel('Cancel')
				.setStyle(ButtonStyle.Secondary);
			if (archiveEnabled) {
				const pinsBtn = new ButtonBuilder()
					.setCustomId(`nukeadd_pins_${message.author.id}_${channel.id}`)
					.setLabel('Download Pins')
					.setStyle(ButtonStyle.Primary);
				row.setComponents(confirmBtn, cancelBtn, pinsBtn);
			} else {
				row.setComponents(confirmBtn, cancelBtn);
			}
			return row;
		});

			const sentMsg = await message.reply({
				components: [confirmContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		if (!client.nukeConfirmations) client.nukeConfirmations = new Map();
		client.nukeConfirmations.set(`nuke_confirm_${message.author.id}_${channel.id}`, {
			authorId: message.author.id,
			channelId: channel.id,
			originalMsgId: sentMsg.id
		});
		client.nukeConfirmations.set(`nuke_cancel_${message.author.id}_${channel.id}`, {
			authorId: message.author.id,
			channelId: channel.id,
			originalMsgId: sentMsg.id
		});
	}
};
