import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MediaGalleryBuilder, ActionRowBuilder } from 'discord.js';

const resolveTargetUser = async (message, args) => {

  const mentions = message.mentions.users;
  const repliedUserId = message.reference ? (await message.fetchReference().catch(() => null))?.author?.id : null;

  const explicitMention = mentions.find(u => u.id !== repliedUserId) || (mentions.size > 0 && !repliedUserId ? mentions.first() : null);

  if (explicitMention) {
    return explicitMention;
  }

  if (args.length > 0) {
    const idCandidate = args[0].replace(/[^0-9]/g, '');

    if (idCandidate.length) {
      try {
        return await message.client.users.fetch(idCandidate, { force: true });
      } catch (error) {
        return null;
      }
    }
  }

  if (message.reference) {
    const repliedMessage = await message.fetchReference().catch(() => null);
    if (repliedMessage?.author) {
      return repliedMessage.author;
    }
  }

  return message.author;
};

export default {
  name: 'avatar',
	description: 'Displays user\'s avatar',
  aliases: ['av', 'pfp'],
  async execute(message, args) {
    const targetUser = await resolveTargetUser(message, args);

    if (!targetUser) {
      await message.reply({
        content: 'Unable to find that user.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const member = message.guild?.members.cache.get(targetUser.id);
    const hasServerAvatar = member?.avatar ? true : false;

    const avatarUrl = targetUser.displayAvatarURL({ size: 4096, extension: 'png' });

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **${targetUser.tag ?? targetUser.username}'s Avatar**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const gallery = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
      mediaGalleryItem.setURL(avatarUrl).setDescription('User avatar')
    );

    container.addMediaGalleryComponents((mediaGallery) => gallery);

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents((actionRow) => {
      const buttons = [
        new ButtonBuilder()
          .setLabel('JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'jpg' })),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'png' })),
        new ButtonBuilder()
          .setLabel('WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'webp' }))
      ];

      actionRow.setComponents(...buttons);
      return actionRow;
    });

    if (hasServerAvatar) {
      container.addActionRowComponents((actionRow) => {
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`avatar_server_${targetUser.id}`)
            .setLabel('Server Avatar')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🖼️')
        );
        return actionRow;
      });
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: []
};
