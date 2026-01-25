import { MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const numberFormatter = new Intl.NumberFormat('en-US');

export default {
  name: 'botinfo',
	description: 'Displays bot information',
  aliases: ['bi', 'bot'],
  async execute(message, args) {
    const bot = message.client.user;
    const guild = message.guild;

    const guildCount = message.client.guilds.cache.size;
    const totalCommands = message.client.commands.size + message.client.prefixCommands.size;
    const uptime = message.client.uptime;
    const developerId = '1343508844453826673';

    const formatUptime = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0) parts.push(`${seconds}s`);

      return parts.join(' ') || '0s';
    };

    const botAvatar = bot.displayAvatarURL({ size: 4096, extension: 'png' });
    const botBanner = bot.bannerURL({ size: 4096, extension: 'png' });

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **${bot.username}'s Info**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const botInfoText = `${EMOJIS?.bot || '🤖'} **Bot Name:** ${bot.username}\n` +
      `${EMOJIS?.id || '🆔'} **Bot ID:** ${bot.id}\n` +
      `${EMOJIS?.date || '📅'} **Created:**\n<t:${Math.floor(bot.createdTimestamp / 1000)}:F>\n<t:${Math.floor(bot.createdTimestamp / 1000)}:R>\n\n` +
      `${EMOJIS?.server || '🏷️'} **Servers:** ${guildCount}\n` +
      `${EMOJIS?.channels || '📁'} **Commands:** ${totalCommands}\n` +
      `⏱️ **Uptime:** ${formatUptime(uptime)}\n` +
      `${EMOJIS?.owner || '👑'} **Developed by:** <@${developerId}>`;

    container.addSectionComponents((section) => {
      section.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(botInfoText)
      );

      if (botAvatar) {
        section.setThumbnailAccessory((thumbnail) =>
          thumbnail.setURL(botAvatar).setDescription('Bot avatar')
        );
      }

      return section;
    });

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents((actionRow) => {
      const buttons = [
        new ButtonBuilder()
          .setLabel('Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(botAvatar)
      ];

      if (botBanner) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('Banner')
            .setStyle(ButtonStyle.Link)
            .setURL(botBanner)
        );
      }

      buttons.push(
        new ButtonBuilder()
          .setLabel('Invite')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot%20applications.commands&permissions=8`)
      );

      actionRow.setComponents(...buttons);
      return actionRow;
    });

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: []
};
