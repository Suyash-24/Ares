import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'enable';
const aliases = [];
const description = 'Enable a command or category that was previously disabled.';
const usage = 'enable <command|category> [channel|server]';
const category = 'Server';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && message.author.id !== message.guild.ownerId) {
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Permission Denied**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('You need **Manage Guild** permission to use this command.'));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	if (!args[0]) {
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Missing Arguments**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('Usage: `enable <command|category> [channel|server]`'));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const targetName = args[0].toLowerCase();
	let isCategory = false;
	let resolvedName = null;

	const command = client.prefixCommands.get(targetName) || client.prefixCommands.get(client.prefixAliases.get(targetName));

	if (command) {
		resolvedName = command.name;
	} else {

		const categories = new Set(client.prefixCommands.map(c => c.category ? c.category.toLowerCase() : null).filter(c => c));
		if (categories.has(targetName)) {
			isCategory = true;
			resolvedName = targetName;
		}
	}

	if (!resolvedName) {
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Not Found**`));
		container.addTextDisplayComponents(td => td.setContent(`Could not find command or category \`${args[0]}\`.`));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	let scope = 'global';
	let scopeName = 'Server-wide';

	if (args[1]) {
		const channelId = args[1].replace(/\D/g, '');
		const channel = message.guild.channels.cache.get(channelId);
		if (channel) {
			scope = channel.id;
			scopeName = `<#${channel.id}>`;
		} else if (['server', 'all', 'global'].includes(args[1].toLowerCase())) {
			scope = 'global';
			scopeName = 'Server-wide';
		}
	} else {
		scope = 'global';
		scopeName = 'Server-wide';
	}

	try {
		const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
		if (!guildData.moderation) guildData.moderation = {};
		if (!guildData.moderation.disabledCommands) return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(td => td.setContent(`${EMOJIS.info || 'ℹ️'} No disabled commands found.`))], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

		const current = guildData.moderation.disabledCommands[resolvedName] || [];

		if (!current.includes(scope)) {
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.info || 'ℹ️'} **Not Disabled**`));
			container.addTextDisplayComponents(td => td.setContent(`${isCategory ? 'Category' : 'Command'} \`${resolvedName}\` is not disabled in **${scopeName}**.`));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		const updated = current.filter(s => s !== scope);

		if (updated.length === 0) {
			delete guildData.moderation.disabledCommands[resolvedName];
		} else {
			guildData.moderation.disabledCommands[resolvedName] = updated;
		}

		await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });

		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Enabled**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${isCategory ? 'Category' : 'Command'} \`${resolvedName}\` is now enabled **${scopeName}**.`));

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	} catch (err) {
		console.error('Enable Error:', err);
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Database Error**`));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default { name, aliases, description, usage, execute, category };
