import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig } from '../../../utils/statsManager.js';

const name = 'inviter';
const aliases = ['whoinvited', 'invitedby'];

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

	const stats = await ensureStatsConfig(client.db, message.guildId);
	const botName = client.user.username;

	const container = new ContainerBuilder();

	container.addTextDisplayComponents(td =>
		td.setContent(`# ${EMOJIS.invite || '📨'} Inviter Lookup`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	let inviterId = null;
	let inviteTime = null;

	if (stats.invites) {
		for (const [userId, data] of Object.entries(stats.invites)) {
			const invite = data.invited?.find(inv => inv.userId === targetUser.id);
			if (invite) {
				inviterId = userId;
				inviteTime = invite.ts;
				break;
			}
		}
	}

	if (inviterId) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.users || '👤'} **${targetUser.username}** was invited by <@${inviterId}>\n\n` +
			`${EMOJIS.time || '🕐'} **Joined:** <t:${Math.floor(inviteTime / 1000)}:F> (<t:${Math.floor(inviteTime / 1000)}:R>)`
		));
	} else {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Could not find who invited **${targetUser.username}**.\n\n` +
			`*This user may have joined before invite tracking was enabled, or used a vanity URL.*`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • ${message.guild.name}`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Check who invited a user',
	aliases,
	execute
};
