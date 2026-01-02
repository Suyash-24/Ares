import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  PermissionsBitField,
  SeparatorSpacingSize
} from 'discord.js';
import EMOJIS from '../../utils/emojis.js';

const COMPONENT_IDS = {
  permissions: 'userinfo:permissions'
};

const MAX_ROLE_MENTIONS = 8;
const MAX_PERMISSIONS_PREVIEW = 12;

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Unknown';
  }

  const unixSeconds = Math.floor(timestamp / 1000);
  return `<t:${unixSeconds}:F> (<t:${unixSeconds}:R>)`;
};

const formatRoleMentions = (member) => {
  if (!member) {
    return 'User is not in this server.';
  }

  const roles = member.roles.cache
    .filter((role) => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position);

  if (!roles.size) {
    return 'No additional roles.';
  }

  const topRoles = roles.first(MAX_ROLE_MENTIONS);
  const remaining = roles.size - topRoles.length;
  const roleLine = topRoles.map((role) => role.toString()).join(' ');

  return remaining > 0 ? `${roleLine} (+${remaining} more)` : roleLine;
};

const formatPermissionsPreview = (member) => {
  if (!member) {
    return {
      previewText: 'User is not in this server.',
      extraCount: 0,
      fullList: []
    };
  }

  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return {
      previewText: 'Administrator (all permissions).',
      extraCount: 0,
      fullList: ['Administrator (all permissions).']
    };
  }

  const permissions = member.permissions.toArray();

  if (!permissions.length) {
    return {
      previewText: 'No guild permissions.',
      extraCount: 0,
      fullList: []
    };
  }

  const readable = permissions
    .map((perm) => perm.toLowerCase().replace(/_/g, ' '))
    .map((perm) => perm.replace(/\b\w/g, (char) => char.toUpperCase()));

  const preview = readable.slice(0, MAX_PERMISSIONS_PREVIEW);
  const extraCount = Math.max(readable.length - preview.length, 0);

  const lines = [];
  for (let index = 0; index < preview.length; index += 4) {
    const group = preview.slice(index, index + 4).join(', ');
    if (group.length > 0) {
      lines.push(group);
    }
  }

  const previewText = lines.length ? lines.join('\n') : 'No guild permissions.';

  return {
    previewText,
    extraCount,
    fullList: readable
  };
};

const buildUserInfoComponents = ({
  user,
  member,
  avatarUrl,
  bannerUrl,
  permissionsInfo
}) => {
  const displayName = member?.displayName ?? user.globalName ?? user.username;
  const userIcon = EMOJIS.user ? `${EMOJIS.user} ` : '';
  const container = new ContainerBuilder();

  container.addSectionComponents((section) => {
    section.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `${userIcon}**${user.tag ?? user.username}**\nID: ${user.id}\n\n` +
        `**Display Name**\n${displayName}\n\n` +
        `**Creation Date**\n${formatTimestamp(user.createdTimestamp)}\n\n` +
        `**Server Join Date**\n${formatTimestamp(member?.joinedTimestamp)}`
      )
    );

    section.setThumbnailAccessory((thumbnail) =>
      thumbnail.setURL(avatarUrl).setDescription('User avatar preview')
    );

    return section;
  });

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      `**Roles (${member ? Math.max(member.roles.cache.size - 1, 0) : 0})**\n${formatRoleMentions(member)}`
    )
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  const permissionsPreview = permissionsInfo?.previewText ?? 'No guild permissions.';
  const extraPermissionsNote = permissionsInfo?.extraCount > 0
    ? `\n${permissionsInfo.extraCount}+ more`
    : '';

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(
      `**Permissions**\n${permissionsPreview}${extraPermissionsNote}`
    )
  );

  container.addSeparatorComponents((separator) =>
    separator.setSpacing(SeparatorSpacingSize.Small)
  );

  container.addActionRowComponents((actionRow) => {
    const buttons = [
      new ButtonBuilder()
        .setLabel('View Avatar')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl)
    ];

    buttons.push(
      bannerUrl
        ? new ButtonBuilder()
            .setLabel('View Banner')
            .setStyle(ButtonStyle.Link)
            .setURL(bannerUrl)
        : new ButtonBuilder()
            .setCustomId('userinfo:no-banner')
            .setLabel('View Banner')
      .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    );

    actionRow.setComponents(...buttons);
    return actionRow;
  });

  return [container];
};

export {
  COMPONENT_IDS,
  buildUserInfoComponents,
  formatPermissionsPreview
};
