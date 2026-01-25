import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { ModerationPermissions } from '../../../utils/ModerationPermissions.js';
import { parseTime, formatDuration } from '../../../utils/timeParser.js';
import EMOJIS from '../../../utils/emojis.js';
import { scheduleSlowmodeClear, extendSlowmode } from '../../../utils/slowmodeManager.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const parseEmoji = (raw) => {
  if (!raw) return undefined;
  const m = String(raw).match(/^<a?:([^:>]+):(\d+)>$/);
  if (m) return { id: m[2], name: m[1] };
  return raw;
};

const MAX_SLOWMODE = 21600;

const buildEmbed = (title, desc) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(td => td.setContent(title));
  container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(td => td.setContent(desc));
  return container;
};

export default {
  name: 'slowmode',
  aliases: ['sm'],
  description: 'Manage channel slowmode (interval and optional duration).',
  usage: 'slowmode [time|off] [duration]',
  category: 'Moderation',

  async execute(message, args, client) {
    const hasDefault = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasHeadmod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
    const hasMod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'mod');
    const hasSupport = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'support');
    if (!hasDefault && !hasHeadmod && !hasMod && !hasSupport) {
      const container = buildEmbed(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Channels** permission or a configured moderator role to use this command.');
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const container = buildEmbed(`# ${EMOJIS.error} Missing Permissions`, 'I need the **Manage Channels** permission to change slowmode.');
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const channel = message.channel;
    if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
      const container = buildEmbed(`# ${EMOJIS.error} Invalid Channel`, 'This command can only be used in text-based channels.');
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let timeArg = args[0];
    let durationArg = args[1];

    if (args.length >= 3 && durationArg === '|' && args[2]) {
      durationArg = args[2];
    }

    if (typeof timeArg === 'string' && /[|,\/]/.test(timeArg)) {
      const parts = timeArg.split(/[|,\/]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 1) timeArg = parts[0];
      if (!durationArg && parts.length >= 2) durationArg = parts[1];
    }

    if (!timeArg) {
      const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };
      const stored = guildData.moderation?.slowmode?.[channel.id];
      if (!channel.rateLimitPerUser || channel.rateLimitPerUser === 0) {
        const container = buildEmbed(`# ${EMOJIS.slowmode} Slowmode`, 'Slowmode is disabled.');
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const interval = channel.rateLimitPerUser;
      let remaining = null;
      if (stored && stored.expiresAt) {
        const ms = new Date(stored.expiresAt).getTime() - Date.now();
        remaining = ms > 0 ? formatDuration(ms) : 'expired';
      }
      const desc = remaining ? `Slowmode is enabled with 1 message every ${interval}s for ${remaining}.` : `Slowmode is enabled with 1 message every ${interval}s.`;
      const container = buildEmbed(`# ${EMOJIS.slowmode} Slowmode Active`, desc);

      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addActionRowComponents(row => {
        const disable = new ButtonBuilder().setCustomId(`slowmode_disable_${message.author.id}_${channel.id}`).setLabel('Disable').setStyle(ButtonStyle.Danger);
        const refresh = new ButtonBuilder().setCustomId(`slowmode_refresh_${message.author.id}_${channel.id}`).setLabel('Refresh').setStyle(ButtonStyle.Primary);
        const extendBtn = new ButtonBuilder().setCustomId(`slowmode_extend_${message.author.id}_${channel.id}_30`).setLabel('Extend +30s').setStyle(ButtonStyle.Secondary);
        const disableEmoji = parseEmoji(EMOJIS.disable || EMOJIS.slowmode);
        const refreshEmoji = parseEmoji(EMOJIS.refresh || EMOJIS.slowmode);
        const extendEmoji = parseEmoji(EMOJIS.extend || EMOJIS.slowmode);
        if (disableEmoji) disable.setEmoji(disableEmoji);
        if (refreshEmoji) refresh.setEmoji(refreshEmoji);
        if (extendEmoji) extendBtn.setEmoji(extendEmoji);
        row.setComponents(disable, refresh, extendBtn);
        return row;
      });

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (timeArg.toLowerCase() === 'off') {
      try {

        markCommandInvoker(message.guild.id, 'slowmode', channel.id, message.author);

        await channel.setRateLimitPerUser(0);

        await sendLog(client, message.guildId, LOG_EVENTS.MOD_SLOWMODE, {
          executor: message.author,
          channel: channel,
          content: 'Slowmode disabled',
          channelId: channel.id
        });
      } catch (err) {
        const container = buildEmbed(`# ${EMOJIS.error} Action Failed`, 'Failed to disable slowmode. Ensure I have Manage Channels permission.');
        const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
        container.addActionRowComponents(row => row.setComponents(dismiss));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      try {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };
        if (guildData.moderation && guildData.moderation.slowmode && guildData.moderation.slowmode[channel.id]) {
          delete guildData.moderation.slowmode[channel.id];
          await client.db.updateOne({ guildId: message.guildId }, { $set: guildData }, { upsert: true });
        }
      } catch (e) {}

      const container = buildEmbed(`# ${EMOJIS.slowmode} Disabled`, 'Disabled slowmode.');
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const intervalMs = parseTime(timeArg);
    if (intervalMs === null) {
      const container = buildEmbed(`# ${EMOJIS.error} Invalid Time`, 'Provide a valid interval like `5s`, `10m`, or `1h`.');
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const intervalSeconds = Math.floor(intervalMs / 1000);
    if (intervalSeconds < 0 || intervalSeconds > MAX_SLOWMODE) {
      const container = buildEmbed(`# ${EMOJIS.error} Invalid Interval`, `Interval must be between 1s and ${MAX_SLOWMODE}s.`);
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let expiresAt = null;
    if (durationArg) {
      const durMs = parseTime(durationArg);
      if (durMs === null || durMs < 1000) {
        const container = buildEmbed(`# ${EMOJIS.error} Invalid Duration`, 'Provide a duration like `30s` or `10m`. Duration must be at least 1 second.');
        const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
        container.addActionRowComponents(row => row.setComponents(dismiss));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      expiresAt = new Date(Date.now() + durMs).toISOString();
    }

    try {

      markCommandInvoker(message.guild.id, 'slowmode', channel.id, message.author);

      await channel.setRateLimitPerUser(intervalSeconds);

      await sendLog(client, message.guildId, LOG_EVENTS.MOD_SLOWMODE, {
        executor: message.author,
        channel: channel,
        content: `Slowmode set to ${intervalSeconds} seconds`,
        duration: expiresAt ? formatDuration(durMs) : 'Permanent',
        channelId: channel.id
      });
    } catch (err) {
      const container = buildEmbed(`# ${EMOJIS.error} Action Failed`, 'Failed to set slowmode. Ensure I have Manage Channels permission.');
      const dismiss = new ButtonBuilder().setCustomId(`slowmode_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary);
      container.addActionRowComponents(row => row.setComponents(dismiss));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (expiresAt) {
      try {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
        if (!guildData.moderation) guildData.moderation = {};
        if (!guildData.moderation.slowmode) guildData.moderation.slowmode = {};
        guildData.moderation.slowmode[channel.id] = { interval: intervalSeconds, expiresAt };
        await client.db.updateOne({ guildId: message.guildId }, { $set: guildData }, { upsert: true });
        scheduleSlowmodeClear(client, { guildId: message.guildId, channelId: channel.id, interval: intervalSeconds, expiresAt });
      } catch (e) {
        console.error('Failed to persist slowmode:', e);
      }
    }

    if (expiresAt) {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const humanDur = formatDuration(ms);
      const container = buildEmbed(`# ${EMOJIS.slowmode} Enabled`, `Enabled slowmode with 1 message every ${intervalSeconds}s for ${humanDur}.`);
      const viewBtn = new ButtonBuilder()
        .setCustomId(`slowmode_view_${message.author.id}_${channel.id}`)
        .setLabel('View Status')
        .setStyle(ButtonStyle.Success);
      const viewEmoji3 = parseEmoji(EMOJIS.statuss || EMOJIS.slowmode);
      if (viewEmoji3) viewBtn.setEmoji(viewEmoji3);
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addActionRowComponents(row => row.setComponents(viewBtn));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const container = buildEmbed(`# ${EMOJIS.slowmode} Enabled`, `Enabled slowmode with 1 message every ${intervalSeconds}s.`);
    const viewBtn = new ButtonBuilder()
      .setCustomId(`slowmode_view_${message.author.id}_${channel.id}`)
      .setLabel('View Status')
      .setStyle(ButtonStyle.Success);
    const viewEmoji4 = parseEmoji(EMOJIS.statuss || EMOJIS.slowmode);
    if (viewEmoji4) viewBtn.setEmoji(viewEmoji4);
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(row => row.setComponents(viewBtn));
    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
