import { MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';

export default {
  name: 'uptime',
	description: 'Check bot uptime',
  async execute(message, args) {
    const uptime = message.client.uptime;

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

    const uptimeFormatted = formatUptime(uptime);
    const bot = message.client.user;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`# **${bot.username}'s Uptime**`)
    );

    container.addSeparatorComponents((separator) =>
      separator.setSpacing(SeparatorSpacingSize.Small)
    );

    const uptimeText = `⏱️ **Current Uptime:** ${uptimeFormatted}`;

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(uptimeText)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: []
};
