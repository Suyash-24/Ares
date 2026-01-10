import {
  MessageFlags,
  ContainerBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  version as discordJsVersion
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import pkg from '../../../../package.json' with { type: 'json' };

const numberFormatter = new Intl.NumberFormat('en-US');

const formatDetailedDuration = (ms) => {
  if (!ms || ms < 0) return '0 seconds';

  const units = [
    { label: 'day', value: 1000 * 60 * 60 * 24 },
    { label: 'hour', value: 1000 * 60 * 60 },
    { label: 'minute', value: 1000 * 60 },
    { label: 'second', value: 1000 }
  ];

  const parts = [];
  let remainder = Math.floor(ms);

  for (const unit of units) {
    const amount = Math.floor(remainder / unit.value);
    if (amount > 0) {
      parts.push(`${amount} ${unit.label}${amount === 1 ? '' : 's'}`);
      remainder -= amount * unit.value;
    }
    if (parts.length >= 3) break;
  }

  if (!parts.length) {
    return 'less than a second';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const last = parts.pop();
  return `${parts.join(', ')} and ${last}`;
};

const buildStatsComponents = (client) => {
  const guilds = client.guilds.cache;
  const totalGuilds = guilds.size;
  const totalMembers = guilds.reduce((acc, guild) => acc + (guild.memberCount ?? 0), 0);
  const totalChannels = guilds.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
  const commandCount = client.commands?.size ?? 0;
  const latency = Math.round(client.ws.ping);
  const uptime = formatDetailedDuration(client.uptime ?? 0);
  const memoryUsageMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const shardIds = client.shard?.ids ?? (typeof client.shard?.id === 'number' ? [client.shard.id] : [0]);
  const totalShards = client.shard?.count ?? shardIds.length;
  const shardDisplay = shardIds.map((id) => `#${id}`).join(', ');
  const readyTimestamp = client.readyAt
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(client.readyAt)
    : 'Starting…';
  const packageVersion = pkg.version ?? '0.0.0';

  const container = new ContainerBuilder();

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`${EMOJIS.bot} **${client.user?.username ?? 'Bot'} Statistics**`)
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      `**Guilds:** ${numberFormatter.format(totalGuilds)}\n\n` +
      `**Total Shards:** ${numberFormatter.format(totalShards)}\n\n` +
      `**Cluster Uptime:** ${uptime}`
    )
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      `**Library:** discord.js v${discordJsVersion}\n\n` +
      `**Node.js:** ${process.version}\n\n` +
      `**Bot Version:** v${packageVersion}`
    )
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      `${EMOJIS.ping} **Latency:** ${Number.isFinite(latency) ? `${latency}ms` : 'N/A'}\n` +
      `🧠 **Memory:** ${memoryUsageMb} MB`
    )
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`Shard ${shardDisplay || '#0'} • Ready ${readyTimestamp}`)
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addActionRowComponents((row) =>
    row.setComponents(
      new ButtonBuilder()
        .setCustomId('stats:refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Success)
    )
  );

  return container;
};

export default {
  name: 'botstats',
	description: 'Displays bot statistics',
  aliases: ['botstat'],
  async execute(message) {
    const components = buildStatsComponents(message.client);

    await message.reply({
      components: [components],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: []
};
