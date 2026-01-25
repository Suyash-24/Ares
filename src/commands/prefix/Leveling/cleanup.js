import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import { ensureLevelingConfig } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'levels-cleanup';
const aliases = ['cleanup-levels', 'cleanlevels'];

async function execute(message, args, client) {
	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Administrator** permission.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const loadingContainer = new ContainerBuilder();
	loadingContainer.addTextDisplayComponents(td => td.setContent(`${EMOJIS.loading || '🔄'} Checking for absent members...`));
	const loadingMsg = await message.reply({ components: [loadingContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	const memberIds = Object.keys(leveling.members || {});

	if (memberIds.length === 0) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} No members to check.`));
		return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
	}

	let removed = 0;
	for (const userId of memberIds) {
		const member = await message.guild.members.fetch(userId).catch(() => null);
		if (!member) {
			delete leveling.members[userId];
			removed++;
		}
	}

	if (removed === 0) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Cleanup Complete`));
		c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} No absent members found. All tracked users are still in the server.`));
		return loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
	}

	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`## ${EMOJIS.success || '✅'} Cleanup Complete`));
	c.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.members || '👥'} Cleaned up **${removed}** absent member(s) from leveling data.`));

	await loadingMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

export default { name, aliases, category: 'Leveling', description: 'Clean up leveling data', execute };
