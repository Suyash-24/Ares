import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vcpull';
const aliases = ['voicepull', 'pull'];
const description = 'Pulls a user to your current voice channel.';
const usage = 'vcpull <user>';
const permissions = [PermissionFlagsBits.MoveMembers];

function hasPerms(member, perm) {
	return member.id === member.guild.ownerId ||
		   member.permissions.has(perm) ||
		   member.permissions.has(PermissionFlagsBits.Administrator) ||
		   member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	if (!hasPerms(message.member, PermissionFlagsBits.MoveMembers)) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need **Move Members** permission to use this command.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const destinationChannel = message.member.voice.channel;
	if (!destinationChannel) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need to be in a voice channel to pull someone.`)
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
			td.setContent(`${EMOJIS.error || '❌'} Please specify a valid member to pull.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!targetMember.voice.channel) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} **${targetMember.user.username}** is not in a voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (targetMember.voice.channel.id === destinationChannel.id) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} **${targetMember.user.username}** is already in your channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (targetMember.id === message.guild.ownerId && message.author.id !== message.guild.ownerId) {
		 container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You cannot pull the server owner.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	 if (message.author.id !== message.guild.ownerId &&
		message.member.roles.highest.position <= targetMember.roles.highest.position) {
		 container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You cannot pull this member due to role hierarchy.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {
		const oldChannelName = targetMember.voice.channel ? targetMember.voice.channel.name : 'Unknown';
		await targetMember.voice.setChannel(destinationChannel, `Pulled by ${message.author.tag}`);

		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.success || '✅'} Pulled **${targetMember.user.username}** from **${oldChannelName}** to **${destinationChannel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });

	} catch (error) {
		console.error(error);
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Failed to pull member.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
