import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { extractUserId } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import { parseDuration, formatDuration } from '../../../utils/durationParser.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

export default {
  name: 'massmute',
  aliases: ['mmute', 'multimute'],
  description: 'Timeout multiple users at once',
  usage: 'massmute <@user|id> [@user|id ...] <duration> [reason]',
  category: 'Moderation',

  async execute(message, args, client) {

    const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
    const isOwner = message.guild.ownerId === message.author.id;
    const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
    const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
    const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Permission Denied**`,
        'You need **Discord Administrator** + **Antinuke Admin** permissions to use this command.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (!args.length) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Usage Error**`,
        'Usage: `!massmute <@user|id ...> <duration> [reason]`\nExample: `!massmute @user1 @user2 1h Being disruptive`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const botMember = await message.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Bot Permission Missing**`,
        'I need **Timeout Members** permission to use this command.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const userIds = [];
    const seenIds = new Set();
    let reasonTokens = [];
    let durationMs = null;

    for (let i = 0; i < args.length; i += 1) {
      const token = args[i];
      if (token === '|') {
        reasonTokens = args.slice(i + 1);
        break;
      }

      const parsedDuration = parseDuration(token);
      if (parsedDuration && userIds.length > 0 && durationMs === null) {
        durationMs = parsedDuration;
        reasonTokens = args.slice(i + 1);
        break;
      }

      const userId = extractUserId(token);
      if (userId) {
        if (!seenIds.has(userId)) {
          userIds.push(userId);
          seenIds.add(userId);
        }
      } else {
        reasonTokens = args.slice(i);
        break;
      }
    }

    if (userIds.length === 0) {
      const container = buildNotice(
        `# ${EMOJIS.error} **No Users Provided**`,
        'Mention at least one valid user or provide their IDs before the reason.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (durationMs === null) {
      const potentialDuration = reasonTokens.shift();
      if (potentialDuration) {
        const parsed = parseDuration(potentialDuration);
        if (parsed) {
          durationMs = parsed;
        } else {
          reasonTokens.unshift(potentialDuration);
        }
      }
    }

    if (durationMs === null) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Invalid Duration**`,
        'Provide a duration after the user list using values like `30m`, `1h`, `7d` (max 28d).'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const reason = reasonTokens.length ? reasonTokens.join(' ').trim() : '';
    const reasonText = reason || 'No reason provided';

    const successes = [];
    const failures = [];

    for (const userId of userIds) {
      if (userId === message.author.id) {
        failures.push(`• <@${userId}> — Cannot mute yourself.`);
        continue;
      }

      if (userId === botMember.id) {
        failures.push(`• <@${userId}> — Cannot mute myself.`);
        continue;
      }

      if (userId === message.guild.ownerId) {
        failures.push(`• <@${userId}> — Cannot mute the server owner.`);
        continue;
      }

      const member = await message.guild.members.fetch(userId).catch(() => null);

      if (!member) {
        failures.push(`• <@${userId}> — Member not found or not in the guild.`);
        continue;
      }

      if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && member.roles.highest.position >= message.member.roles.highest.position) {
        failures.push(`${formatUserDisplay(member.user)} — Target has equal or higher role than you.`);
        continue;
      }

      if (member.roles.highest.position >= botMember.roles.highest.position) {
        failures.push(`${formatUserDisplay(member.user)} — Target has equal or higher role than me.`);
        continue;
      }

      try {

        markCommandInvoker(message.guild.id, 'massmute', userId, message.author);

        await member.timeout(durationMs, `Mass mute: ${reasonText}`);
        successes.push(formatUserDisplay(member.user));
      } catch (error) {
        failures.push(`${formatUserDisplay(member.user)} — ${error?.message || 'Failed to mute.'}`);
      }
    }

    const summaryParts = [];
    if (successes.length) {
      summaryParts.push(`**Muted (${successes.length})**
${successes.map((userText) => `• ${userText}`).join('\n')}`);
    }

    if (failures.length) {
      summaryParts.push(`**Failed (${failures.length})**
${failures.join('\n')}`);
    }

    const description = summaryParts.join('\n\n') || 'No users were processed.';

    if (successes.length > 0) {
      await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_MASS_ACTION, {
        executor: message.author,
        action: 'Mass Mute',
        count: successes.length,
        duration: durationMs,
        reason: reasonText,
        details: `Muted ${successes.length} user(s) for ${formatDuration(durationMs)}${failures.length > 0 ? `, ${failures.length} failed` : ''}`
      });
    }

    const container = buildNotice(
      `# ${EMOJIS.success} **Mass Mute Report**`,
      `${description}

**Duration:** ${formatDuration(durationMs)}
**Reason:** ${reasonText}`
    );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },

  components: []
};
