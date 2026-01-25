import {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(td => td.setContent(title));
  container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(td => td.setContent(description));
  return container;
};

function parseDuration(s) {
  if (!s) return null;
  const m = s.match(/^(\d+)(s|m)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2].toLowerCase() === 's' ? n * 1000 : n * 60 * 1000;
}

export default {
  name: 'raidwipe',
  description: 'Remove members who joined within a recent time window (raid response).',
  usage: 'raidwipe <time> <ban|kick> [reason...]',
  category: 'Moderation',

  async execute(message, args, client) {
    if (!message.guild) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Guild Only`,
        'This command can only be used in a guild.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
    const isOwner = message.guild.ownerId === message.author.id;
    const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
    const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
    const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Missing Permissions`,
        'You need **Discord Administrator** + **Antinuke Admin** permissions to use this command.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const executor = message.member;
    const me = message.guild.members.me;

    if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Missing Permissions`,
        'You need the Ban Members permission to use this command.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (!args || args.length < 2) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Missing Arguments`,
        `Usage: ${this.usage}`
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const timeArg = args[0];
    const action = String(args[1] || '').toLowerCase();
    const remaining = args.slice(2);
    const confirmRequested = remaining.includes('confirm') || remaining.includes('--confirm');
    const reason =
      remaining.filter(r => r !== 'confirm' && r !== '--confirm').join(' ') ||
      `Raidwipe by ${message.author.tag}`;

    const durationMs = parseDuration(timeArg);
    if (durationMs === null) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Invalid Time`,
        'Invalid time format. Use formats like `10s` or `5m`.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (durationMs < 1000) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Invalid Time`,
        'Duration must be at least 1 second.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (durationMs > 15 * 60 * 1000) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Too Large`,
        'Maximum allowed time is 15 minutes.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (!['ban', 'kick'].includes(action)) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Invalid Action`,
        'Action must be `ban` or `kick`.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (action === 'ban' && !me.permissions.has(PermissionFlagsBits.BanMembers)) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Missing Bot Permission`,
        'I need the Ban Members permission to perform bans.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (action === 'kick' && !me.permissions.has(PermissionFlagsBits.KickMembers)) {
      const c = buildNotice(
        `# ${EMOJIS.error || '❌'} Missing Bot Permission`,
        'I need the Kick Members permission to perform kicks.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const cutoff = Date.now() - durationMs;
    await message.guild.members.fetch();

    const filtered = message.guild.members.cache.filter(
      m => m.joinedTimestamp && m.joinedTimestamp >= cutoff
    );

    const totalFiltered = filtered.size;

    if (totalFiltered === 0) {
      const c = buildNotice(
        `# ${EMOJIS.info || 'ℹ️'} No Matches`,
        'No members found who joined within that time window.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const executorIsOwner = message.guild.ownerId === executor.id;
    const botHighest = me.roles.highest?.position ?? 0;
    const execHighest = executor.roles.highest?.position ?? 0;
    const safeThreshold = 25;

    const results = {
      totalFiltered,
      eligible: 0,
      successful: 0,
      failed: 0,
      protectedByHierarchy: 0
    };

    const toProcess = [];

    for (const member of filtered.values()) {
      if (!member || !member.id) continue;

      if (member.id === executor.id) {
        results.protectedByHierarchy++;
        continue;
      }
      if (member.id === me.id) {
        results.protectedByHierarchy++;
        continue;
      }
      if (member.id === message.guild.ownerId) {
        results.protectedByHierarchy++;
        continue;
      }
      if (member.user?.bot) {
        results.protectedByHierarchy++;
        continue;
      }
      if (member.roles.cache.some(r => r.managed)) {
        results.protectedByHierarchy++;
        continue;
      }

      const targetHighest = member.roles.highest?.position ?? 0;

      if (!executorIsOwner && execHighest <= targetHighest) {
        results.protectedByHierarchy++;
        continue;
      }

      if (botHighest <= targetHighest) {
        results.protectedByHierarchy++;
        continue;
      }

      toProcess.push(member);
    }

    results.eligible = toProcess.length;

    if (results.eligible === 0) {
      const c = buildNotice(
        `# ${EMOJIS.info || 'ℹ️'} No Eligible Members`,
        'No eligible members to remove after hierarchy and managed-role checks.'
      );
      return message.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (results.eligible > safeThreshold && !confirmRequested) {
      const confirmId = `raidwipe_confirm_${message.author.id}_${message.guildId}_${Date.now()}`;
      const cancelId = `raidwipe_cancel_${message.author.id}_${message.guildId}_${Date.now()}`;

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td =>
        td.setContent(`# ${EMOJIS.warning || '⚠️'} Confirmation Required`)
      );
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td =>
        td.setContent(
          `There are **${results.eligible}** eligible members to **${action}**.\nThis exceeds the safe threshold of ${safeThreshold}. Click Confirm to proceed or Cancel to abort.`
        )
      );
      container.addActionRowComponents(row => {
        const confirmBtn = new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger);

        const cancelBtn = new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary);

        row.setComponents(confirmBtn, cancelBtn);
        return row;
      });

      if (!client.raidwipeConfirmations) client.raidwipeConfirmations = new Map();

      const toProcessIds = toProcess.map(m => m.id);
      client.raidwipeConfirmations.set(confirmId, {
        guildId: message.guildId,
        authorId: message.author.id,
        action,
        reason,
        toProcessIds
      });
      client.raidwipeConfirmations.set(cancelId, true);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    for (const member of toProcess) {
      try {
        if (action === 'ban') {

          markCommandInvoker(message.guild.id, 'raidwipe', member.id, message.author);

          await member.ban({ reason, deleteMessageSeconds: 0 });
        } else {

          markCommandInvoker(message.guild.id, 'raidwipe', member.id, message.author);

          await member.kick(reason);
        }
        results.successful++;
      } catch {
        results.failed++;
      }
    }

    const summary = new ContainerBuilder();
    summary.addTextDisplayComponents(td =>
      td.setContent(`# ${EMOJIS.success || '✅'} Raidwipe Summary`)
    );
    summary.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    summary.addTextDisplayComponents(td => td.setContent(`**Time Window:** ${timeArg}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Action:** ${action}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Found matching members:** ${results.totalFiltered}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Eligible after checks:** ${results.eligible}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Removed successfully:** ${results.successful}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Failed removals:** ${results.failed}`));
    summary.addTextDisplayComponents(td => td.setContent(`**Protected:** ${results.protectedByHierarchy}`));

    if (results.successful > 0) {
      await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_RAIDWIPE, {
        executor: message.author,
        action: action === 'ban' ? 'Banned' : 'Kicked',
        count: results.successful,
        timeWindow: timeArg,
        reason: reason,
        details: `Raidwipe: ${results.successful} ${action === 'ban' ? 'banned' : 'kicked'}, ${results.failed} failed, ${results.protectedByHierarchy} protected`
      });
    }

    return message.reply({
      components: [summary],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  }
};
