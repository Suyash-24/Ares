import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'detainlist',
	description: 'View all detained members in the server',
	usage: 'detainlist [page]',
	category: 'Moderation',

	async execute(message, args, client) {
		let requestedPage = 0;

		if (args[0]) {
			requestedPage = parseInt(args[0]) || 0;
		}

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

			if (!guildData || !guildData.moderation || !guildData.moderation.detains) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.jail || '⛓️'} No Detained Members`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('There are currently no detained members in this server.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const detainedUsers = guildData.moderation.detains;

			if (detainedUsers.length === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.jail || '⛓️'} No Detained Members`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('There are currently no detained members in this server.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const MEMBERS_PER_PAGE = 3;
			const totalPages = Math.ceil(detainedUsers.length / MEMBERS_PER_PAGE);
			const currentPage = Math.min(Math.max(0, requestedPage), totalPages - 1);

			const buildDetainedPage = (pageNum) => {
				const startIdx = pageNum * MEMBERS_PER_PAGE;
				const endIdx = startIdx + MEMBERS_PER_PAGE;
				const pageDetains = detainedUsers.slice(startIdx, endIdx);

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.jail || '⛓️'} Detained Members`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

				pageDetains.forEach((detain, index) => {
					const memberNumber = startIdx + index + 1;
					const expiresAt = Math.floor(detain.expiresAt / 1000);
					const moderator = message.guild.members.cache.get(detain.moderatorId)?.user.username || 'Unknown';
					const timeRemaining = Math.max(0, detain.expiresAt - Date.now());
					const duration = formatDuration(timeRemaining);

					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`**#${memberNumber} - <@${detain.userId}>**`)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(
							`**Moderator:** ${moderator}\n` +
							`**Reason:** ${detain.reason}\n` +
							`**Expires:** <t:${expiresAt}:F> (${duration} remaining)\n` +
							`**Detained At:** <t:${Math.floor(detain.timestamp / 1000)}:F>`
						)
					);

					if (index < pageDetains.length - 1) {
						container.addSeparatorComponents((separator) =>
							separator.setSpacing(SeparatorSpacingSize.Small)
						);
					}
				});

				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total:** ${detainedUsers.length} detained member${detainedUsers.length === 1 ? '' : 's'}`)
				);

				if (totalPages > 1) {
					container.addActionRowComponents((row) => {
						const prevBtn = new ButtonBuilder()
							.setCustomId(`detainlist_prev_${message.author.id}_${pageNum - 1}`)
							.setEmoji(EMOJIS.pageprevious)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(pageNum === 0);

						const nextBtn = new ButtonBuilder()
							.setCustomId(`detainlist_next_${message.author.id}_${pageNum + 1}`)
							.setEmoji(EMOJIS.pagenext)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(pageNum >= totalPages - 1);

						row.setComponents(prevBtn, nextBtn);
						return row;
					});
				}

				return container;
			};

			const initialContainer = buildDetainedPage(currentPage);
			await message.reply({
				components: [initialContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in detainlist command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while retrieving the detained members list.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

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
