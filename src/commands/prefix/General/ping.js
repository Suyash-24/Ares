import { ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import DatabaseManager from '../../../utils/DatabaseManager.js';

const COMPONENT_IDS = {
  refresh: 'prefix:ping:refresh'
};

const buildComponentLayout = async (client, state = 'active') => {
  const gatewayLatency = Math.round(client.ws.ping);
  const dbLatency = await DatabaseManager.ping();

  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        state === 'active'
          ? `**${EMOJIS.ping} Gateway:** \`${gatewayLatency}ms\`\n` +
            `**${EMOJIS.database || '🗄️'} Database:** \`${dbLatency === -1 ? 'N/A' : dbLatency + 'ms'}\``
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
	description: 'Check bot latency',
  aliases: ['pong'],
  async execute(message) {
    const components = await buildComponentLayout(message.client);
    await message.reply({
      components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: [
    {
      customId: COMPONENT_IDS.refresh,
      async execute(interaction) {
        const components = await buildComponentLayout(interaction.client);
        await interaction.update({
          components,
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  ]
};
