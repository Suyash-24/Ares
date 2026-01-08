import { ContainerBuilder, MessageFlags } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'hack';
const aliases = ['hacker'];
const description = 'Simulates hacking a user.';
const usage = 'hack <user>';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	// Resolve target
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

	// Initial message
	container.addTextDisplayComponents(td => td.setContent(`🎲 **Hacking ${targetName}**\n\n${steps[0]}`));
	const sentMessage = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });

	// Simulate updates
	// Since we can't block the thread too long, we use setTimeout structure or async sleep
	const sleep = (ms) => new Promise(r => setTimeout(r, ms));

	try {
		for (let i = 1; i < steps.length; i++) {
			await sleep(2000); // 2 seconds between steps
			const newContainer = new ContainerBuilder();
			// Show current step and maybe generic "Hacking..." header
			// Or accumulate log? Accumulating log looks cooler.
			const log = steps.slice(0, i + 1).join('\n');
			newContainer.addTextDisplayComponents(td => td.setContent(`🎲 **Hacking ${targetName}**\n\n${log}`));
			await sentMessage.edit({ components: [newContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
		}
	} catch (e) {
		// Message might have been deleted or connection lost
		console.log('Hack sim interrupted', e);
	}
}

export default { name, aliases, description, usage, execute };
