import { ContainerBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vcmoveall';
const aliases = ['voicemoveall', 'mvall'];
const description = 'Moves all members in the current voice channel to a specified channel.';
const usage = 'vcmoveall <destination_channel_id>';
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

	let targetChannel;
	let sourceChannel;

	if (args[1]) {
		const targetId = args[0].replace(/\D/g, '');
		const sourceId = args[1].replace(/\D/g, '');

		targetChannel = message.guild.channels.cache.get(targetId);
		sourceChannel = message.guild.channels.cache.get(sourceId);

		if (!sourceChannel || !sourceChannel.isVoiceBased()) {
			container.addTextDisplayComponents(td =>
				td.setContent(`${EMOJIS.error || '❌'} Invalid source channel ID.`)
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	} else if (args[0]) {

		const targetId = args[0].replace(/\D/g, '');
		targetChannel = message.guild.channels.cache.get(targetId);

		sourceChannel = message.member.voice.channel;
		if (!sourceChannel) {
			container.addTextDisplayComponents(td =>
				td.setContent(`${EMOJIS.error || '❌'} You need to be in a voice channel or specify a source channel ID.`)
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	} else {

		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Please specify a destination channel ID. Usage: \`vcmoveall <target> [source]\``)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!targetChannel || !targetChannel.isVoiceBased()) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Invalid destination voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (sourceChannel.id === targetChannel.id) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Source and destination channels are the same.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const membersToMove = sourceChannel.members.filter(m => !m.user.bot);

	if (membersToMove.size === 0) {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.info || 'ℹ️'} No members to move.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let successCount = 0;
	let failCount = 0;

	const promises = membersToMove.map(async (member) => {

		if (member.id !== message.author.id &&
			message.author.id !== message.guild.ownerId &&
			message.member.roles.highest.position <= member.roles.highest.position) {
			failCount++;
			return;
		}

		try {
			await member.voice.setChannel(targetChannel, `Voice move all by ${message.author.tag}`);
			successCount++;
		} catch (e) {
			failCount++;
		}
	});

	await Promise.all(promises);

	let content = `${EMOJIS.success || '✅'} Moved **${successCount}** members to **${targetChannel.name}**.`;
	if (failCount > 0) {
		content += `\n${EMOJIS.error || '❌'} Failed to move **${failCount}** members due to permissions/hierarchy.`;
	}

	container.addTextDisplayComponents(td => td.setContent(content));
	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute };
