import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber } from '../../../utils/statsManager.js';

const name = 'setinvites';
const aliases = ['setinvite'];

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
	let argOffset = 1;

	if (!targetUser && args[0]) {
		const userId = args[0].replace(/[<@!>]/g, '');
		try {
			targetUser = await client.users.fetch(userId);
			argOffset = 1;
		} catch {

		}
	}

	const type = args[argOffset]?.toLowerCase();
	const amount = parseInt(args[argOffset + 1]);

	if (!targetUser) {
		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.invite || '📨'} Set Invites\n\n` +
			`**Usage:** \`setinvites @user <type> <amount>\`\n\n` +
			`**Types:**\n` +
			`• \`regular\` - Regular invites (joined & stayed)\n` +
			`• \`left\` - Left invites (joined & left)\n` +
			`• \`fake\` - Fake invites (new accounts)\n` +
			`• \`bonus\` - Bonus invites (admin-given)\n\n` +
			`**Examples:**\n` +
			`• \`setinvites @user regular 10\`\n` +
			`• \`setinvites @user bonus 5\``
		));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!['regular', 'left', 'fake', 'bonus'].includes(type)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Invalid type. Use: \`regular\`, \`left\`, \`fake\`, or \`bonus\``));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (isNaN(amount) || amount < 0) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Please provide a valid positive number.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (!stats.invites) {
			stats.invites = {};
		}

		if (!stats.invites[targetUser.id]) {
			stats.invites[targetUser.id] = {
				regular: 0,
				left: 0,
				fake: 0,
				bonus: 0,
				invited: []
			};
		}

		const oldValue = stats.invites[targetUser.id][type] || 0;
		stats.invites[targetUser.id][type] = amount;

		await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

		const inv = stats.invites[targetUser.id];
		const total = (inv.regular || 0) + (inv.bonus || 0) - (inv.left || 0) - (inv.fake || 0);

		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.check || '✅'} Invites Updated\n\n` +
			`Set **${type}** invites for <@${targetUser.id}>\n\n` +
			`**${oldValue}** → **${amount}**\n\n` +
			`**New Total:** ${formatNumber(total)} invites`
		));
	} catch (error) {
		console.error('[SetInvites] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while setting invite data.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Set invite count for a user',
	aliases,
	execute
};
