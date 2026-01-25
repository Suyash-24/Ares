import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { cleanupExpiredTemporaryRoles } from '../../../utils/temporaryRoleManager.js';

export default {
	name: 'temprole list',
	description: 'List all active temporary roles',
	usage: 'temprole list',
	category: 'Moderation',

	async execute(message, args, client) {
		try {
			let guildData = await cleanupExpiredTemporaryRoles(client, message.guildId);
			if (!guildData) {
				guildData = await client.db.findOne({ guildId: message.guildId });
			}

			if (!guildData || !guildData.temporaryRoles || guildData.temporaryRoles.length === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.info || 'ℹ️'} No Active Temporary Roles`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('There are no active temporary roles in this server.')
				);
				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const now = new Date();
			const activeRoles = guildData.temporaryRoles.filter(tr => new Date(tr.expiresAt) > now);

			if (activeRoles.length === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.info || 'ℹ️'} No Active Temporary Roles`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('There are no active temporary roles in this server.')
				);
				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.info || 'ℹ️'} Active Temporary Roles (${activeRoles.length})`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			for (let i = 0; i < activeRoles.length; i++) {
				const tempRole = activeRoles[i];
				try {
					const member = await message.guild.members.fetch(tempRole.userId).catch(() => null);
					const role = await message.guild.roles.fetch(tempRole.roleId).catch(() => null);
					const assignedBy = await client.users.fetch(tempRole.assignedBy).catch(() => null);

					if (member && role) {
						const expiresAt = new Date(tempRole.expiresAt);
						const timeLeft = expiresAt - now;
						const hours = Math.floor(timeLeft / (1000 * 60 * 60));
						const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

						container.addTextDisplayComponents((textDisplay) =>
							textDisplay.setContent(
								`**${member.user.username}** — ${role.name}\n` +
								`├ Expires: ${hours}h ${minutes}m\n` +
								`└ Assigned by: ${assignedBy?.username || 'Unknown'}`
							)
						);

						if (i < activeRoles.length - 1) {
							container.addSeparatorComponents((separator) =>
								separator.setSpacing(SeparatorSpacingSize.Small)
							);
						}
					}
				} catch (error) {
					console.error('Error fetching temp role details:', error);
				}
			}

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in temprole list command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error || '❌'} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Failed to retrieve temporary roles.')
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
