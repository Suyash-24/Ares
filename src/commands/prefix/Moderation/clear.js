import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

export default {
	name: 'clear',
	description: 'Clear moderation records (warnings, crimefiles, or modhistory)',
	usage: 'clear <warnings|crimefiles|modhistory> <@user|id>',
	category: 'Moderation',

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
				textDisplay.setContent(
					`Please specify a type and user.\n\n` +
					`**Usage:** \`${client.prefix}clear <warnings|crimefiles|modhistory> <@user|id>\`\n\n` +
					`**Examples:**\n` +
					`\`${client.prefix}clear warnings @user\`\n` +
					`\`${client.prefix}clear crimefiles @user\`\n` +
					`\`${client.prefix}clear modhistory @mod\``
				)
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
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
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

		const clearType = args[0].toLowerCase();
		const validTypes = ['warnings', 'crimefiles', 'modhistory'];

		if (!validTypes.includes(clearType)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Invalid Type`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`Please specify a valid type: \`warnings\`, \`crimefiles\`, or \`modhistory\``
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const target = await parseUserInput(args[1], message.guild, client);

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
					textDisplay.setContent('Database is not available.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const guildData = await client.db.findOne({ guildId: message.guildId });

			let countToClear = 0;
			const typeDisplay = clearType === 'warnings' ? '⚠️ Warnings' : clearType === 'crimefiles' ? '🕵️ Crime Files' : '📋 Mod History';

			if (clearType === 'warnings') {
				if (guildData?.moderation?.warnings) {
					countToClear = guildData.moderation.warnings.filter(w => w.userId === target.user.id && !w.deletedFromWarnings).length;
				}
			} else if (clearType === 'crimefiles') {
				if (guildData?.moderation?.actions) {
					countToClear = guildData.moderation.actions.filter(a => a.userId === target.user.id && !a.deletedFromCrimefile).length;
				}
			} else if (clearType === 'modhistory') {
				if (guildData?.moderation?.actions) {
					countToClear = guildData.moderation.actions.filter(a => a.moderator?.id === target.user.id && !a.deletedFromModhistory).length;
				}
			}

			if (countToClear === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ℹ️ Nothing to Clear`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} has no ${clearType} to clear.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const confirmContainer = new ContainerBuilder();
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ⚠️ Confirm Clear ${typeDisplay}`)
			);
			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			confirmContainer.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(target.user)}\n` +
					`**Type:** ${typeDisplay}\n` +
					`**Count:** ${countToClear} record(s) will be cleared\n\n` +
					`Are you sure you want to clear all ${clearType} for this user?`
				)
			);
			confirmContainer.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			confirmContainer.addActionRowComponents((row) => {
				const confirmBtn = new ButtonBuilder()
					.setCustomId(`clear_confirm_${clearType}_${target.user.id}_${message.author.id}`)
					.setLabel('✓ Confirm')
					.setStyle(ButtonStyle.Danger);

				const cancelBtn = new ButtonBuilder()
					.setCustomId(`clear_cancel_${message.author.id}`)
					.setLabel('✗ Cancel')
					.setStyle(ButtonStyle.Secondary);

				row.setComponents(confirmBtn, cancelBtn);
				return row;
			});

			const reply = await message.reply({
				components: [confirmContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			client.clearCommands = client.clearCommands || new Map();
			client.clearCommands.set(`clear_confirm_${clearType}_${target.user.id}_${message.author.id}`, {
				messageId: reply.id,
				clearType,
				targetId: target.user.id,
				targetName: target.user.username,
				count: countToClear,
				typeDisplay
			});

		} catch (error) {
			console.error('Error in clear command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Failed to process clear command.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	},

	components: []
};
