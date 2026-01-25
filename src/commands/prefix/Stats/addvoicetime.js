import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatVoiceTime } from '../../../utils/statsManager.js';
import { parseDuration } from '../../../utils/durationParser.js';

const name = 'addvoicetime';
const aliases = ['addvoice', 'givevoice', 'addvc'];

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
	const durationArg = args.find(a => !a.startsWith('<@'));

	if (!targetUser) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Please mention a user.\n\n` +
			`**Usage:** \`.addvoicetime @user <duration>\`\n` +
			`**Examples:** \`.addvoicetime @user 1h\`, \`.addvoicetime @user 30m\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!durationArg) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Please provide a duration.\n\n` +
			`**Usage:** \`.addvoicetime @user <duration>\`\n` +
			`**Examples:** \`.addvoicetime @user 1h\`, \`.addvoicetime @user 30m\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const durationMs = parseDuration(durationArg);
	if (!durationMs || durationMs <= 0) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Invalid duration format.\n\n` +
			`**Valid formats:** \`1h\`, \`30m\`, \`1h30m\`, \`90m\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const minutes = Math.floor(durationMs / 60000);

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);
		const today = new Date().toISOString().split('T')[0];
		const timestamp = Date.now();

		if (!stats.users[targetUser.id]) {
			stats.users[targetUser.id] = { messages: [], voice: [], joins: [] };
		}

		stats.users[targetUser.id].voice.push({ ts: timestamp, ch: 'bonus', mins: minutes });

		if (!stats.daily[today]) {
			stats.daily[today] = { messages: 0, voice: 0, joins: 0, leaves: 0 };
		}
		stats.daily[today].voice += minutes;

		await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

		const newTotal = stats.users[targetUser.id].voice.reduce((sum, v) => sum + (v.mins || 0), 0);

		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.check || '✅'} Voice Time Added\n\n` +
			`Added **${formatVoiceTime(minutes)}** to <@${targetUser.id}>.\n` +
			`New total: **${formatVoiceTime(newTotal)}**`
		));
	} catch (error) {
		console.error('[AddVoiceTime] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while adding voice time.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Add voice time to a user',
	aliases,
	execute
};
