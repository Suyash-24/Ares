import { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
export default {
  data: new SlashCommandBuilder()
    .setName('invitebot')
    .setDescription('Get the invite link for the bot'),
  async execute(interaction) {
    const bot = interaction.client.user;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot%20applications.commands&permissions=8`;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **Invite ${bot.username}**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const inviteText = `${EMOJIS.bot} Click the button below to invite **${bot.username}** to your server!\n\nGive necessary permissions to the bot for optimal functionality.`;

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(inviteText)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    container.addActionRowComponents((actionRow) => {
      const buttons = [
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setStyle(ButtonStyle.Link)
          .setURL(inviteUrl)
      ];

      actionRow.setComponents(...buttons);
      return actionRow;
    });

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
