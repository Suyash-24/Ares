import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'disable';
const aliases = [];
const description = 'Disable a command or category server-wide or in a specific channel.';
const usage = 'disable <command|category> [channel|server]';
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
		container.addTextDisplayComponents(td => td.setContent('Usage: `disable <command|category> [channel|server]`'));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const targetName = args[0].toLowerCase();
	let isCategory = false;
	let resolvedName = null;

	const command = client.prefixCommands.get(targetName) || client.prefixCommands.get(client.prefixAliases.get(targetName));

	if (command) {
		if (command.name === 'disable' || command.name === 'enable') {
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Safety**`));
			container.addTextDisplayComponents(td => td.setContent('You cannot disable the disable/enable commands.'));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}
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
		if (!guildData.moderation.disabledCommands) guildData.moderation.disabledCommands = {};

		const current = guildData.moderation.disabledCommands[resolvedName] || [];

		if (current.includes('global')) {
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.info || 'ℹ️'} **Already Disabled Globally**`));
			container.addTextDisplayComponents(td => td.setContent(`${isCategory ? 'Category' : 'Command'} \`${resolvedName}\` is disabled server-wide. You don't need to disable it per channel.`));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (current.includes(scope)) {
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.info || 'ℹ️'} **Already Disabled**`));
			container.addTextDisplayComponents(td => td.setContent(`${isCategory ? 'Category' : 'Command'} \`${resolvedName}\` is already disabled in **${scopeName}**.`));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		current.push(scope);
		guildData.moderation.disabledCommands[resolvedName] = current;

		await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });

		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Disabled**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`${isCategory ? 'Category' : 'Command'} \`${resolvedName}\` has been disabled **${scopeName}**.`));

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	} catch (err) {
		console.error('Disable Error:', err);
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Database Error**`));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default { name, aliases, description, usage, execute, category };
