import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vcmuteall';
const aliases = ['voicemuteall', 'muteall'];
const description = 'Server mutes all members in the current voice channel.';
const usage = 'vcmuteall [channelID]';
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

	let channel;

	if (args[0]) {
		const channelId = args[0].replace(/\D/g, '');
		channel = message.guild.channels.cache.get(channelId);

		if (!channel || !channel.isVoiceBased()) {
			container.addTextDisplayComponents(td =>
				td.setContent(`${EMOJIS.error || '❌'} Invalid voice channel ID provided.`)
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	} else {

		channel = message.member.voice.channel;
	}

	if (!channel) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need to be in a voice channel or provide a valid voice channel ID.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const membersToMute = channel.members.filter(m => !m.user.bot && !m.voice.serverMute && m.id !== message.author.id);

	if (membersToMute.size === 0) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.info || 'ℹ️'} There are no members to mute in **${channel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let successCount = 0;
	let failCount = 0;

	const promises = membersToMute.map(async (member) => {

		if (message.author.id !== message.guild.ownerId &&
			message.member.roles.highest.position <= member.roles.highest.position) {
			failCount++;
			return;
		}

		try {
			await member.voice.setMute(true, `Mute all by ${message.author.tag}`);
			successCount++;
		} catch (e) {
			failCount++;
		}
	});

	await Promise.all(promises);

	let content = `${EMOJIS.success || '✅'} Server muted **${successCount}** members in **${channel.name}**.`;
	if (failCount > 0) {
		content += `\n${EMOJIS.error || '❌'} Failed to mute **${failCount}** members due to permissions/hierarchy.`;
	}

	container.addTextDisplayComponents(td => td.setContent(content));
	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
