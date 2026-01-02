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

export default {
  name: 'fluxfiles',
  description: 'Toggle or set file upload and embed permissions for a channel.',
  usage: 'fluxfiles | fluxfiles on <channel> | fluxfiles off <channel>',
  category: 'Moderation',

  async execute(message, args, client) {
    const hasDefault = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasHeadmod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
    const hasMod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'mod');
    const hasSupport = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'support');
    if (!hasDefault && !hasHeadmod && !hasMod && !hasSupport) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, getModerationPermissionErrors.insufficient_permissions)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I need the Manage Channels permission to edit channel overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const sub = args[0]?.toLowerCase?.();

    if (!sub || (sub !== 'on' && sub !== 'off')) {
      const channel = message.channel;
      if (!channel || typeof channel.permissionOverwrites?.edit !== 'function') return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'This command can only be used in channels that support permission overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const everyone = message.guild.roles.everyone;
      const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
      const botHighest = botMember.roles.highest?.position ?? 0;
      if (everyone.position >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'I cannot modify this role due to role hierarchy.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
      const allowedAttach = Boolean(overwrite?.allow?.has?.(PermissionFlagsBits.AttachFiles));
      const allowedEmbed = Boolean(overwrite?.allow?.has?.(PermissionFlagsBits.EmbedLinks));

      try {
        if (allowedAttach && allowedEmbed) {
          await channel.permissionOverwrites.edit(everyone, { AttachFiles: false, EmbedLinks: false });
          return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Disabled`, 'File uploads and embed links have been disabled in this channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        } else {
          await channel.permissionOverwrites.edit(everyone, { AttachFiles: true, EmbedLinks: true });

          const canAttach = channel.permissionsFor(message.member)?.has(PermissionFlagsBits.AttachFiles);
          const canEmbed = channel.permissionsFor(message.member)?.has(PermissionFlagsBits.EmbedLinks);
          if (!canAttach || !canEmbed) {
            const denyingRoles = [];
            for (const role of message.guild.roles.cache.values()) {
              const ow = channel.permissionOverwrites.cache.get(role.id);
              if (!ow) continue;
              if (!canAttach && ow.deny?.has?.(PermissionFlagsBits.AttachFiles)) denyingRoles.push(role.name);
              if (!canEmbed && ow.deny?.has?.(PermissionFlagsBits.EmbedLinks) && !denyingRoles.includes(role.name)) denyingRoles.push(role.name);
            }
            const denyList = denyingRoles.length ? `\n\nRoles with explicit denies: ${denyingRoles.slice(0, 8).join(', ')}${denyingRoles.length > 8 ? ', ...' : ''}` : '';
            return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enabled`, `File uploads and embed links have been enabled in this channel. However, some role or overwrite settings still prevent you from attaching files or embedding links.${denyList}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }

          return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enabled`, 'File uploads and embed links have been enabled in this channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
      } catch (err) {
        const reason = typeof err?.message === 'string' ? `\n\nError: ${err.message}` : '';
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, `Failed to update permission overwrites. Ensure I have sufficient permissions and role hierarchy.${reason}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
    }

    const targetChannelArg = args[1];
    if (!targetChannelArg) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Channel`, 'Provide a channel argument.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const targetChannel = resolveChannel(message.guild, targetChannelArg);
    if (!targetChannel || typeof targetChannel.permissionOverwrites?.edit !== 'function') return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Provide a valid text-based channel that supports permission overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
    const botHighest = botMember.roles.highest?.position ?? 0;
    const everyone = message.guild.roles.everyone;
    if (everyone.position >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'I cannot modify this role due to role hierarchy.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    try {
      if (sub === 'on') {
        await targetChannel.permissionOverwrites.edit(everyone, { AttachFiles: true, EmbedLinks: true });

        const canAttach = targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.AttachFiles);
        const canEmbed = targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.EmbedLinks);
        if (!canAttach || !canEmbed) {
          const denyingRoles = [];
          for (const role of message.guild.roles.cache.values()) {
            const ow = targetChannel.permissionOverwrites.cache.get(role.id);
            if (!ow) continue;
            if (!canAttach && ow.deny?.has?.(PermissionFlagsBits.AttachFiles)) denyingRoles.push(role.name);
            if (!canEmbed && ow.deny?.has?.(PermissionFlagsBits.EmbedLinks) && !denyingRoles.includes(role.name)) denyingRoles.push(role.name);
          }
          const denyList = denyingRoles.length ? `\n\nRoles with explicit denies: ${denyingRoles.slice(0, 8).join(', ')}${denyingRoles.length > 8 ? ', ...' : ''}` : '';
          return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enabled`, `File uploads and embed links are now enabled in ${targetChannel}. However, some role or overwrite settings still prevent you from attaching files or embedding links.${denyList}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enabled`, `File uploads and embed links are now enabled in ${targetChannel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      await targetChannel.permissionOverwrites.edit(everyone, { AttachFiles: false, EmbedLinks: false });

      const canAttachAfter = targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.AttachFiles);
      const canEmbedAfter = targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.EmbedLinks);
      if (canAttachAfter || canEmbedAfter) {
        const allowingRoles = [];
        for (const role of message.guild.roles.cache.values()) {
          const ow = targetChannel.permissionOverwrites.cache.get(role.id);
          if (!ow) continue;
          if (canAttachAfter && ow.allow?.has?.(PermissionFlagsBits.AttachFiles)) allowingRoles.push(role.name);
          if (canEmbedAfter && ow.allow?.has?.(PermissionFlagsBits.EmbedLinks) && !allowingRoles.includes(role.name)) allowingRoles.push(role.name);
        }
        const allowList = allowingRoles.length ? `\n\nRoles with explicit allows: ${allowingRoles.slice(0, 8).join(', ')}${allowingRoles.length > 8 ? ', ...' : ''}` : '';
        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Disabled`, `File uploads and embed links are now denied for @everyone in ${targetChannel}.\n However, some role overwrites still allow them for you.${allowList}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Disabled`, `File uploads and embed links are now disabled in ${targetChannel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } catch (err) {
      const reason = typeof err?.message === 'string' ? `\n\nError: ${err.message}` : '';
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, `Failed to update permission overwrites. Ensure I have sufficient permissions and role hierarchy.${reason}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
  }
};
