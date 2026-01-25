import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';

const formatDate = (timestamp) => {
	if (!timestamp) return 'Unknown';
	const date = new Date(timestamp);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default {
	name: 'notes',
	description: 'View notes on a member',
	usage: 'notes <member>',
	category: 'Moderation',

	async execute(message, args, client) {
		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Please specify a member.\nUsage: \`${client.prefix}notes <member>\``)
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

		let requestedPage = 0;
		const target = await parseUserInput(args[0], message.guild, client);
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

		if (args[1]) {
			requestedPage = parseInt(args[1]) || 0;
		}

		try {
			if (!client.db) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
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
					textDisplay.setContent(`# 📝 Notes for ${target.user.username}`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} has no notes.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const notes = guildData.moderation.notes[target.id];

			const NOTES_PER_PAGE = 3;
			const sortedNotes = notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).reverse();
			const totalPages = Math.ceil(sortedNotes.length / NOTES_PER_PAGE);
			const currentPage = Math.min(Math.max(0, requestedPage), totalPages - 1);

			const buildNotesPage = (pageNum) => {
				const startIdx = pageNum * NOTES_PER_PAGE;
				const endIdx = startIdx + NOTES_PER_PAGE;
				const pageNotes = sortedNotes.slice(startIdx, endIdx);

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# 📝 Notes for ${target.user.username}`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

				pageNotes.forEach((note, index) => {
					const noteNumber = startIdx + index + 1;
					const addedBy = note.addedBy?.username || 'Unknown';
					const date = formatDate(note.timestamp);

					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`**Note #${noteNumber}**`)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(
							`**Content:** ${note.content}\n` +
							`**Added by:** ${addedBy}\n` +
							`**Date:** ${date}`
						)
					);

					if (index < pageNotes.length - 1) {
						container.addSeparatorComponents((separator) =>
							separator.setSpacing(SeparatorSpacingSize.Small)
						);
					}
				});

				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total:** ${notes.length} note${notes.length === 1 ? '' : 's'}`)
				);

				if (totalPages > 1) {
					container.addActionRowComponents((row) => {
						const prevBtn = new ButtonBuilder()
							.setCustomId(`notes_prev_${message.author.id}_${target.id}_${pageNum - 1}`)
							.setEmoji(EMOJIS.pageprevious)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(pageNum === 0);

						const nextBtn = new ButtonBuilder()
							.setCustomId(`notes_next_${message.author.id}_${target.id}_${pageNum + 1}`)
							.setEmoji(EMOJIS.pagenext)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(pageNum >= totalPages - 1);

						row.setComponents(prevBtn, nextBtn);
						return row;
					});
				}

				return container;
			};

			const initialContainer = buildNotesPage(currentPage);
			await message.reply({
				components: [initialContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in notes command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while retrieving notes.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
