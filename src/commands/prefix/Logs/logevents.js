

import {
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import {
	LOG_CATEGORIES,
	CATEGORY_NAMES
} from '../../../utils/LoggingManager.js';

export default {
	name: 'logevents',
	description: 'Show all available log events',
	usage: 'logevents [category]',
	category: 'Logs',
	aliases: ['loglist', 'events'],

	async execute(message, args, client) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`# 📋 Log Events Reference`)
		);
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		if (args.length && args[0].toLowerCase() !== 'all') {
			const category = args[0].toLowerCase();

			if (!LOG_CATEGORIES[category]) {
				const validCategories = Object.keys(LOG_CATEGORIES).join(', ');
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`${EMOJIS.error} Invalid category: \`${category}\`\n\n` +
						`**Valid categories:** ${validCategories}`
					)
				);
			} else {
				const categoryName = CATEGORY_NAMES[category];
				const events = LOG_CATEGORIES[category];

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**${categoryName}**\n\n` +
						events.map(e => `• \`${e}\``).join('\n')
					)
				);
			}
		} else {

			let content = '';

			for (const [category, events] of Object.entries(LOG_CATEGORIES)) {
				const categoryName = CATEGORY_NAMES[category];
				const emoji = getCategoryEmoji(category);
				content += `**${emoji} ${categoryName}**\n`;
				content += events.map(e => `\`${e}\``).join(', ') + '\n\n';
			}

			content += '**Usage:**\n';
			content += '• `.logtoggle <event>` - Toggle an event on/off\n';
			content += '• `.logchannel <category> #channel` - Set a channel for a category\n';
			content += '• `.logevents <category>` - View events in a category';

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(content)
			);
		}

		return message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

function getCategoryEmoji(category) {
	const emojis = {
		message: '💬',
		member: '👥',
		mod: '🔨',
		server: '⚙️',
		voice: '🎤',
		role: '🏷️',
		channel: '📁',
		emoji: '😀'
	};
	return emojis[category] || '📋';
}
