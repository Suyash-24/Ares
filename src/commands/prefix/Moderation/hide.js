import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ChannelType } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

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

const resolveTarget = async (guild, input) => {
  if (!input) return { type: null };
  const clean = input.replace(/[<@&!>]/g, '');
  const role = guild.roles.cache.get(clean) || guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
  if (role) return { type: 'role', role };
  try {
    const member = guild.members.cache.get(clean) || await guild.members.fetch(clean).catch(() => null);
    if (member) return { type: 'member', member };
  } catch (e) {}
  return { type: null };
};

export default {
  name: 'hide',
  description: 'Hide a channel from a role or member.',
  usage: 'hide <channel> <role|member>',
  category: 'Moderation',

  async execute(message, args, client) {
    let channelArg = null;
    let targetArg = null;
    if (args.length === 0) {
      channelArg = null;
      targetArg = null;
    } else if (args.length === 1) {
      channelArg = args[0];
      targetArg = null;
    } else {
      channelArg = args[0];
      targetArg = args[1];
    }

    let channel = null;
    let target = null;
    if (channelArg && !targetArg) {
      const maybeChannel = resolveChannel(message.guild, channelArg);
      if (maybeChannel) {
        channel = maybeChannel;
        const everyoneRole = message.guild.roles.everyone;
        target = { type: 'role', role: everyoneRole };
      } else {
        channel = null;
        target = await resolveTarget(message.guild, channelArg);
        if (!target.type) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Target Not Found`, 'Could not find the specified role or member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
    } else if (channelArg && targetArg) {
      channel = resolveChannel(message.guild, channelArg);
      if (!channel) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Provide a valid channel that supports permission overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      target = await resolveTarget(message.guild, targetArg);
      if (!target.type) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Target Not Found`, 'Could not find the specified role or member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } else {
      channel = message.channel;
      const everyoneRole = message.guild.roles.everyone;
      target = { type: 'role', role: everyoneRole };
    }

    const hasDefault = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasHeadmod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
    if (!hasDefault && !hasHeadmod) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, getModerationPermissionErrors.insufficient_permissions)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I need the Manage Channels permission to edit channel overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!channel || typeof channel.permissionOverwrites?.edit !== 'function') return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Provide a valid channel that supports permission overwrites.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!target || !target.type) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Target Not Found`, 'Could not find the specified role or member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
    const botHighest = botMember.roles.highest?.position ?? 0;

    if (target.type === 'role') {
      const { role } = target;
      if (role.managed) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'Cannot modify a managed/integration role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      if (role.position >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'I cannot modify a role equal to or higher than my highest role. Move my bot role above the target role or lower the target role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      const overwrite = channel.permissionOverwrites.cache.get(role.id);
      const prevAllow = overwrite?.allow?.toArray?.() || [];
      const prevDeny = overwrite?.deny?.toArray?.() || [];
      const existed = Boolean(overwrite);
      try {
        await client.db.updateOne({ guildId: message.guildId }, { $set: { [`moderation.hiddenChannelStates.${channel.id}.r:${role.id}`]: { allow: prevAllow, deny: prevDeny, existed } } }, { upsert: true });

        const doc = await client.db.findOne({ guildId: message.guildId }).catch(() => null);
        const stored = doc?.moderation?.hiddenChannelStates?.[channel.id]?.[`r:${role.id}`];
        if (!stored) {
          console.error('[hide] DB write verification failed — aborting hide to avoid losing prior state');
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Error`, 'Failed to persist previous overwrite state. Aborting hide to avoid data loss. Try again or check the database.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
      } catch (err) {
        console.error('[hide] failed to persist previous state:', err?.stack ?? err?.message ?? err);
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Error`, 'Failed to persist previous overwrite state. Aborting hide to avoid data loss.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      try {

        markCommandInvoker(message.guild.id, 'hide', role.id, message.author);

        await channel.permissionOverwrites.edit(role, { ViewChannel: false });
      } catch (err) {
        console.error('[hide] failed to edit overwrite:', err?.stack ?? err?.message ?? err);
        const reason = typeof err?.message === 'string' ? `\n\nError: ${err.message}` : '';
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, `Failed to update permission overwrites. Ensure I have sufficient permissions and role hierarchy.${reason}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      await sendLog(client, message.guildId, LOG_EVENTS.MOD_HIDE, {
        executor: message.author,
        channel: channel,
        role: role,
        thumbnail: message.guild.iconURL({ dynamic: true })
      });

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Hidden`, `Role **${role.name}** can no longer view ${channel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (target.type === 'member') {
      const { member } = target;
      if (member.id === message.guild.ownerId) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Owner`, 'Cannot modify the guild owner.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      const memberHighest = member.roles.highest?.position ?? 0;
      if (memberHighest >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Member`, 'I cannot modify a member with roles equal to or higher than my highest role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      const overwrite = channel.permissionOverwrites.cache.get(member.id);
      const prevAllow = overwrite?.allow?.toArray?.() || [];
      const prevDeny = overwrite?.deny?.toArray?.() || [];
      const existed = Boolean(overwrite);
      try {
        await client.db.updateOne({ guildId: message.guildId }, { $set: { [`moderation.hiddenChannelStates.${channel.id}.m:${member.id}`]: { allow: prevAllow, deny: prevDeny, existed } } }, { upsert: true });

        const doc = await client.db.findOne({ guildId: message.guildId }).catch(() => null);
        const stored = doc?.moderation?.hiddenChannelStates?.[channel.id]?.[`m:${member.id}`];
        if (!stored) {
          console.error('[hide] DB write verification failed — aborting hide to avoid losing prior state');
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Error`, 'Failed to persist previous overwrite state. Aborting hide to avoid data loss. Try again or check the database.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
      } catch (err) {
        console.error('[hide] failed to persist previous state:', err?.stack ?? err?.message ?? err);
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Error`, 'Failed to persist previous overwrite state. Aborting hide to avoid data loss.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      try {

        markCommandInvoker(message.guild.id, 'hide', member.id, message.author);

        await channel.permissionOverwrites.edit(member, { ViewChannel: false });
      } catch (err) {
        console.error('[hide] failed to edit overwrite:', err?.stack ?? err?.message ?? err);
        const reason = typeof err?.message === 'string' ? `\n\nError: ${err.message}` : '';
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, `Failed to update permission overwrites. Ensure I have sufficient permissions and role hierarchy.${reason}`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      await sendLog(client, message.guildId, LOG_EVENTS.MOD_HIDE, {
        executor: message.author,
        target: member.user,
        channel: channel,
        thumbnail: member.user.displayAvatarURL({ dynamic: true })
      });

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Hidden`, `Member **${member.user.tag}** can no longer view ${channel}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
  }
};
