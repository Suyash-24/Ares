import { ContainerBuilder, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, SeparatorSpacingSize } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import EMOJIS from '../../../utils/emojis.js';

const name = 'ship';
const aliases = ['match'];
const description = 'Calculates compatibility between two users.';
const usage = 'ship [user1] [user2]';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	let user1;
	let user2;

	// Helper to resolve user safely
	const resolveUser = async (input) => {
		if (!input) return null;
		if (message.mentions.users.size > 0 && input.startsWith('<@')) {
			const id = input.replace(/\D/g, '');
			if (id) return client.users.cache.get(id) || await client.users.fetch(id).catch(() => null);
		}
		const id = input.replace(/\D/g, '');
		if (id) return client.users.cache.get(id) || await client.users.fetch(id).catch(() => null);
		return null;
	};

	if (args.length === 0) {
		user1 = message.author;
		// Fetch all members to ensure true randomness (if not already cached)
        // Optimization: Checking cache size vs memberCount could determine if fetch is needed, 
        // but fetching ensures we get everyone including offline users.
        if (message.guild.memberCount > message.guild.members.cache.size) {
             await message.guild.members.fetch().catch(() => {});
        }
		
		// Allow bots, just exclude self
		const randomMember = message.guild.members.cache.filter(m => m.id !== message.author.id).random();
		user2 = randomMember ? randomMember.user : message.author; 
	} else if (args[1]) {
		user1 = await resolveUser(args[0]);
		user2 = await resolveUser(args[1]);
	} else {
		user1 = message.author;
		user2 = await resolveUser(args[0]);
	}

	if (!user1 || !user2) {
		container.addTextDisplayComponents(td => 
			td.setContent(`${EMOJIS.error || '❌'} Could not resolve one of the users.`)
		);
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	// Score - Special case for owner + special person
	const specialId = '1417438096185757748';
	const owners = client.config?.owners || [];
	const isOwner1 = owners.includes(user1.id);
	const isOwner2 = owners.includes(user2.id);
	const isSpecial1 = user1.id === specialId;
	const isSpecial2 = user2.id === specialId;
	
	// If an owner is shipped with the special person, always 100%
	const isSpecialPair = (isOwner1 && isSpecial2) || (isOwner2 && isSpecial1);
	const score = isSpecialPair ? 100 : Math.floor(Math.random() * 101);
	const progress = Math.round(score / 10);
	const bar = '🟥'.repeat(progress) + '⬜'.repeat(10 - progress);

	let comment;
	if (score === 100) comment = '💖 **Soulmates!** Tying the knot when? 💍';
	else if (score > 90) comment = '😍 **Perfect Match!** Love is in the air!';
	else if (score > 75) comment = '🥰 **Great Couple!** Definitely compatible.';
	else if (score > 50) comment = '🙂 **Good Chance.** Give it a shot!';
	else if (score > 25) comment = '😬 **Maybe?** It might take some work.';
	else if (score > 10) comment = '💔 **Not looking good.** Friendzone territory.';
	else comment = '💀 **Run away!** Disaster imminent.';

	// Canvas Generation
	const canvas = createCanvas(700, 250);
	const ctx = canvas.getContext('2d');
	let attachment;

	try {
        // Use global fetch to get buffer
		const avatar1URL = user1.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });
		const avatar2URL = user2.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });

		const avatar1Buffer = await fetch(avatar1URL).then(res => res.arrayBuffer());
		const avatar2Buffer = await fetch(avatar2URL).then(res => res.arrayBuffer());

		const avatar1 = await loadImage(Buffer.from(avatar1Buffer));
		const avatar2 = await loadImage(Buffer.from(avatar2Buffer));

		// Draw Avatar 1 (Left)
		ctx.save();
		ctx.beginPath();
		ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar1, 25, 25, 200, 200);
		ctx.restore();

		// Draw Avatar 2 (Right)
		ctx.save();
		ctx.beginPath();
		ctx.arc(575, 125, 100, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar2, 475, 25, 200, 200);
		ctx.restore();

		// Draw Heart in Center
		ctx.save();
		ctx.beginPath();
		ctx.arc(350, 125, 60, 0, Math.PI * 2, true);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fill();
		ctx.restore();

		ctx.fillStyle = '#FFFFFF';
		ctx.font = 'bold 40px Arial, Helvetica';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(`${score}%`, 350, 125);

		attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'ship.png' });
	} catch (e) {
		console.error('[Ship] Canvas error details:', e);
	}

	// 1. Title
	container.addTextDisplayComponents(td => 
		td.setContent(`# 💘 Matchmaking 💘`)
	);

	// 2. Separator
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	// 3. Names and Bar
	container.addTextDisplayComponents(td => 
		td.setContent(`🔻 **${user1.username}**\n🔺 **${user2.username}**\n\n**${score}%** ${bar}`)
	);

	// 4. Image
	if (attachment) {
		const gallery = new MediaGalleryBuilder();
		gallery.addItems((item) => 
			item.setURL('attachment://ship.png')
		);
		container.addMediaGalleryComponents((mg) => gallery);
	}

	// 5. Comment (below image)
	container.addTextDisplayComponents(td => 
		td.setContent(`### ${comment}`)
	);

	const replyOptions = { 
		components: [container], 
		flags: MessageFlags.IsComponentsV2, 
		allowedMentions: { repliedUser: false, parse: [] } 
	};
	if (attachment) replyOptions.files = [attachment];

	return message.reply(replyOptions);
}

const category = 'Fun';

export default { name, aliases, description, usage, category, execute };
