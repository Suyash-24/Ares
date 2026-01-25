import { PermissionFlagsBits } from 'discord.js';
import runCascadeCommand from './cascadeHelper.js';

export default {
	name: 'cascade remove',
	description: 'Remove a target role from members who have a base role',
	usage: 'cascade remove <base role> <target role>',
	category: 'Moderation',

	async execute(message, args, client) {

		const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
		const isOwner = message.guild.ownerId === message.author.id;
		const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
		const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
		const hasDiscordAdmin = message.member?.permissions?.has('Administrator');

		if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
			const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
			const EMOJIS = (await import('../../../utils/emojis.js')).default;
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`));
			container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('You need **Discord Administrator** + **Antinuke Admin** permissions.'));
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		return runCascadeCommand(message, args, 'remove');
	}
};
