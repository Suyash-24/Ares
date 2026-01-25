import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { loadSavedRoles, deleteSavedRoles, hasSavedRoles } from '../../../utils/roleStorage.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

const resolveMember = async (guild, input) => {
	if (!input) return null;
	const clean = input.replace(/[<@!>]/g, '');

	try {
		return await guild.members.fetch(clean);
	} catch (error) {
		return null;
	}
};

export default {
	name: 'role restore',
	description: 'Restore roles to a member',
	usage: 'role restore <member>',
	category: 'Moderation',

	async execute(message, args, client) {

		const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
		const isOwner = message.guild.ownerId === message.author.id;
		const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
		const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
		const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

		if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need **Discord Administrator** + **Antinuke Admin** permissions.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args.length) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role restore <member>\``)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Roles** and **Manage Server** permissions.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const botMember = message.guild.members.me;
		if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I do not have permission to manage roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const targetMember = await resolveMember(message.guild, args[0]);
		if (!targetMember) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Member Not Found`, 'Could not find the specified member.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!hasSavedRoles(message.guild.id, targetMember.id)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} No Saved Roles`, 'This member has no saved roles to restore.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const savedRoleIds = loadSavedRoles(message.guild.id, targetMember.id);
		const botHighest = botMember.roles.highest?.position ?? 0;

		const validRoles = [];
		const skippedRoles = [];

		for (const roleId of savedRoleIds) {
			const role = message.guild.roles.cache.get(roleId);

			if (!role) {
				skippedRoles.push(roleId);
				continue;
			}

			if (role.position >= botHighest) {
				skippedRoles.push(roleId);
				continue;
			}

			if (!targetMember.roles.cache.has(roleId)) {
				validRoles.push(role);
			}
		}

		if (validRoles.length === 0) {
			deleteSavedRoles(message.guild.id, targetMember.id);
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} No Valid Roles`, 'No valid roles could be restored (all deleted or too high).')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			markCommandInvoker(message.guild.id, 'rolerestore', targetMember.id, message.author);
			await targetMember.roles.add(validRoles);
			deleteSavedRoles(message.guild.id, targetMember.id);

			let description = `**Member:** <@${targetMember.id}>\n**Restored:** ${validRoles.length}`;
			if (skippedRoles.length > 0) {
				description += `\n**Skipped:** ${skippedRoles.length}`;
			}

			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Roles Restored`,
						description
					)
				],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Restoration Failed`, 'An error occurred while restoring roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
