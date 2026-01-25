import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'botserveravatar';
const aliases = ['setbotserveravatar', 'botguildavatar'];
const description = 'Change the bot\'s avatar for this server.';
const usage = 'botserveravatar [url|attachment] (leave empty to reset)';
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
	const avatarURL = attachment ? attachment.url : args[0];

	try {

		if (!avatarURL) {
			await message.guild.members.editMe({ avatar: null });
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Avatar Reset**`));
			container.addTextDisplayComponents(td => td.setContent('The bot\'s server avatar has been reset to the global avatar.'));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

        const cleanUrl = avatarURL.split('?')[0].toLowerCase();
        if (!validExtensions.some(ext => cleanUrl.endsWith(ext))) {
             container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Invalid Image**`));
             container.addTextDisplayComponents(td => td.setContent('Please provide a valid image URL (PNG, JPG, GIF, WebP).'));
             return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        let buffer;
        try {
            const response = await fetch(avatarURL);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (fetchErr) {
             console.error('Fetch Error:', fetchErr);
             container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Fetch Failed**`));
             container.addTextDisplayComponents(td => td.setContent('Could not download the image. Check the URL.'));
             return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

		await message.guild.members.editMe({ avatar: buffer });

        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Avatar Updated**`));
		container.addTextDisplayComponents(td => td.setContent('The bot\'s server avatar has been updated successfully!'));
		container.addMediaGalleryComponents(mg => mg.addItems(i => i.setURL(avatarURL)));

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	} catch (err) {
		console.error('ServerAvatar Error:', err);
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Failed**`));
        if (err.code === 50013) {
             container.addTextDisplayComponents(td => td.setContent('I lack permissions to change my avatar in this server.'));
        } else if (err.code === 50035) {
             container.addTextDisplayComponents(td => td.setContent('Invalid image form body (too large or unsupported).'));
        } else {
		    container.addTextDisplayComponents(td => td.setContent('An error occurred while updating the avatar.'));
        }
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default { name, aliases, description, usage, execute, category };
