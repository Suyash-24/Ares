import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'warnings',
	description: 'View warnings for a user',
	usage: 'warnings [user]',
	category: 'Moderation',

	async execute(message, args, client) {

		const { ModerationPermissions, getModerationPermissionErrors } = await import('../../../utils/ModerationPermissions.js');
		const canUse = await ModerationPermissions.canUseCommand(message.member, 'warnings', client, message.guildId);
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

		let target;
		let requestedPage = 0;

		if (!args.length) {
			target = message.author;
		} else {
			try {
				target = await message.guild.members.fetch(args[0].replace(/[<@!>]/g, ''));
				target = target.user;

				if (args[1]) {
					requestedPage = parseInt(args[1]) || 0;
				}
			} catch {
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
		}

		try {
			if (!client.db) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ Error`)
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

			if (!guildData || !guildData.moderation || !guildData.moderation.warnings) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ No Warnings`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${target.username} has no warnings.`)
				);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const userWarnings = guildData.moderation.warnings.filter(w => w.userId === target.id && !w.deletedFromWarnings);

		if (userWarnings.length === 0) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ⚠️ No Warnings`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`${target.username} has no warnings.`)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const allActions = guildData.moderation.actions || [];
		const userWarnActions = allActions.filter(a => a.type === 'warn' && a.userId === target.id && !a.deletedFromCrimefile);

		const warningsWithCaseData = userWarnings.map(warning => {

			const matchingAction = userWarnActions.find(a =>
				new Date(a.timestamp).getTime() === new Date(warning.timestamp).getTime()
			) || userWarnActions.find(a =>
				Math.abs(new Date(a.timestamp).getTime() - new Date(warning.timestamp).getTime()) < 1000
			);

			return {
				...warning,
				caseNumber: matchingAction?.caseNumber || '?',
				currentReason: matchingAction?.reason || warning.reason
			};
		});

		const WARNINGS_PER_PAGE = 3;
		const sortedWarnings = warningsWithCaseData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).reverse();
		const totalPages = Math.ceil(sortedWarnings.length / WARNINGS_PER_PAGE);
		const currentPage = Math.min(Math.max(0, requestedPage), totalPages - 1);

		const buildWarningPage = (pageNum) => {
			const startIdx = pageNum * WARNINGS_PER_PAGE;
			const endIdx = startIdx + WARNINGS_PER_PAGE;
			const pageWarnings = sortedWarnings.slice(startIdx, endIdx);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ⚠️ Warnings for ${target.username}`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			pageWarnings.forEach((warning, index) => {
				const timestamp = Math.floor(new Date(warning.timestamp).getTime() / 1000);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**⚠️ #${warning.caseNumber} WARNING**`)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**Moderator:** <@${warning.moderatorId}>\n**Reason:** ${warning.currentReason}\n**Date:** <t:${timestamp}:F>`)
				);

				if (index < pageWarnings.length - 1) {
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
				}
			});

			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total:** ${userWarnings.length} warning${userWarnings.length === 1 ? '' : 's'}`)
			);

			if (totalPages > 1) {
				container.addActionRowComponents((row) => {
					const prevBtn = new ButtonBuilder()
						.setCustomId(`warnings_prev_${message.author.id}_${target.id}_${pageNum - 1}`)
						.setEmoji(EMOJIS.pageprevious)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(pageNum === 0);

					const nextBtn = new ButtonBuilder()
						.setCustomId(`warnings_next_${message.author.id}_${target.id}_${pageNum + 1}`)
						.setEmoji(EMOJIS.pagenext)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(pageNum >= totalPages - 1);

					row.setComponents(prevBtn, nextBtn);
					return row;
				});
			}

			return container;
		};

		const initialContainer = buildWarningPage(currentPage);
		await message.reply({
			components: [initialContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});		} catch (error) {
			console.error('Error in warnings command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while retrieving warnings.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
