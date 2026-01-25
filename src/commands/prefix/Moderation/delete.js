import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';
import { markMessageAsAresDeleted, markCommandInvoker } from '../../../events/loggingEvents.js';

export default {
	name: 'delete',
	description: 'Delete messages with various filters',
	usage: 'delete <amount> [filters] - Filters: bots, humans, links, embeds, files, images, stickers, emojis, mentions, reactions, webhooks, activity, contains:<text>, startswith:<text>, endswith:<text>, before:<messageId>, after:<messageId>, between:<id1>-<id2>, upto:<messageId>',
	category: 'Moderation',

	async execute(message, args, client) {
		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`**Usage:** \`${client.prefix}delete <1-100> [filters] [user]\`\n**OR for ID filters:** \`${client.prefix}delete before:<msgId>\` or \`after:<msgId>\` etc\n\n**Available Filters:**\n• bots, humans, webhooks\n• links, embeds, files, images, stickers, emojis, mentions, reactions\n• activity (bot/system activity)\n• contains:<text> - messages containing text\n• startswith:<text>, endswith:<text>\n• before:<msgId>, after:<msgId>, between:<id1>-<id2>, upto:<msgId>`)
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'delete', client, message.guildId);
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

		const hasIdFilter = args[0].includes(':') && (
			args[0].startsWith('before:') ||
			args[0].startsWith('after:') ||
			args[0].startsWith('between:') ||
			args[0].startsWith('upto:')
		);

		let amount = 100;
		let startIndex = 0;

		if (!hasIdFilter) {

			amount = parseInt(args[0]);
			if (isNaN(amount) || amount < 2 || amount > 100) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Invalid Amount`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('You can delete between 2-100 messages.')
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
			startIndex = 1;
		}

		let filters = {};
		let targetUser = null;

		for (let i = startIndex; i < args.length; i++) {
			const arg = args[i];

			if (arg.includes(':')) {
				const [key, value] = arg.split(':');
				filters[key.toLowerCase()] = value;
			} else if (arg.startsWith('-')) {

				continue;
			} else {

				try {
					targetUser = await message.guild.members.fetch(arg.replace(/[<@!>]/g, ''));
				} catch {

					filters[arg.toLowerCase()] = true;
				}
			}
		}

		if (!message.channel.permissionsFor(message.guild.members.me).has('ManageMessages')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to manage messages in this channel.')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
			const sixHoursAgo = Date.now() - SIX_HOURS_MS;

			const messages = await message.channel.messages.fetch({ limit: 100 });
			let toDelete = [];

			let recentMessages = messages.filter(msg => msg.createdTimestamp >= sixHoursAgo && msg.id !== message.id);

			recentMessages = recentMessages.filter(msg => {

				if (targetUser && msg.author.id !== targetUser.id) return false;

				if (filters.bots && !msg.author.bot) return false;

				if (filters.humans && msg.author.bot) return false;

				if (filters.webhooks && msg.webhookId === null) return false;

				if (filters.links && !/(https?:\/\/[^\s]+)/g.test(msg.content)) return false;

				if (filters.embeds && msg.embeds.length === 0) return false;

				if (filters.files && msg.attachments.size === 0) return false;

				if (filters.images) {
					const hasImages = msg.attachments.some(att => att.contentType?.startsWith('image/'));
					if (!hasImages) return false;
				}

				if (filters.stickers && msg.stickers.size === 0) return false;

				if (filters.emojis && !/<a?:\w+:\d+>/g.test(msg.content)) return false;

				if (filters.mentions && msg.mentions.size === 0 && msg.mentions.has(message.guild.members.me.id) === false) return false;

				if (filters.reactions && msg.reactions.cache.size === 0) return false;

				if (filters.activity && msg.author.bot === false && msg.type === 'Default') return false;

				if (filters.contains && !msg.content.toLowerCase().includes(filters.contains.toLowerCase())) return false;

				if (filters.startswith && !msg.content.toLowerCase().startsWith(filters.startswith.toLowerCase())) return false;

				if (filters.endswith && !msg.content.toLowerCase().endsWith(filters.endswith.toLowerCase())) return false;

				return true;
			});

			if (filters.before) {
				recentMessages = recentMessages.filter(msg => BigInt(msg.id) < BigInt(filters.before));
			}

			if (filters.after) {
				recentMessages = recentMessages.filter(msg => BigInt(msg.id) > BigInt(filters.after));
			}

			if (filters.between) {
				const [id1, id2] = filters.between.split('-');
				const min = BigInt(Math.min(id1, id2));
				const max = BigInt(Math.max(id1, id2));
				recentMessages = recentMessages.filter(msg => {
					const msgId = BigInt(msg.id);
					return msgId >= min && msgId <= max;
				});
			}

			if (filters.upto) {
				recentMessages = recentMessages.filter(msg => BigInt(msg.id) <= BigInt(filters.upto));
			}

			toDelete = Array.from(recentMessages.values())
				.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
				.slice(0, amount);

			if (toDelete.length === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚠️ No Messages Found`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('No messages found matching the filters within the last 6 hours.')
				);

				const reply = await message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});

				setTimeout(() => {
					markMessageAsAresDeleted(message.id);
					message.delete().catch(() => {});
					markMessageAsAresDeleted(reply.id);
					reply.delete().catch(() => {});
				}, 5000);
				return;
			}

			for (const msg of toDelete) {
				markMessageAsAresDeleted(msg.id);
			}

			markCommandInvoker(message.guild.id, 'delete', message.channel.id, message.author);
			const deleted = await message.channel.bulkDelete(toDelete, true);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.delete || '🗑️'} Messages Deleted`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			let info = `**Deleted:** ${deleted.size} message${deleted.size === 1 ? '' : 's'} `;
			if (targetUser) {
				info += `\n**From:** ${targetUser.user.username}`;
			}
			if (Object.keys(filters).length > 0) {
				info += `\n**Filters Applied:** ${Object.keys(filters).join(', ')}`;
			}

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(info)
			);

			const reply = await message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			setTimeout(() => {
				markMessageAsAresDeleted(message.id);
				message.delete().catch(() => {});
				markMessageAsAresDeleted(reply.id);
				reply.delete().catch(() => {});
			}, 5000);

		} catch (error) {
			console.error('Error in delete command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while deleting messages.')
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
