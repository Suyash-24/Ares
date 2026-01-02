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

const hasRequiredPerms = (member) =>
	member.permissions.has(PermissionFlagsBits.ManageRoles) && member.permissions.has(PermissionFlagsBits.ManageGuild);

const canManageRole = (member, role) => member.id === member.guild.ownerId || member.roles.highest.position > role.position;

const botCanManageRole = (bot, role) => bot.roles.highest.position > role.position;

const handleRoleValidation = (message, title, description) =>
	message.reply({
		components: [buildNotice(title, description)],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});

export default async function runCascadeCommand(message, args, mode) {
	const keyword = mode === 'add' ? 'add' : 'remove';
	const effectiveArgs = args[0]?.toLowerCase() === keyword ? args.slice(1) : args;
	if (effectiveArgs.length < 2) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Missing Arguments`,
			`Usage: \`cascade ${mode} <base role> <target role>\``
		);
	}

	if (!hasRequiredPerms(message.member)) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Missing Permissions`,
			'You need the **Manage Roles** and **Manage Server** permissions to run this command.'
		);
	}

	const botMember = message.guild.members.me;
	if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Missing Permissions`,
			'I do not have permission to manage roles.'
		);
	}

	const mentionedRoles = message.mentions.roles.size >= 2 ? message.mentions.roles.first(2) : [];
	const baseRole = mentionedRoles[0] || resolveRole(message.guild, effectiveArgs[0]);
	const targetRole = mentionedRoles[1] || resolveRole(message.guild, effectiveArgs[1]);

	if (!baseRole || !targetRole) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Role Not Found`,
			'Ensure both the base role and target role exist.'
		);
	}

	if (baseRole.id === targetRole.id) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Invalid Roles`,
			'Base role and target role must be different.'
		);
	}

	if (baseRole.managed || targetRole.managed) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Managed Role`,
			'I cannot edit managed roles.'
		);
	}

	if (!canManageRole(message.member, targetRole) && message.member.id !== message.guild.ownerId) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Role Too High`,
			'You cannot manage the target role.'
		);
	}

	if (!botCanManageRole(botMember, targetRole)) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Role Too High`,
			'I cannot manage the target role.'
		);
	}

	if (!canManageRole(message.member, baseRole) && message.member.id !== message.guild.ownerId) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Role Too High`,
			'You cannot manage the base role.'
		);
	}

	if (!botCanManageRole(botMember, baseRole)) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} Role Too High`,
			'I cannot interact with the base role.'
		);
	}

	const members = await message.guild.members.fetch();
	const targets = members.filter((member) => member.roles.cache.has(baseRole.id));

	if (!targets.size) {
		return handleRoleValidation(
			message,
			`# ${EMOJIS.error} No Matches`,
			`No members currently have ${formatRole(baseRole)}.`
		);
	}

	const executorHighest = message.member.roles.highest?.position ?? 0;
	const botHighest = botMember.roles.highest?.position ?? 0;

	let processed = targets.size;
	let affected = 0;
	let failures = 0;

	for (const member of targets.values()) {
		const memberTop = member.roles.highest?.position ?? 0;
		if (member.id === message.guild.ownerId) {
			failures++;
			continue;
		}
		if (message.member.id !== message.guild.ownerId && executorHighest <= memberTop) {
			failures++;
			continue;
		}
		if (botHighest <= memberTop) {
			failures++;
			continue;
		}

		if (mode === 'add') {
			if (member.roles.cache.has(targetRole.id)) {
				continue;
			}
			try {
				markCommandInvoker(message.guild.id, 'cascade', member.id, message.author);
				await member.roles.add(targetRole);
				affected++;
			} catch (error) {
				failures++;
			}
		} else {
			if (!member.roles.cache.has(targetRole.id)) {
				continue;
			}
			try {
				markCommandInvoker(message.guild.id, 'cascade', member.id, message.author);
				await member.roles.remove(targetRole);
				affected++;
			} catch (error) {
				failures++;
			}
		}
	}

	return message.reply({
		components: [
			buildNotice(
				`# ${EMOJIS.success} Cascade ${mode === 'add' ? 'Add' : 'Remove'} Complete`,
				`**Base Role:** ${formatRole(baseRole)}\n**Target Role:** ${formatRole(targetRole)}\n**Processed:** ${processed}\n**Affected:** ${affected}\n**Failures:** ${failures}`
			)
		],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}
