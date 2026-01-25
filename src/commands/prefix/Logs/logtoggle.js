

import {
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	getDefaultLoggingConfig,
	LOG_CATEGORIES,
	CATEGORY_NAMES
} from '../../../utils/LoggingManager.js';

const ALL_EVENTS = Object.values(LOG_CATEGORIES).flat();

export default {
	name: 'logtoggle',
	description: 'Toggle specific logging events on/off',
	usage: 'logtoggle <event> | logtoggle list',
	category: 'Logs',
	aliases: ['togglelog', 'toggleevent'],

	async execute(message, args, client) {

		if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You need the **Manage Server** permission to configure logging.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const guildData = await client.db.findOne({ guildId: message.guild.id }) || {};
		if (!guildData.logging) guildData.logging = getDefaultLoggingConfig();
		if (!guildData.logging.events) guildData.logging.events = {};

		if (!args.length || args[0].toLowerCase() === 'list') {
			return showEventList(message, guildData);
		}

		const eventName = args[0].toLowerCase();

		if (!ALL_EVENTS.includes(eventName)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Invalid Event`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`\`${eventName}\` is not a valid event name.\n\n` +
					`Use \`.logtoggle list\` to see all available events.`
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const currentState = guildData.logging.events[eventName] !== false;
		guildData.logging.events[eventName] = !currentState;

		await client.db.updateOne({ guildId: message.guild.id }, { $set: { logging: guildData.logging } });

		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# ${!currentState ? EMOJIS.success : EMOJIS.error} Event ${!currentState ? 'Enabled' : 'Disabled'}`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`The \`${eventName}\` event is now **${!currentState ? 'enabled' : 'disabled'}**.\n\n` +
				`${!currentState ? 'This event will now be logged.' : 'This event will no longer be logged.'}`
			)
		);

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

async function showEventList(message, guildData) {
	const events = guildData.logging?.events || {};

	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# 🎚️ Logging Events`)
	);
	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	let content = '';
	for (const [category, categoryEvents] of Object.entries(LOG_CATEGORIES)) {
		const categoryName = CATEGORY_NAMES[category];
		const eventStatus = categoryEvents.map(event => {
			const enabled = events[event] !== false;
			return `${enabled ? EMOJIS.enabletoggle : EMOJIS.disabletoggle} \`${event}\``;
		}).join('\n');

		content += `**${categoryName}**\n${eventStatus}\n\n`;
	}

	content += `Use \`.logtoggle <event>\` to toggle an event.`;

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(content)
	);

	return message.reply({
		components: [container],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { repliedUser: false }
	});
}
