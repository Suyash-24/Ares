import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vcundeafenall';
const aliases = ['undeafenall', 'vundeafenall'];
const description = 'Server undeafens all members in the current voice channel.';
const usage = 'vcundeafenall';
const permissions = [PermissionFlagsBits.DeafenMembers];

// Helper to check permissions
function hasPerms(member, perm) {
	return member.id === member.guild.ownerId ||
		   member.permissions.has(perm) || 
		   member.permissions.has(PermissionFlagsBits.Administrator) || 
		   member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	if (!hasPerms(message.member, PermissionFlagsBits.DeafenMembers)) {
		container.addTextDisplayComponents(td => 
			td.setContent(`${EMOJIS.error || '❌'} You need **Deafen Members** permission to use this command.`)
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

	// Filter members: not bot, already deafened
	const membersToUndeafen = channel.members.filter(m => !m.user.bot && m.voice.serverDeaf); // Includes author if they are server deafened, though usually they can't undeafen themselves if they are. Wait. 
	// If author is server deafened, they can still type commands. 
	// Hierarchy check will prevent them if they are trying to undeafen someone higher, but usually self-undeafen needs perms.
	
	if (membersToUndeafen.size === 0) {
		container.addTextDisplayComponents(td => 
			td.setContent(`${EMOJIS.info || 'ℹ️'} There are no members to undeafen in **${channel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let successCount = 0;
	let failCount = 0;

	// Process in parallel
	const promises = membersToUndeafen.map(async (member) => {
		// Hierarchy check
		if (member.id !== message.author.id && message.author.id !== message.guild.ownerId && 
			message.member.roles.highest.position <= member.roles.highest.position) {
			failCount++;
			return;
		}

		try {
			await member.voice.setDeaf(false, `Undeafen all by ${message.author.tag}`);
			successCount++;
		} catch (e) {
			failCount++;
		}
	});

	await Promise.all(promises);

	let content = `${EMOJIS.success || '✅'} Server undeafened **${successCount}** members in **${channel.name}**.`;
	if (failCount > 0) {
		content += `\n${EMOJIS.error || '❌'} Failed to undeafen **${failCount}** members due to permissions/hierarchy.`;
	}

	container.addTextDisplayComponents(td => td.setContent(content));
	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, permissions, execute };
