import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';

const ITEMS_PER_PAGE_JSON = 3;
const ITEMS_PER_PAGE_OTHER = 10;

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

const resolveRole = (guild, input) => {
	if (!input) return null;
	const clean = input.replace(/[<@&#>]/g, '');
	let role = guild.roles.cache.get(clean);
	if (!role) {
		role = guild.roles.cache.find((r) => r.name.toLowerCase() === input.toLowerCase());
	}
	return role;
};

const formatAsText = (members) => {
	return members.map(m => `${m.user.username}#${m.user.discriminator}`).join('\n');
};

const formatAsIds = (members) => {
	return members.map(m => m.user.id).join('\n');
};

const formatAsMentions = (members) => {
	return members.map(m => `<@${m.user.id}>`).join('\n');
};

const formatAsCsv = (members) => {
	const header = 'id,username\n';
	const rows = members.map(m => `${m.user.id},${m.user.username}`).join('\n');
	return header + rows;
};

const formatAsJson = (members) => {
	const data = members.map(m => ({
		id: m.user.id,
		username: m.user.username,
		discriminator: m.user.discriminator,
		avatar: m.user.avatar
	}));
	return JSON.stringify(data, null, 2);
};

export default {
	name: 'snapshot',
	description: 'Export all members with a specified role in different formats',
	usage: 'snapshot <role> <format>',
	category: 'Moderation',

	async execute(message, args, client) {

				if (!client._snapshotCooldowns) client._snapshotCooldowns = new Map();
				const cooldownKey = `${message.guildId}_${message.author.id}`;
				const now = Date.now();
				const lastUsed = client._snapshotCooldowns.get(cooldownKey) || 0;
				const COOLDOWN_MS = 60 * 1000;
				if (now - lastUsed < COOLDOWN_MS) {
					const seconds = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
					return message.reply({
						components: [buildNotice(
							`# ${EMOJIS.error} Cooldown`,
							`Please wait ${seconds} more second${seconds !== 1 ? 's' : ''} before using this command again.`
						)],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { repliedUser: false }
					});
				}
				client._snapshotCooldowns.set(cooldownKey, now);
		if (args.length < 2) {
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Missing Arguments`,
					`Usage: \`snapshot <role> <format>\`\nFormats: text, ids, mentions, csv, json`
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const hasDefaultPerm = message.member.permissions.has('ManageRoles');
		const hasHeadmodRole = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');

		if (!hasDefaultPerm && !hasHeadmodRole) {
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Missing Permissions`,
					getModerationPermissionErrors.insufficient_permissions
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me.permissions.has('ManageRoles')) {
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Missing Permissions`,
					'I do not have permission to manage roles.'
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const role = resolveRole(message.guild, args[0]);
		if (!role) {
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Role Not Found`,
					'Could not find the specified role.'
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const format = args[1].toLowerCase();
		const validFormats = ['text', 'ids', 'mentions', 'csv', 'json'];
		if (!validFormats.includes(format)) {
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Invalid Format`,
					`Valid formats: ${validFormats.join(', ')}`
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			await message.guild.members.fetch();
			const membersWithRole = message.guild.members.cache.filter(m => m.roles.cache.has(role.id));

			if (membersWithRole.size === 0) {
				return message.reply({
					components: [buildNotice(
						`# ${EMOJIS.error} No Results`,
						`No members have the ${role.name} role.`
					)],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			if (!client._snapshotCache) client._snapshotCache = new Map();
			const cacheKey = `${message.guildId}_${role.id}_${message.author.id}_${format}`;
			const memberIds = Array.from(membersWithRole.keys());
			client._snapshotCache.set(cacheKey, {
				memberIds,
				created: Date.now(),
				roleName: role.name,
				format,
				authorId: message.author.id
			});

			setTimeout(() => client._snapshotCache.delete(cacheKey), 5 * 60 * 1000);

			const getPage = (pageNum) => {
				let output;
				if (format === 'json') {
					const startIdx = pageNum * ITEMS_PER_PAGE_JSON;
					const endIdx = startIdx + ITEMS_PER_PAGE_JSON;
					const pageIds = memberIds.slice(startIdx, endIdx);
					const pageMembers = pageIds.map(id => message.guild.members.cache.get(id)).filter(Boolean);
					output = JSON.stringify(pageMembers.map(m => ({
						id: m.user.id,
						username: m.user.username,
						discriminator: m.user.discriminator,
						avatar: m.user.avatar
					})), null, 2);
				} else {
					const startIdx = pageNum * ITEMS_PER_PAGE_OTHER;
					const endIdx = startIdx + ITEMS_PER_PAGE_OTHER;
					const pageIds = memberIds.slice(startIdx, endIdx);
					const pageMembers = pageIds.map(id => message.guild.members.cache.get(id)).filter(Boolean);
					switch (format) {
						case 'text':
							output = formatAsText(pageMembers);
							break;
						case 'ids':
							output = formatAsIds(pageMembers);
							break;
						case 'mentions':
							output = formatAsMentions(pageMembers);
							break;
						case 'csv':
							output = 'id,username\n' + pageMembers.map(m => `${m.user.id},${m.user.username}`).join('\n');
							break;
					}

					if (output) {
						const lines = output.split('\n');
						if (format === 'csv' && lines.length > 11) {
							output = lines.slice(0, 11).join('\n');
						} else if (lines.length > 10) {
							output = lines.slice(0, 10).join('\n');
						}
					}
				}
				return output;
			};

			const totalPages = format === 'json'
				? Math.ceil(memberIds.length / ITEMS_PER_PAGE_JSON)
				: Math.ceil(memberIds.length / ITEMS_PER_PAGE_OTHER);
			const currentPage = 0;
			const pageContent = getPage(currentPage);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success} ${role.name} - ${format.toUpperCase()}`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`\`\`\`\n${pageContent}\n\`\`\``)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`**Page:** ${currentPage + 1}/${totalPages} | **Total:** ${memberIds.length} member${memberIds.length !== 1 ? 's' : ''}`)
			);

			if (totalPages > 1) {
				container.addActionRowComponents((row) => {
					const prevBtn = new ButtonBuilder()
						.setCustomId(`snapshot_prev_${message.author.id}_${role.id}_${format}_${currentPage}`)
						.setEmoji(EMOJIS.pageprevious)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage === 0);

					const nextBtn = new ButtonBuilder()
						.setCustomId(`snapshot_next_${message.author.id}_${role.id}_${format}_${currentPage}`)
						.setEmoji(EMOJIS.pagenext)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage >= totalPages - 1);

					const exportBtn = new ButtonBuilder()
						.setCustomId(`snapshot_export_${message.author.id}_${role.id}_${format}`)
						.setLabel('📥 Export')
						.setStyle(ButtonStyle.Secondary);

					row.setComponents(prevBtn, nextBtn, exportBtn);
					return row;
				});
			} else {
				container.addActionRowComponents((row) => {
					const exportBtn = new ButtonBuilder()
						.setCustomId(`snapshot_export_${message.author.id}_${role.id}_${format}`)
						.setLabel('📥 Export')
						.setStyle(ButtonStyle.Secondary);

					row.setComponents(exportBtn);
					return row;
				});
			}

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in snapshot command:', error);
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Error`,
					'An error occurred while generating the snapshot.'
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
