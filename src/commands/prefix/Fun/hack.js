import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'hack';
const aliases = ['hacker'];
const description = 'Simulates hacking a user.';
const usage = 'hack <user>';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	let targetName = 'someone';
	if (message.mentions.users.size > 0) {
		targetName = message.mentions.users.first().username;
	} else if (args.length > 0) {
		targetName = args.join(' ');
	} else {
		container.addTextDisplayComponents(td =>
			td.setContent(`${EMOJIS.error || '❌'} Who are we hacking? (Usage: \`.hack @user\`)`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const steps = [
		`💻 Initializing hack tool v2.0...`,
		`🔍 Finding **${targetName}**'s IP address...`,
		`🔓 Bypassing firewall... (Success)`,
		`📂 Downloading "homework" folder...`,
		`📧 Reading latest DMs... (Oof)`,
		`💸 Stealing Discord nitro tokens...`,
		`⚠️ Injecting trojan...`,
		`✅ **Hacking Complete!** Stole 0 data because I'm a good bot.`
	];

	container.addTextDisplayComponents(td => td.setContent(`🎲 **Hacking ${targetName}**\n\n${steps[0]}`));
	const sentMessage = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });

	const sleep = (ms) => new Promise(r => setTimeout(r, ms));

	try {
		for (let i = 1; i < steps.length; i++) {
			await sleep(2000);
			const newContainer = new ContainerBuilder();

			const log = steps.slice(0, i + 1).join('\n');
			newContainer.addTextDisplayComponents(td => td.setContent(`🎲 **Hacking ${targetName}**\n\n${log}`));
			await sentMessage.edit({ components: [newContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	} catch (e) {

		console.log('Hack sim interrupted', e);
	}
}

export default { name, aliases, description, usage, category: 'Fun', execute };
