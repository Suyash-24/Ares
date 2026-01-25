import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MediaGalleryBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
  name: 'serverbanner',
  aliases: ['guildbanner', 'sbanner'],
  description: 'Displays the server\'s banner.',
  category: 'General',
  async execute(message, args) {
    let guild = message.guild;

    if (!guild.banner) {
        try {
            guild = await message.guild.fetch();
        } catch (e) {

        }
    }

    const bannerUrl = guild.bannerURL({ size: 4096, extension: 'png' });

    if (!bannerUrl) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.error || '❌'} **No Banner**`)
      );
      container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td =>
        td.setContent(`**${guild.name}** doesn't have a banner.`)
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
      textDisplay.setContent(`# **${guild.name}'s Banner**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const gallery = new MediaGalleryBuilder().addItems((mediaGalleryItem) =>
      mediaGalleryItem.setURL(bannerUrl).setDescription('Server Banner')
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
          .setURL(guild.bannerURL({ size: 4096, extension: 'jpg' })),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
        new ButtonBuilder()
          .setLabel('WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(guild.bannerURL({ size: 4096, extension: 'webp' }))
      ];

      if (guild.banner && guild.banner.startsWith('a_')) {
          buttons.push(
               new ButtonBuilder()
              .setLabel('GIF')
              .setStyle(ButtonStyle.Link)
              .setURL(guild.bannerURL({ size: 4096, extension: 'gif' }))
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
