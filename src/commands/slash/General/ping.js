import { ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags, SeparatorSpacingSize, SlashCommandBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
const COMPONENT_IDS = {
  refresh: 'ping:refresh'
};

async function getDbPing(client) {
  const db = client.db || client.database || null;
  if (!db) return { type: 'none', ping: null };
  const dbType = (client.dbType || (client.database && client.database.getType && client.database.getType()) || (db.getType && db.getType()) || 'unknown').toLowerCase();
  let ping = null;
  try {
    const start = Date.now();
    if (dbType === 'postgres') {

      await db.postgresClient.query('SELECT 1');
      ping = Date.now() - start;
    } else if (dbType === 'sqlite') {

      db.sqliteDb.prepare('SELECT 1').get();
      ping = Date.now() - start;
    } else if (dbType === 'json') {

      await db.findOne({ guildId: 'ping' });
      ping = Date.now() - start;
    }
    return { type: dbType, ping };
  } catch {
    return { type: dbType, ping: null };
  }
}

const buildComponentLayout = (client, state = 'active', dbPing = null, dbType = null) => {
  const latency = Math.round(client.ws.ping);
  let dbPingText = dbPing !== null ? `\n**Database** (${dbType}): ${dbPing}ms` : '';
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        state === 'active'
          ? `**${EMOJIS.ping} Current gateway latency: ${latency}ms**${dbPingText}`
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
    const { type: dbType, ping: dbPing } = await getDbPing(interaction.client);
    await interaction.reply({
      components: buildComponentLayout(interaction.client, 'active', dbPing, dbType),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  },
  components: [
    {
      customId: COMPONENT_IDS.refresh,
      async execute(interaction) {
        const { type: dbType, ping: dbPing } = await getDbPing(interaction.client);
        await interaction.update({
          components: buildComponentLayout(interaction.client, 'active', dbPing, dbType),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
    }
  ]
};
