import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'botserverbanner';
const aliases = ['setbotserverbanner', 'botguildbanner'];
const description = 'Set a custom banner for the bot on this server.';
const usage = 'botserverbanner [url|attachment] (leave empty to reset)';
const category = 'Server';

async function execute(message, args, client) {
	const container = new ContainerBuilder();

	const isOwner = message.member.id === message.guild.ownerId;
	const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
	const isBotOwner = client.application?.owner?.id === message.author.id || (client.ownerIds || client.config?.ownerIds || []).includes(message.author.id);

	if (!isOwner && !isAdmin && !isBotOwner) {
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Permission Denied**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent('You need **Administrator** permission, or be the **Server/Bot Owner** to use this command.'));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const attachment = message.attachments.first();
	const bannerURL = attachment ? attachment.url : args[0];

	try {

		if (!bannerURL) {
			await message.guild.members.editMe({ banner: null });
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Banner Reset**`));
			container.addTextDisplayComponents(td => td.setContent('The bot\'s server banner has been reset.'));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const cleanUrl = bannerURL.split('?')[0].toLowerCase();
        if (!validExtensions.some(ext => cleanUrl.endsWith(ext))) {
             container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Image**`));
             container.addTextDisplayComponents(td => td.setContent('Please provide a valid image URL (PNG, JPG, GIF, WebP).'));
             return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        let buffer;
        try {
            const response = await fetch(bannerURL);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (fetchErr) {
             console.error('Fetch Error:', fetchErr);
             container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Fetch Failed**`));
             container.addTextDisplayComponents(td => td.setContent('Could not download the image. Check the URL.'));
             return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

		await message.guild.members.editMe({ banner: buffer });

        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Banner Updated**`));
		container.addTextDisplayComponents(td => td.setContent('The bot\'s server banner has been updated successfully!'));
		container.addMediaGalleryComponents(mg => mg.addItems(i => i.setURL(bannerURL)));

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	} catch (err) {
		console.error('ServerBanner Error:', err);
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Failed**`));
        if (err.code === 50013) {
             container.addTextDisplayComponents(td => td.setContent('I lack permissions to change my banner in this server.'));
        } else if (err.code === 50035) {
             container.addTextDisplayComponents(td => td.setContent('Invalid image form body (too large or unsupported).'));
        } else {
		    container.addTextDisplayComponents(td => td.setContent('An error occurred while updating the banner. Discord may not support per-server banners for bots yet.'));
        }
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default { name, aliases, description, usage, execute, category };
