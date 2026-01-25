import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vckick';
const aliases = ['voicekick', 'disconnectuser'];
const description = 'Kicks a member from the voice channel.';
const usage = 'vckick <user>';
const permissions = [PermissionFlagsBits.MuteMembers];

function hasPerms(member, perm) {
	return member.id === member.guild.ownerId ||
		   member.permissions.has(perm) ||
		   member.permissions.has(PermissionFlagsBits.Administrator) ||
		   member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	if (!hasPerms(message.member, PermissionFlagsBits.MuteMembers)) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need **Mute Members** permission to use this command.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let targetMember;
	if (message.mentions.members.size > 0) {
		targetMember = message.mentions.members.first();
	} else if (args[0]) {
		try {
			const targetId = args[0].replace(/\D/g, '');
			if (targetId) {
				targetMember = await message.guild.members.fetch(targetId);
			} else {
				targetMember = null;
			}
		} catch (e) {
			targetMember = null;
		}
	}

	if (!targetMember) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please specify a valid member to kick from voice.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!targetMember.voice.channel) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} **${targetMember.user.username}** is not in a voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (targetMember.id === message.guild.ownerId && message.author.id !== message.guild.ownerId) {
		 container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You cannot kick the server owner from voice.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	 if (message.author.id !== message.guild.ownerId &&
		message.member.roles.highest.position <= targetMember.roles.highest.position) {
		 container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You cannot kick this member due to role hierarchy.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {

		const oldChannelName = targetMember.voice.channel.name;
		await targetMember.voice.setChannel(null, `Voice kicked by ${message.author.tag}`);

		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.success || '✅'} **${targetMember.user.username}** has been kicked from **${oldChannelName}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });

	} catch (error) {
		console.error(error);
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Failed to kick member from voice. I might not have permission.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
