import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { extractUserId } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
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
  name: 'masskick',
  description: 'Kick multiple users at once',
  aliases: ['mkick', 'multikick'],
  usage: 'masskick <@user|id> [@user|id ...] [reason]',
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

    const botMember = await message.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Bot Permission Missing**`,
        'I need **Kick Members** permission to use this command.'
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
        'Provide at least one user mention or ID.\nExample: `!masskick @user1 @user2 Being disruptive`'
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

    for (let i = 0; i < args.length; i += 1) {
      const token = args[i];
      if (token === '|') {
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

    const reason = reasonTokens.length ? reasonTokens.join(' ').trim() : '';
    const reasonText = reason || 'No reason provided';

    const successes = [];
    const failures = [];

    for (const userId of userIds) {
      if (userId === message.author.id) {
        failures.push(`• <@${userId}> — Cannot kick yourself.`);
        continue;
      }

      if (userId === message.guild.members.me.id) {
        failures.push(`• <@${userId}> — Cannot kick myself.`);
        continue;
      }

      if (userId === message.guild.ownerId) {
        failures.push(`• <@${userId}> — Cannot kick the server owner.`);
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

        markCommandInvoker(message.guild.id, 'masskick', userId, message.author);

        await member.kick(`Mass kick: ${reasonText}`);
        successes.push(formatUserDisplay(member.user));
      } catch (error) {
        failures.push(`${formatUserDisplay(member.user)} — ${error?.message || 'Failed to kick.'}`);
      }
    }

    const summaryParts = [];
    if (successes.length) {
      summaryParts.push(`**Kicked (${successes.length})**
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
        action: 'Mass Kick',
        count: successes.length,
        reason: reasonText,
        details: `Kicked ${successes.length} user(s)${failures.length > 0 ? `, ${failures.length} failed` : ''}`
      });
    }

    const container = buildNotice(
      `# ${EMOJIS.success} **Mass Kick Report**`,
      `${description}

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
