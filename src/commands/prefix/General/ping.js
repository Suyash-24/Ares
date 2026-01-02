import { ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
const COMPONENT_IDS = {
  refresh: 'prefix:ping:refresh'
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
          .setDisabled(state !== 'active')
      )
    );

  return [container];
};

export default {
  name: 'ping',
  aliases: ['pong'],
  async execute(message) {
    await message.reply({
      components: buildComponentLayout(message.client),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: [
    {
      customId: COMPONENT_IDS.refresh,
      async execute(interaction) {
        await interaction.update({
          components: buildComponentLayout(interaction.client),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  ]
};
