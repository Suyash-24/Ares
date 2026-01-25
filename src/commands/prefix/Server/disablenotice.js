import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'disablenotice';
const aliases = ['disablemsg', 'quietmode'];
const description = 'Toggle whether the bot replies when a disabled command is used.';
const usage = 'disablenotice [on|off]';
const category = 'Server';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && message.author.id !== message.guild.ownerId) {
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Permission Denied**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('You need **Manage Guild** permission to use this command.'));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
	if (!guildData.moderation) guildData.moderation = {};

	const currentSetting = guildData.moderation.disableNotice !== false;

	let newState = !currentSetting;
	if (args[0]) {
		const arg = args[0].toLowerCase();
		if (arg === 'on' || arg === 'enable' || arg === 'true') newState = true;
		else if (arg === 'off' || arg === 'disable' || arg === 'false') newState = false;
	}

	guildData.moderation.disableNotice = newState;
	await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });

	container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Setting Updated**`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	if (newState) {
		container.addTextDisplayComponents(td => td.setContent('The bot will now **Reply** when a disabled command is used.'));
	} else {
		container.addTextDisplayComponents(td => td.setContent('The bot will now **Ignore** disabled commands silently.'));
	}

	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

export default { name, aliases, description, usage, execute, category };
