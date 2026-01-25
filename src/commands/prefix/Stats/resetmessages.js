import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber } from '../../../utils/statsManager.js';

const name = 'resetmessages';
const aliases = ['clearmessages', 'resetmsgs'];

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

	const targetUser = message.mentions.users.first();

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (targetUser) {

			if (stats.users[targetUser.id]) {
				const oldCount = stats.users[targetUser.id].messages?.length || 0;
				stats.users[targetUser.id].messages = [];
				await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.check || '✅'} Messages Reset\n\n` +
					`Reset message count for <@${targetUser.id}>.\n` +
					`Cleared **${formatNumber(oldCount)}** messages.`
				));
			} else {
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.error || '❌'} No message data found for **${targetUser.username}**.`
				));
			}
		} else {

			let totalCleared = 0;
			for (const userId of Object.keys(stats.users || {})) {
				totalCleared += stats.users[userId].messages?.length || 0;
				stats.users[userId].messages = [];
			}

			for (const day of Object.keys(stats.daily || {})) {
				stats.daily[day].messages = 0;
			}

			for (const chId of Object.keys(stats.channels || {})) {
				stats.channels[chId].messages = [];
			}

			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.check || '✅'} All Messages Reset\n\n` +
				`Reset all message statistics for **${message.guild.name}**.\n` +
				`Cleared **${formatNumber(totalCleared)}** messages.`
			));
		}
	} catch (error) {
		console.error('[ResetMessages] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while resetting message data.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Reset message tracking',
	aliases,
	execute
};
