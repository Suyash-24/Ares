import { ContainerBuilder, MessageFlags, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'vclist';
const aliases = ['voicelist', 'vlist'];
const description = 'Lists members in the voice channel with pagination.';
const usage = 'vclist';
const permissions = [PermissionFlagsBits.MuteMembers];

function hasPerms(member, perm) {
	return member.id === member.guild.ownerId ||
		   member.permissions.has(perm) ||
		   member.permissions.has(PermissionFlagsBits.Administrator) ||
		   member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function execute(message, args, client) {
	if (!hasPerms(message.member, PermissionFlagsBits.MuteMembers)) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need **Mute Members** permission to use this command.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const channel = message.member.voice.channel;
	if (!channel) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} You need to be in a voice channel.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const members = Array.from(channel.members.values()).filter(m => !m.user.bot);
	const totalMembers = members.length;

	if (totalMembers === 0) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.info || 'ℹ️'} No human members in **${channel.name}**.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const payload = generatePage(members, channel.name, 1, totalMembers);
	await message.reply({ ...payload, allowedMentions: { repliedUser: false, parse: [] } });
}

function generatePage(allMembers, channelName, page, total) {
	const PAGE_SIZE = 10;
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const start = (page - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;
	const currentMembers = allMembers.slice(start, end);

	const container = new ContainerBuilder();

	const list = currentMembers.map((m, i) => {
		const flags = [];
		if (m.voice.serverMute) flags.push('🚫 🎤');
		if (m.voice.serverDeaf) flags.push('🚫 🎧');
		if (m.voice.selfMute) flags.push('🎤');
		if (m.voice.selfDeaf) flags.push('🎧');
		if (m.voice.streaming) flags.push('📺');

		return `\`${start + i + 1}.\` **${m.user.username}** ${flags.join(' ')}`;
	}).join('\n');

	container.addTextDisplayComponents(td =>
		td.setContent(`### 🔊 ${channelName} (${total})\n${list}`)
	);

	if (totalPages > 1) {
		container.addActionRowComponents(row => {
			const prev = new ButtonBuilder()
				.setCustomId(`vclist_prev:${page}:${totalPages}`)
				.setEmoji('⬅️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 1);

			const next = new ButtonBuilder()
				.setCustomId(`vclist_next:${page}:${totalPages}`)
				.setEmoji('➡️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === totalPages);

			row.addComponents(prev, next);
		});
	}

	return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function components(interaction, client) {
	if (!interaction.customId.startsWith('vclist')) return;

	const [action, currentPageStr, totalPagesStr] = interaction.customId.split(':');
	const currentPage = parseInt(currentPageStr);

	const channel = interaction.member.voice.channel;
	if (!channel) {
		return interaction.reply({ content: 'You are no longer in a voice channel.', ephemeral: true });
	}

	const members = Array.from(channel.members.values()).filter(m => !m.user.bot);
	const totalMembers = members.length;

	let newPage = currentPage;
	if (action === 'vclist_prev') newPage = Math.max(1, currentPage - 1);
	if (action === 'vclist_next') newPage = Math.min(Math.ceil(totalMembers / 10), currentPage + 1);

	const payload = generatePage(members, channel.name, newPage, totalMembers);
	await interaction.update(payload);
}

export default { name, aliases, description, usage, category: 'Voice Commands', permissions, execute, components };
