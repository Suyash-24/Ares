import { PermissionFlagsBits } from 'discord.js';

export class ModerationPermissions {
	static PERMISSION_LEVELS = {
		SUPPORT: 'support',
		MOD: 'mod',
		HEADMOD: 'headmod'
	};

	static ROLE_COMMANDS = {
		support: ['warn', 'delete'],
		mod: ['warn', 'delete', 'kick', 'mute', 'unmute', 'imute', 'iunmute', 'rmute', 'runmute', 'warnings', 'crimefile', 'modhistory', 'modstats'],
		headmod: ['warn', 'delete', 'kick', 'mute', 'unmute', 'imute', 'iunmute', 'rmute', 'runmute', 'ban', 'unban', 'clearwarnings', 'detain', 'warnings', 'crimefile', 'modhistory', 'modstats']
	};

	static DISCORD_PERMISSIONS = {
		support: [PermissionFlagsBits.ManageMessages],
		mod: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers],
		headmod: [PermissionFlagsBits.Administrator]
	};

	static async hasDefaultPermission(member, permissionBits) {
		if (!Array.isArray(permissionBits)) {
			permissionBits = [permissionBits];
		}
		return permissionBits.some(perm => member.permissions.has(perm));
	}

	static async hasCustomRole(member, client, guildId, level) {
		try {
			if (!client.db) {
				return false;
			}

			const guildData = await client.db.findOne({ guildId });

			if (!guildData || !guildData.moderation) {
				return false;
			}

			const roleField = `${level}Roles`;
			const roleIds = guildData.moderation[roleField] || [];

			if (roleIds.length === 0) {
				return false;
			}

			return member.roles.cache.some(role => roleIds.includes(role.id));
		} catch (error) {
			console.error('Error checking custom role:', error);
			return false;
		}
	}

	static getHighestRole(member) {
		if (member.guild && member.id === member.guild.ownerId) {
			return { position: Infinity, isOwner: true };
		}
		return member.roles.highest;
	}

	static compareRoles(role1, role2) {
		if (!role1 || !role2) return 0;

		const pos1 = role1.position || (role1.isOwner ? Infinity : 0);
		const pos2 = role2.position || (role2.isOwner ? Infinity : 0);

		if (pos1 > pos2) return 1;
		if (pos1 < pos2) return -1;
		return 0;
	}

	static async validateModerator(moderator, target, client, guildId, level) {
		if (moderator.id === target.id) {
			return { valid: false, reason: 'cannot_moderate_self' };
		}

		const moderatorHighest = this.getHighestRole(moderator);
		const targetHighest = this.getHighestRole(target);

		if (!targetHighest) {
			return { valid: true };
		}

		const guild = target.guild || moderator.guild;
		if (!guild || !guild.members.me) {
			return { valid: true };
		}

		const botHighest = guild.members.me.roles.highest;

		if (this.compareRoles(targetHighest, moderatorHighest) >= 0) {
			return { valid: false, reason: 'target_role_too_high' };
		}

		if (this.compareRoles(targetHighest, botHighest) >= 0) {
			return { valid: false, reason: 'bot_cannot_moderate' };
		}

		return { valid: true };
	}

	static async validatePermission(member, target, client, guildId, level) {
		const discordPerms = this.DISCORD_PERMISSIONS[level];

		const hasDefaultPerm = await this.hasDefaultPermission(member, discordPerms);
		const hasCustomRole = await this.hasCustomRole(member, client, guildId, level);

		if (!hasDefaultPerm && !hasCustomRole) {
			return { allowed: false, reason: 'insufficient_permissions' };
		}

		const hierarchyCheck = await this.validateModerator(member, target, client, guildId, level);
		if (!hierarchyCheck.valid) {
			return { allowed: false, reason: hierarchyCheck.reason };
		}

		return { allowed: true };
	}

	static async canUseCommand(member, commandName, client, guildId) {

		if (member.id === member.guild.ownerId) {
			return { allowed: true, reason: 'owner' };
		}

		if (member.permissions.has('ManageMessages')) {
			return { allowed: true, reason: 'discord_permission' };
		}

		const roleOrder = ['headmod', 'mod', 'support'];

		for (const role of roleOrder) {
			const hasRole = await this.hasCustomRole(member, client, guildId, role);
			if (hasRole) {
				const allowedCommands = this.ROLE_COMMANDS[role] || [];
				if (allowedCommands.includes(commandName.toLowerCase())) {
					return { allowed: true, reason: role };
				} else {
					return { allowed: false, reason: 'command_not_allowed_for_role' };
				}
			}
		}

		return { allowed: false, reason: 'no_moderation_role' };
	}
}

export const getModerationPermissionErrors = {
	insufficient_permissions: 'You do not have permission to perform this action.',
	cannot_moderate_self: 'You cannot moderate yourself.',
	target_role_too_high: 'The target user has a higher or equal role than you.',
	bot_cannot_moderate: 'The target user has a role equal to or higher than mine.',
	invalid_duration: 'Invalid duration provided.',
	invalid_reason: 'Invalid reason provided.',
	user_not_found: 'User not found.',
	action_failed: 'Action failed. Please try again.',
	command_not_allowed_for_role: 'Your role does not have permission to use this command.',
	no_moderation_role: 'You do not have a moderation role.'
};
