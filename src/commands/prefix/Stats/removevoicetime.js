import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatVoiceTime } from '../../../utils/statsManager.js';
import { parseDuration } from '../../../utils/durationParser.js';

const name = 'removevoicetime';
const aliases = ['removevoice', 'takevoice', 'delvoice'];

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
			`**Usage:** \`.removevoicetime @user <duration>\`\n` +
			`**Examples:** \`.removevoicetime @user 1h\`, \`.removevoicetime @user 30m\``
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	if (!durationArg) {
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} Please provide a duration.\n\n` +
			`**Usage:** \`.removevoicetime @user <duration>\`\n` +
			`**Examples:** \`.removevoicetime @user 1h\`, \`.removevoicetime @user 30m\``
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

	const minutesToRemove = Math.floor(durationMs / 60000);

	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);

		if (!stats.users[targetUser.id] || !stats.users[targetUser.id].voice?.length) {
			container.addTextDisplayComponents(td => td.setContent(
				`${EMOJIS.error || '❌'} **${targetUser.username}** has no voice data to remove.`
			));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}

		const oldTotal = stats.users[targetUser.id].voice.reduce((sum, v) => sum + (v.mins || 0), 0);

		let remaining = minutesToRemove;
		while (remaining > 0 && stats.users[targetUser.id].voice.length > 0) {
			const last = stats.users[targetUser.id].voice[stats.users[targetUser.id].voice.length - 1];
			if (last.mins <= remaining) {
				remaining -= last.mins;
				stats.users[targetUser.id].voice.pop();
			} else {
				last.mins -= remaining;
				remaining = 0;
			}
		}

		const actualRemoved = minutesToRemove - remaining;

		await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });

		const newTotal = stats.users[targetUser.id].voice.reduce((sum, v) => sum + (v.mins || 0), 0);

		container.addTextDisplayComponents(td => td.setContent(
			`# ${EMOJIS.check || '✅'} Voice Time Removed\n\n` +
			`Removed **${formatVoiceTime(actualRemoved)}** from <@${targetUser.id}>.\n` +
			`New total: **${formatVoiceTime(newTotal)}**`
		));
	} catch (error) {
		console.error('[RemoveVoiceTime] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while removing voice time.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	category: 'Stats',
	description: 'Remove voice time from a user',
	aliases,
	execute
};
