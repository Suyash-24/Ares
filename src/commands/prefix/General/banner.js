import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MediaGalleryBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

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
  name: 'banner',
	description: 'Displays user\'s banner',
  aliases: ['bg', 'userbanner', 'ub'],
  async execute(message, args) {
    let targetUser = await resolveTargetUser(message, args);

    if (!targetUser) {
      await message.reply({
        content: 'Unable to find that user.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const fullUser = await message.client.users.fetch(targetUser.id, { force: true });
    const bannerUrl = fullUser.bannerURL({ size: 4096, extension: 'png' });

    if (!bannerUrl) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.error || '❌'} **No Banner**`)
      );
      container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td =>
        td.setContent(`${fullUser.tag ?? fullUser.username} doesn't have a banner.`)
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const member = message.guild?.members.cache.get(fullUser.id);
    const hasServerBanner = member?.banner ? true : false;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **${fullUser.tag ?? fullUser.username}'s Banner**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const gallery = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
      mediaGalleryItem.setURL(bannerUrl).setDescription('User banner')
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
          .setURL(fullUser.bannerURL({ size: 4096, extension: 'jpg' })),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
        new ButtonBuilder()
          .setLabel('WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(fullUser.bannerURL({ size: 4096, extension: 'webp' }))
      ];

      actionRow.setComponents(...buttons);
      return actionRow;
    });

    if (hasServerBanner) {
      container.addActionRowComponents((actionRow) => {
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`banner_server_${fullUser.id}`)
            .setLabel('Server Banner')
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
