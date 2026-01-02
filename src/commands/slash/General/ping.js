import { ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags, SeparatorSpacingSize, SlashCommandBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
const COMPONENT_IDS = {
  refresh: 'ping:refresh'
};

const buildComponentLayout = (client, state = 'active') => {
  const latency = Math.round(client.ws.ping);
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        state === 'active'
          ? `**${EMOJIS.ping} Current gateway latency: ${latency}ms**`
          : 'Ping check closed.'
      )
    )
    .addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId(COMPONENT_IDS.refresh)
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Primary)
      )
    );

  return [container];
};

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency.'),
  async execute(interaction) {
    await interaction.reply({
      components: buildComponentLayout(interaction.client),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  },
  components: [
    {
      customId: COMPONENT_IDS.refresh,
      async execute(interaction) {
        await interaction.update({
          components: buildComponentLayout(interaction.client),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
    }
  ]
};
