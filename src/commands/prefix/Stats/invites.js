import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber } from '../../../utils/statsManager.js';

const name = 'invites';
const aliases = ['invitestats', 'myinvites'];

function buildInvitesPanel(guild, user, inviteData, authorId, botName) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.invite || '📨'} Invite Stats`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const avatarUrl = user.displayAvatarURL({ size: 64, extension: 'png' });

	const total = inviteData.total || 0;
	const regular = inviteData.regular || 0;
	const left = inviteData.left || 0;
	const fake = inviteData.fake || 0;
	const bonus = inviteData.bonus || 0;

	const statsText = [
		`**${user.username}**`,
		'',
		`${EMOJIS.invite || '📨'} **Total Invites:** ${formatNumber(total)}`,
		`${EMOJIS.check || '✅'} **Regular:** ${formatNumber(regular)}`,
		`${EMOJIS.leave || '👋'} **Left:** ${formatNumber(left)}`,
		`${EMOJIS.fake || '🚫'} **Fake:** ${formatNumber(fake)}`,
		`${EMOJIS.bonus || '🎁'} **Bonus:** ${formatNumber(bonus)}`
	].join('\n');

	container.addSectionComponents(section => {
		section.addTextDisplayComponents(td => td.setContent(statsText));
		if (avatarUrl) {
			section.setThumbnailAccessory(thumb => thumb.setURL(avatarUrl));
		}
		return section;
	});

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const recentInvites = inviteData.invited?.slice(-5) || [];
	if (recentInvites.length > 0) {
		container.addTextDisplayComponents(td => td.setContent(`### ${EMOJIS.users || '👥'} Recent Invites`));
		const list = recentInvites.map(inv => `<@${inv.userId}> — <t:${Math.floor(inv.ts / 1000)}:R>`).join('\n');
		container.addTextDisplayComponents(td => td.setContent(list));
	} else {
		container.addTextDisplayComponents(td => td.setContent('*No invites recorded*'));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • ${guild.name}`));

	return container;
}

async function getInviteData(client, guildId, userId) {
	const stats = await ensureStatsConfig(client.db, guildId);

	if (!stats.invites) {
		stats.invites = {};
	}

	if (!stats.invites[userId]) {
		stats.invites[userId] = {
			total: 0,
			regular: 0,
			left: 0,
			fake: 0,
			bonus: 0,
			invited: []
		};
	}

	return stats.invites[userId];
}

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

	const inviteData = await getInviteData(client, message.guildId, targetUser.id);
	const botName = client.user.username;

	const panel = buildInvitesPanel(message.guild, targetUser, inviteData, message.author.id, botName);

	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'View invite statistics',
	aliases,
	execute
};
