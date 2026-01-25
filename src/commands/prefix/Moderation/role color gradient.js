import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

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

const formatRole = (role) => `<@&${role.id}>`;

const parseColor = (colorString) => {
	if (!colorString) return null;
	const hex = colorString.startsWith('#') ? colorString : `#${colorString}`;
	return parseInt(hex.replace('#', ''), 16);
};

export default {
	name: 'role color gradient',
	description: 'Set a gradient color for a role',
	usage: 'role color gradient <role> <color1> <color2>',
	category: 'Moderation',

	async execute(message, args) {
		if (args.length < 3) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role color gradient <role> <color1> <color2>\``)],
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

		const role = resolveRole(message.guild, args[0]);
		if (!role) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.managed) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Managed Role`, 'I cannot edit managed roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const executorHighest = message.member.roles.highest?.position ?? 0;
		const botHighest = botMember.roles.highest?.position ?? 0;

		if (role.position >= executorHighest && message.member.id !== message.guild.ownerId) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below your highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.position >= botHighest) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below my highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const color1 = parseColor(args[1]);
		const color2 = parseColor(args[2]);

		if (color1 === null || isNaN(color1) || color2 === null || isNaN(color2)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Invalid Colors`, 'Please provide valid hex colors (e.g., #FF5733 or FF5733).')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const r1 = (color1 >> 16) & 255;
		const g1 = (color1 >> 8) & 255;
		const b1 = color1 & 255;

		const r2 = (color2 >> 16) & 255;
		const g2 = (color2 >> 8) & 255;
		const b2 = color2 & 255;

		const avgR = Math.floor((r1 + r2) / 2);
		const avgG = Math.floor((g1 + g2) / 2);
		const avgB = Math.floor((b1 + b2) / 2);

		const blendedColor = (avgR << 16) + (avgG << 8) + avgB;

		try {
			markCommandInvoker(message.guild.id, 'rolecolorgradient', role.id, message.author);
			await role.edit({ color: blendedColor });
			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Gradient Color Applied`,
						`**Role:** ${formatRole(role)}\n**Color 1:** #${color1.toString(16).toUpperCase().padStart(6, '0')}\n**Color 2:** #${color2.toString(16).toUpperCase().padStart(6, '0')}\n**Blended:** #${blendedColor.toString(16).toUpperCase().padStart(6, '0')}`
					)
				],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Edit Failed`, 'An error occurred while updating the role color.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
