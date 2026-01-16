import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MediaGalleryBuilder, ActionRowBuilder } from 'discord.js';

const resolveTargetUser = async (message, args) => {
  // Priority 1: Check for mentioned users in the message content
  // Filter out the replied-to user from mentions to prioritize explicit mentions
  const mentions = message.mentions.users;
  const repliedUserId = message.reference ? (await message.fetchReference().catch(() => null))?.author?.id : null;
  
  // Get the first mention that isn't the replied-to user (if replying)
  const explicitMention = mentions.find(u => u.id !== repliedUserId) || (mentions.size > 0 && !repliedUserId ? mentions.first() : null);
  
  if (explicitMention) {
    return explicitMention;
  }

  // Priority 2: Check for user ID in args
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

  // Priority 3: If replying to a message without args/mentions, use replied-to user
  if (message.reference) {
    const repliedMessage = await message.fetchReference().catch(() => null);
    if (repliedMessage?.author) {
      return repliedMessage.author;
    }
  }

  // Priority 4: Default to message author
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

    // Check if user has a server avatar
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

    // Add server avatar button on separate row if user has one
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
