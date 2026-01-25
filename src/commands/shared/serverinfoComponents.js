import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize
} from 'discord.js';
import EMOJIS from '../../utils/emojis.js';

const MAX_ROLE_PREVIEW = 8;
const VERIFICATION_LABELS = ['None', 'Low', 'Medium', '(╯°□°）╯︵ ┻━┻', 'Highest'];

const numberFormatter = new Intl.NumberFormat('en-US');

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Unknown';
  }

  const unixSeconds = Math.floor(timestamp / 1000);
  const dateStr = `<t:${unixSeconds}:F>`;
  const relativeStr = `<t:${unixSeconds}:R>`;
  return `${dateStr}\n${relativeStr}`;
};

const formatVerificationLevel = (level) => {
  if (typeof level !== 'number') {
    return 'Unknown';
  }
  return VERIFICATION_LABELS[level] ?? 'Unknown';
};

const formatPremiumState = (guild) => {
  if (!guild) {
    return 'Inactive';
  }

  const boostCount = guild.premiumSubscriptionCount ?? 0;
  if (!boostCount) {
    return 'Inactive';
  }

  const tier = guild.premiumTier ?? 0;
  const tierLabel = typeof tier === 'number' ? `Level ${tier}` : tier;
  const boostLabel = `${boostCount} boost${boostCount === 1 ? '' : 's'}`;
  return `Active (${boostLabel}, ${tierLabel})`;
};

const formatOwner = (owner) => {
  if (!owner) {
    return 'Unknown';
  }

  const tag = owner.user?.tag ?? owner.user?.username ?? 'Unknown';
  return `${owner} (${tag})`;
};

const formatRolePreview = (guild) => {
  const roles = guild.roles.cache.filter((role) => role.id !== guild.id).sort((a, b) => b.position - a.position);

  if (!roles.size) {
    return 'No additional roles.';
  }

  const topRoles = roles.first(MAX_ROLE_PREVIEW);
  const remaining = roles.size - topRoles.length;

  const lines = [];
  for (let i = 0; i < topRoles.length; i += 4) {
    const roleGroup = topRoles.slice(i, i + 4).map((role) => role.toString()).join(', ');
    lines.push(roleGroup);
  }

  const roleList = lines.join('\n');

  return remaining > 0 ? `${roleList}\nand ${remaining} other role${remaining === 1 ? '' : 's'}` : roleList;
};

const buildServerInfoComponents = ({ guild, owner, iconUrl, bannerUrl, channelCount, textChannelCount, voiceChannelCount, botCount, commandUser, userAvatarUrl, botName, botAvatarUrl, timestamp }) => {
  const displayName = guild.name ?? 'Unknown Server';
  const memberCount = numberFormatter.format(guild.memberCount ?? 0);
  const formattedTextChannels = numberFormatter.format(textChannelCount ?? 0);
  const formattedVoiceChannels = numberFormatter.format(voiceChannelCount ?? 0);
  const formattedBotCount = numberFormatter.format(botCount ?? 0);
  const rolesCount = guild.roles.cache ? Math.max(guild.roles.cache.size - 1, 0) : 0;
  const rolePreview = formatRolePreview(guild);
  const container = new ContainerBuilder();

  const userName = commandUser?.username ?? 'Unknown User';

  const infoText = `**${userName}**\n\n` +
    `${EMOJIS?.server || '🏷️'} **${displayName}**\n\n` +
    `${EMOJIS?.owner || '👑'} **Owner:** ${formatOwner(owner)}\n` +
    `${EMOJIS?.channels || '📁'} **Text Channels:** ${formattedTextChannels}\n` +
    `${EMOJIS?.voice || '🎤'} **Voice Channels:** ${formattedVoiceChannels}\n` +
    `${EMOJIS?.members || '👥'} **Members:** ${memberCount}\n` +
    `${EMOJIS?.bot || '🤖'} **Bots:** ${formattedBotCount}\n` +
    `${EMOJIS?.security || '🔒'} **Security Level:** ${formatVerificationLevel(guild.verificationLevel)}\n` +
    `${EMOJIS?.id || '🆔'} **Server ID:** ${guild.id}\n` +
    `${EMOJIS?.date || '📅'} **Creation Date:**\n${formatTimestamp(guild.createdTimestamp)}`;

  container.addSectionComponents((section) => {
    section.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(infoText)
    );

    if (iconUrl) {
      section.setThumbnailAccessory((thumbnail) =>
        thumbnail.setURL(iconUrl).setDescription('Server icon')
      );
    }

    return section;
  });

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`${EMOJIS?.roles || '🔐'} **Roles (${rolesCount})**\n${rolePreview}`)
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  const footerText = `${botName || 'Bot'} • ${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}`;

  container.addActionRowComponents((actionRow) => {
    const buttons = [
      iconUrl
        ? new ButtonBuilder()
            .setLabel('View Icon')
            .setStyle(ButtonStyle.Link)
            .setURL(iconUrl)
        : new ButtonBuilder()
            .setCustomId('serverinfo:no-icon')
            .setLabel('View Icon')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    ];

    buttons.push(
      bannerUrl
        ? new ButtonBuilder()
            .setLabel('View Banner')
            .setStyle(ButtonStyle.Link)
            .setURL(bannerUrl)
        : new ButtonBuilder()
            .setCustomId('serverinfo:no-banner')
            .setLabel('View Banner')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    actionRow.setComponents(...buttons);
    return actionRow;
  });

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(footerText)
  );

  return [container];
};

export { buildServerInfoComponents };
