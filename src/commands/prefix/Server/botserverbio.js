import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'botserverbio';
const aliases = ['setbotserverbio', 'botguildbio'];
const description = 'Set a custom bio for the bot on this server.';
const usage = 'botserverbio <text> (leave empty to reset)';
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

	const bio = args.join(' ');

	try {

		if (!bio) {
			await message.guild.members.editMe({ bio: null });
			container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Bio Reset**`));
			container.addTextDisplayComponents(td => td.setContent('The bot\'s server bio has been reset.'));
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

        if (bio.length > 190) {
             container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Too Long**`));
             container.addTextDisplayComponents(td => td.setContent('Bio must be under 190 characters.'));
             return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

		await message.guild.members.editMe({ bio: bio });

        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **Bio Updated**`));
		container.addTextDisplayComponents(td => td.setContent('The bot\'s server bio has been updated successfully!'));
		container.addTextDisplayComponents(td => td.setContent(`**New Bio:**\n> ${bio}`));

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

	} catch (err) {
		console.error('ServerBio Error:', err);
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Failed**`));
        if (err.code === 50035) {
             container.addTextDisplayComponents(td => td.setContent('Invalid bio (too long or unsupported format).'));
        } else {
		    container.addTextDisplayComponents(td => td.setContent('An error occurred. Discord may not support per-server bios for bots yet.'));
        }
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default { name, aliases, description, usage, execute, category };
