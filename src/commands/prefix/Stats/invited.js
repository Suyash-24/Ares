import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber } from '../../../utils/statsManager.js';

const name = 'invited';
const aliases = ['invitedlist', 'invitedusers'];

const PER_PAGE = 10;

function buildInvitedPanel(guild, user, invitedUsers, authorId, botName, page = 0) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.users || '👥'} Users Invited by ${user.username}`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const totalPages = Math.max(1, Math.ceil(invitedUsers.length / PER_PAGE));
	const currentPage = Math.min(Math.max(0, page), totalPages - 1);
	const slice = invitedUsers.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

	if (slice.length > 0) {
		const list = slice.map((inv, i) => {
			const rank = currentPage * PER_PAGE + i + 1;
			const status = inv.left ? '❌' : '✅';
			return `**#${rank}** ${status} <@${inv.userId}> — <t:${Math.floor(inv.ts / 1000)}:R>`;
		}).join('\n');
		container.addTextDisplayComponents(td => td.setContent(list));
	} else {
		container.addTextDisplayComponents(td => td.setContent('*No users invited yet*'));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`Total: ${formatNumber(invitedUsers.length)} users • Page ${currentPage + 1}/${totalPages}`));

	if (totalPages > 1) {
		container.addActionRowComponents(row => {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`invited_page:${authorId}:${user.id}:${currentPage - 1}`)
					.setLabel('Previous')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage === 0),
				new ButtonBuilder()
					.setCustomId(`invited_page:${authorId}:${user.id}:${currentPage + 1}`)
					.setLabel('Next')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage >= totalPages - 1)
			);
			return row;
		});
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • ✅ = Still in server, ❌ = Left`));

	return container;
}

async function getInvitedUsers(client, guildId, userId) {
	const stats = await ensureStatsConfig(client.db, guildId);

	if (!stats.invites?.[userId]) {
		return [];
	}

	return stats.invites[userId].invited || [];
}

const components = [
	{
		customId: /^invited_page:(\d+):(\d+):(-?\d+)$/,
		execute: async (interaction) => {
			const match = interaction.customId.match(/^invited_page:(\d+):(\d+):(-?\d+)$/);
			if (!match) return;

			const [, authorId, targetUserId, pageStr] = match;
			const page = parseInt(pageStr, 10);

			if (interaction.user.id !== authorId) {
				return interaction.reply({ content: `${EMOJIS.error || '❌'} This panel is locked to the invoker.`, ephemeral: true });
			}

			const invitedUsers = await getInvitedUsers(interaction.client, interaction.guildId, targetUserId);
			const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => ({ username: 'Unknown', id: targetUserId }));
			const botName = interaction.client.user.username;
			const panel = buildInvitedPanel(interaction.guild, targetUser, invitedUsers, authorId, botName, page);

			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } }).catch(() => {});
		}
	}
];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	let targetUser = message.mentions.users.first();

	if (!targetUser && args[0]) {
		const userId = args[0].replace(/[<@!>]/g, '');
		try {
			targetUser = await client.users.fetch(userId);
		} catch {
			targetUser = message.author;
		}
	}

	if (!targetUser) {
		targetUser = message.author;
	}

	const invitedUsers = await getInvitedUsers(client, message.guildId, targetUser.id);
	const botName = client.user.username;

	const panel = buildInvitedPanel(message.guild, targetUser, invitedUsers, message.author.id, botName, 0);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'See who a user has invited',
	aliases,
	execute,
	components
};
