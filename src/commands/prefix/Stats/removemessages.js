import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber } from '../../../utils/statsManager.js';

const name = 'removemessages';
const aliases = ['removemsgs', 'takemsgs', 'delmessages'];

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
	const amountArg = args.find(a => !a.startsWith('<@'));
	const amount = parseInt(amountArg, 10);

	if (!targetUser) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Please mention a user.\n\n` +
			`**Usage:** \`.removemessages @user <amount>\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (isNaN(amount) || amount <= 0) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Please provide a valid positive number.\n\n` +
			`**Usage:** \`.removemessages @user <amount>\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (!stats.users[targetUser.id] || !stats.users[targetUser.id].messages?.length) {
			container.addTextDisplayComponents(td => td.setContent(
				`${EMOJIS.error || '❌'} **${targetUser.username}** has no message data to remove.`
			));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}

		const oldTotal = stats.users[targetUser.id].messages.length;
		const toRemove = Math.min(amount, oldTotal);

		stats.users[targetUser.id].messages = stats.users[targetUser.id].messages.slice(0, oldTotal - toRemove);

		await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

		const newTotal = stats.users[targetUser.id].messages.length;

		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.check || '✅'} Messages Removed\n\n` +
			`Removed **${formatNumber(toRemove)}** messages from <@${targetUser.id}>.\n` +
			`New total: **${formatNumber(newTotal)}** messages`
		));
	} catch (error) {
		console.error('[RemoveMessages] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while removing messages.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Remove messages from a user',
	aliases,
	execute
};
