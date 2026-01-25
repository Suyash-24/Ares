import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig } from '../../../utils/statsManager.js';

const name = 'clearinvites';
const aliases = ['resetinvites', 'deleteinvites'];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Administrator** permission to use this command.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const container = new ContainerBuilder();
	const botName = client.user.username;

	let targetUser = message.mentions.users.first();

	if (!targetUser && args[0]) {
		const userId = args[0].replace(/[<@!>]/g, '');
		try {
			targetUser = await client.users.fetch(userId);
		} catch {

		}
	}

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (targetUser) {

			if (stats.invites?.[targetUser.id]) {
				delete stats.invites[targetUser.id];
				await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.check || '✅'} Invites Cleared\n\n` +
					`Successfully cleared all invite data for <@${targetUser.id}>.`
				));
			} else {
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.error || '❌'} No invite data found for **${targetUser.username}**.`
				));
			}
		} else {

			stats.invites = {};
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.check || '✅'} All Invites Cleared\n\n` +
				`Successfully cleared all invite data for **${message.guild.name}**.`
			));
		}
	} catch (error) {
		console.error('[ClearInvites] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while clearing invite data.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Use \`.invites\` to check invite stats`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Clear invite tracking data',
	aliases,
	execute
};
