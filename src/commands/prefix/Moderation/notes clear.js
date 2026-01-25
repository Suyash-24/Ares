import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

export default {
	name: 'notes clear',
	description: 'Clears all notes for a member',
	usage: 'notes clear <member>',
	category: 'Moderation',

	async execute(message, args, client) {
		const effectiveArgs = args[0]?.toLowerCase() === 'clear' ? args.slice(1) : args;

		if (effectiveArgs.length < 1) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Please specify a member.\nUsage: \`${client.prefix}notes clear <member>\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'warn', client, message.guildId);
		if (!canUse.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(getModerationPermissionErrors[canUse.reason])
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const target = await parseUserInput(effectiveArgs[0], message.guild, client);
		if (!target) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ User Not Found`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Could not find the specified user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			if (!client.db) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('Database connection not available.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const guildData = await client.db.findOne({ guildId: message.guildId });

			if (!guildData?.moderation?.notes?.[target.id] || guildData.moderation.notes[target.id].length === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ℹ️ No Notes`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} has no notes to clear.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const notesCount = guildData.moderation.notes[target.id].length;
			delete guildData.moderation.notes[target.id];

			markCommandInvoker(message.guild.id, 'notesclear', target.id, message.author);
			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: guildData }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ✅ Notes Cleared`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Member:** ${formatUserDisplay(target.user)}\n` +
					`**Notes Cleared:** ${notesCount}`
				)
			);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_NOTE_CLEAR, {
				executor: message.author,
				target: target.user,
				noteCount: notesCount,
				thumbnail: target.user.displayAvatarURL({ dynamic: true })
			});

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in notes clear command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while clearing notes.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
