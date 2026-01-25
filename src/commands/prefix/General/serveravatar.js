import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MediaGalleryBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
  name: 'serveravatar',
  aliases: ['servericon', 'guildicon', 'sicon'],
  description: 'Displays the server\'s icon (avatar).',
  category: 'General',
  async execute(message, args) {
    const guild = message.guild;
    const iconUrl = guild.iconURL({ size: 4096, extension: 'png' });

    if (!iconUrl) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.error || '❌'} **No Icon**`)
      );
      container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td =>
        td.setContent(`**${guild.name}** doesn't have an icon.`)
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **${guild.name}'s Icon**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const gallery = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
      mediaGalleryItem.setURL(iconUrl).setDescription('Server Icon')
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
          .setURL(guild.iconURL({ size: 4096, extension: 'jpg' })),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(iconUrl),
        new ButtonBuilder()
          .setLabel('WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(guild.iconURL({ size: 4096, extension: 'webp' }))
      ];

      if (guild.icon && guild.icon.startsWith('a_')) {
          buttons.push(
               new ButtonBuilder()
              .setLabel('GIF')
              .setStyle(ButtonStyle.Link)
              .setURL(guild.iconURL({ size: 4096, extension: 'gif' }))
          );
      }

      actionRow.setComponents(...buttons);
      return actionRow;
    });

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  }
};
