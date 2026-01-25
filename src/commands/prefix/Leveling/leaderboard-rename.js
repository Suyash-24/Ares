import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'levels-leaderboard-rename';
const aliases = ['lb-rename', 'leaderboard-title'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Manage Server** permission.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const title = args.join(' ');
	if (!title || title.length > 50) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Usage: \`levels-leaderboard-rename <title>\` (max 50 characters)`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	leveling.leaderboardTitle = title;

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Leaderboard Renamed`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.leaderboard || '🏆'} Leaderboard title set to: **${title}**`));

	await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, category: 'Leveling', description: 'Rename leaderboard display', execute };
