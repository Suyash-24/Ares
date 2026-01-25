import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

const MODERATION_PERMISSIONS = [
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.MentionEveryone
].filter(Boolean);

const isStaffRole = (role) => {
  if (!role.permissions || role.permissions.bitfield === undefined) {
    return false;
  }
  const perms = BigInt(role.permissions.bitfield);
  return MODERATION_PERMISSIONS.some(perm => {
    if (!perm) return false;
    return (perms & BigInt(perm)) !== 0n;
  });
};

export default {
  name: 'voidstaff',
  description: 'Remove all staff roles from a member',
  usage: 'voidstaff <@user>',
  category: 'Moderation',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = buildNotice(
        `${EMOJIS.error} **Permission Denied**`,
        'Only administrators can use this command.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const userMention = message.mentions.users.first() || (args[0] && await message.guild.members.fetch(args[0]).then(m => m.user).catch(() => null));

    if (!userMention) {
      const container = buildNotice(
        `${EMOJIS.error} **Invalid User**`,
        'Please mention a user or provide their ID.\n\nUsage: `!voidstaff @user`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      const member = await message.guild.members.fetch(userMention.id);

      if (!member) {
        const container = buildNotice(
          `${EMOJIS.error} **Member Not Found**`,
          'Could not find this member in the guild.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      if (member.roles.highest.position >= message.member.roles.highest.position) {
        const container = buildNotice(
          `${EMOJIS.error} **Error**`,
          `You cannot remove staff roles from ${userMention.username} because their highest role is equal to or higher than yours.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const botMember = await message.guild.members.fetchMe();
      if (member.roles.highest.position >= botMember.roles.highest.position) {
        const container = buildNotice(
          `${EMOJIS.error} **Error**`,
          `I cannot remove staff roles from ${userMention.username} because their highest role is equal to or higher than mine.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const config = message.client.config;
      const customStaffRoles = [
        config.supportRoles,
        config.modRoles,
        config.headmodRoles
      ].filter(Boolean).flat();

      const staffRolesToRemove = member.roles.cache.filter(role =>
        role.id !== message.guild.id && (isStaffRole(role) || customStaffRoles.includes(role.id))
      );

      if (staffRolesToRemove.size === 0) {
        const container = buildNotice(
          `${EMOJIS.error} **No Staff Roles Found**`,
          `${userMention.username} does not have any staff roles to remove.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const removedRoleNames = [];
      for (const role of staffRolesToRemove.values()) {
        try {
          await member.roles.remove(role);
          removedRoleNames.push(role.name);
        } catch (err) {
          console.error(`Failed to remove role ${role.name}:`, err);
        }
      }

      const container = buildNotice(
        `${EMOJIS.success} **Staff Roles Removed**`,
        `Removed ${removedRoleNames.length} staff role(s) from ${userMention.username}:\n${removedRoleNames.map(r => `• ${r}`).join('\n')}`
      );

      await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_VOIDSTAFF, {
        executor: message.author,
        target: userMention,
        rolesRemoved: removedRoleNames,
        thumbnail: userMention.displayAvatarURL({ dynamic: true })
      });

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });

    } catch (error) {
      console.error('Error removing staff roles:', error);
      const container = buildNotice(
        `${EMOJIS.error} **Error**`,
        'Failed to remove staff roles. Please try again later.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }
  },

  components: []
};
