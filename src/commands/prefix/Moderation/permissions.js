import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(td => td.setContent(title));
  container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(td => td.setContent(description));
  return container;
};

const resolveChannel = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<#>]/g, '');
  let channel = guild.channels.cache.get(clean);
  if (!channel) channel = guild.channels.cache.find(c => c.name.toLowerCase() === input.toLowerCase());
  return channel || null;
};

const resolveMember = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<@!>]/g, '');
  let member = guild.members.cache.get(clean);
  if (member) return member;
  const lowered = input.toLowerCase();
  member = guild.members.cache.find(m => (m.user && (m.user.username.toLowerCase() === lowered || `${m.user.username}#${m.user.discriminator}`.toLowerCase() === lowered)) || (m.nickname && m.nickname.toLowerCase() === lowered));
  return member || null;
};

export default {
  name: 'permissions',
  description: 'Show effective permissions for a member (or the bot) in a channel.',
  usage: 'permissions [member] [channel]',
  category: 'Moderation',

  async execute(message, args) {
    if (!message.guild) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Guild Only`, 'This command can only be used in a server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permission`, 'You need either **Manage Roles** or **Manage Channels** to use this command.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let targetMember = null;
    let targetChannel = null;
    let channelProvided = false;

    if (!args || args.length === 0) {
      targetMember = message.member;
      targetChannel = null;
      channelProvided = false;
    } else if (args.length === 1) {

      const maybeMember = resolveMember(message.guild, args[0]);
      if (maybeMember) {
        targetMember = maybeMember;
        targetChannel = null;
        channelProvided = false;
      } else {

        const maybeChannel = resolveChannel(message.guild, args[0]);
        if (maybeChannel) {
          targetMember = message.member;
          targetChannel = maybeChannel;
          channelProvided = true;
        } else {
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Target`, 'Provide a valid member or channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
      }
    } else {

      const maybeMember = resolveMember(message.guild, args[0]);
      if (!maybeMember) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Member`, 'Provide a valid guild member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      const maybeChannel = resolveChannel(message.guild, args[1]);
      if (!maybeChannel) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Provide a valid channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      targetMember = maybeMember;
      targetChannel = maybeChannel;
      channelProvided = true;
    }

    if (channelProvided) {
      if (!targetChannel || typeof targetChannel.permissionsFor !== 'function') {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'The specified channel is not a text-based channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const executorCanView = targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.ViewChannel);
      if (!executorCanView) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot View`, 'You do not have permission to view that channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const botMember = message.guild.members.me || message.guild.members.cache.get(message.client.user.id);
      const botCanView = targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.ViewChannel);
      if (!botCanView) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Bot Cannot View`, 'I do not have permission to view that channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
    }

    let perms;
    try {
      if (channelProvided) perms = targetMember.permissionsIn(targetChannel);
      else perms = targetMember.permissions;
    } catch (err) {
      console.error('[permissions] permissions resolution failed:', err?.message || err);
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Error`, 'Failed to determine permissions for that member/channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const allPermissionKeys = Object.keys(PermissionFlagsBits).filter(k => typeof PermissionFlagsBits[k] === 'number');

    const allowed = perms.has(PermissionFlagsBits.Administrator) ? allPermissionKeys.slice() : perms.toArray();
    const denied = perms.has(PermissionFlagsBits.Administrator) ? [] : allPermissionKeys.filter(p => !allowed.includes(p));

    allowed.sort((a, b) => a.localeCompare(b));
    denied.sort((a, b) => a.localeCompare(b));

    const formatList = arr => (arr.length ? arr.map(x => `- ${x}`).join('\n') : 'None');

    const summaryKeys = {
      'Manage Roles': PermissionFlagsBits.ManageRoles,
      'Manage Channels': PermissionFlagsBits.ManageChannels,
      'Kick Members': PermissionFlagsBits.KickMembers,
      'Ban Members': PermissionFlagsBits.BanMembers,
      'Timeout Members': PermissionFlagsBits.ModerateMembers,
      'View Channel': PermissionFlagsBits.ViewChannel,
      'Send Messages': PermissionFlagsBits.SendMessages,
      'Use Attachments': PermissionFlagsBits.AttachFiles,
      'Mention Everyone': PermissionFlagsBits.MentionEveryone
    };

    const summaryLines = Object.entries(summaryKeys).map(([label, bit]) => `${label}: ${perms.has(bit) ? 'Yes' : 'No'}`);

    const where = channelProvided ? `<#${targetChannel.id}>` : `${message.guild.name}`;
    const title = `Permissions for ${targetMember.user ? `${targetMember.user.tag}` : `${targetMember.id}`} in ${where}`;

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || ''} ${title}`));
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(td => td.setContent(`**Allowed Permissions**\n${formatList(allowed)}`));
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(`**Denied Permissions**\n${formatList(denied)}`));
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(`**Quick Checks**\n${summaryLines.join('\n')}`));

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
