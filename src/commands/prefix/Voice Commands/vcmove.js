import { ContainerBuilder, MessageFlags, PermissionFlagsBits, ChannelType } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vcmove';
const aliases = ['voicemove', 'mv'];
const description = 'Moves a member to a different voice channel.';
const usage = 'vcmove <user> <channel_id>';
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
		} catch (e) { targetMember = null; }
	}

	if (!targetMember) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please specify a valid member to move.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!targetMember.voice.channel) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} **${targetMember.user.username}** is not in a voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let channelArg = message.mentions.members.size > 0 ? args[1] : args[1];

	if (!channelArg) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please specify a destination channel ID.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const targetChannelId = channelArg.replace(/\D/g, '');
	const targetChannel = message.guild.channels.cache.get(targetChannelId);

	if (!targetChannel || !targetChannel.isVoiceBased()) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Invalid destination voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (message.author.id !== message.guild.ownerId &&
		message.member.roles.highest.position <= targetMember.roles.highest.position) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You cannot move this member due to role hierarchy.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {
		await targetMember.voice.setChannel(targetChannel, `Voice move by ${message.author.tag}`);
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.success || '✅'} Moved **${targetMember.user.username}** to **${targetChannel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	} catch (error) {
		console.error(error);
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Failed to move member.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
