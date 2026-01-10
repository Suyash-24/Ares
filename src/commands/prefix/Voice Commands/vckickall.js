import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vckickall';
const aliases = ['voicekickall', 'disconnectall'];
const description = 'Kicks all members from the current voice channel.';
const usage = 'vckickall [channelID]';
const permissions = [PermissionFlagsBits.MuteMembers];
 
// Helper to check permissions
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
	
	// Check if a channel ID is provided
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
		// Fallback to user's current voice channel
		channel = message.member.voice.channel;
	}

	if (!channel) {
		container.addTextDisplayComponents(td => 
			td.setContent(`${EMOJIS.error || '❌'} You need to be in a voice channel or provide a valid voice channel ID.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	// Filter members: not bot
	// Note: We include the author here. If they run it on their own channel, they usually expect to be kicked too or stay?
	// Usually "kickall" implies clearing the channel. But often the mod stays.
	// Let's filter out the author to be safe and consistent with typical moderation tools, unless they aren't in the channel commands usually protect the invoker?
	// Actually for "kickall", usually it clears everyone. But let's protect the invoker if they are in the channel, 
	// because otherwise they can't see the success message comfortably if they get disconnected immediately.
	
	const membersToKick = channel.members.filter(m => !m.user.bot && m.id !== message.author.id);

	if (membersToKick.size === 0) {
		container.addTextDisplayComponents(td => 
			td.setContent(`${EMOJIS.info || 'ℹ️'} There are no other members to kick from **${channel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let successCount = 0;
	let failCount = 0;

	// Process in parallel
	const promises = membersToKick.map(async (member) => {
		// Hierarchy check
		if (message.author.id !== message.guild.ownerId && 
			message.member.roles.highest.position <= member.roles.highest.position) {
			failCount++;
			return;
		}

		try {
			await member.voice.setChannel(null, `Voice kick all by ${message.author.tag}`);
			successCount++;
		} catch (e) {
			failCount++;
		}
	});

	await Promise.all(promises);

	let content = `${EMOJIS.success || '✅'} Kicked **${successCount}** members from **${channel.name}**.`;
	if (failCount > 0) {
		content += `\n${EMOJIS.error || '❌'} Failed to kick **${failCount}** members due to permissions/hierarchy.`;
	}

	container.addTextDisplayComponents(td => td.setContent(content));
	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
