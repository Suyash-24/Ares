import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(title));
  container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(description));
  return container;
};

const resolveChannel = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<#>]/g, '');
  let ch = guild.channels.cache.get(clean);
  if (!ch) ch = guild.channels.cache.find(c => c.name.toLowerCase() === input.toLowerCase());
  return ch;
};

const resolveRole = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<@&>]/g, '');
  let role = guild.roles.cache.get(clean);
  if (!role) role = guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
  return role;
};

export default {
  name: 'talk',
  description: 'Toggle Send Messages permission for a role in a channel.',
  usage: 'talk <channel> <role>',
  category: 'Moderation',

  async execute(message, args, client) {
    if (args.length < 2) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `talk <channel> <role>`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const hasDefaultPerm = message.member.permissions.has('ManageChannels');
    const hasHeadmodRole = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
    if (!hasDefaultPerm && !hasHeadmodRole) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, getModerationPermissionErrors.insufficient_permissions)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has('ManageChannels')) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I need the Manage Channels permission to edit channel overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const channel = resolveChannel(message.guild, args[0]);
    if (!channel || ![ChannelType.GuildText, ChannelType.GuildPublicThread, ChannelType.GuildPrivateThread, ChannelType.GuildAnnouncement, ChannelType.GuildNewsThread].includes(channel.type)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Provide a valid text or thread channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const role = resolveRole(message.guild, args[1]);
    if (!role) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role in this guild.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (role.managed) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'Cannot modify a managed/integration role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
    const botHighest = botMember.roles.highest?.position ?? 0;
    if (role.position >= botHighest) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'I cannot modify a role equal to or higher than my highest role. Move my bot role above the target role or lower the target role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (role.id === message.guild.roles.everyone.id) {
      if (role.position >= botHighest) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify @everyone`, 'I cannot override @everyone role in this guild.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
    }

    const overwrite = channel.permissionOverwrites.cache.get(role.id);
    const sendAllowed = overwrite?.allow?.has(PermissionFlagsBits.SendMessages) ?? false;
    const sendDenied = overwrite?.deny?.has(PermissionFlagsBits.SendMessages) ?? false;

    let action;
    try {

      if (sendAllowed) {
        await channel.permissionOverwrites.edit(role, { SendMessages: false });
        action = 'denied';
      } else {
        await channel.permissionOverwrites.edit(role, { SendMessages: true });
        action = 'allowed';
      }
    } catch (err) {
      console.error('[talk] failed to edit permission overwrite:', err?.stack ?? err?.message ?? err);
      const reason = typeof err?.message === 'string' ? `
\nError: ${err.message}` : '';
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, `Failed to update channel permission overwrites. Ensure I have sufficient permissions and that my role is above the target role.${reason}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (action === 'allowed') {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Permission Updated`, `Role **${role.name}** can now send messages in ${channel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Permission Updated`, `Role **${role.name}** is now prevented from sending messages in ${channel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
