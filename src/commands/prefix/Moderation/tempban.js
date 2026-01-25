import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const generateCaseNumber = (guildData) => {
	if (!guildData.moderation) guildData.moderation = {};
	if (!guildData.moderation.actions) guildData.moderation.actions = [];
	return guildData.moderation.actions.length + 1;
};

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

const parseTime = (timeStr) => {
  const match = timeStr.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24
  };

  return amount * multipliers[unit];
};

export default {
  name: 'tempban',
  aliases: ['tban'],
  description: 'Temporarily ban a user for a specified duration',
  usage: 'tempban <@user> <time> [reason]',
  category: 'Moderation',

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Permission Denied**`,
        'You need **Ban Members** permission to use this command.'
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
        `# ${EMOJIS.error} **Invalid User**`,
        'Please mention a user or provide their ID.\n\nUsage: `!tempban @user 1h [reason]`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const timeArg = args[1];
    if (!timeArg) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Missing Time**`,
        'Specify a duration (e.g., 1h, 30m, 1d)\n\nUsage: `!tempban @user 1h [reason]`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const duration = parseTime(timeArg);
    if (!duration) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Invalid Time Format**`,
        'Use format like: `1s`, `5m`, `1h`, `7d`\n\nExample: `!tempban @user 1h dont spam`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      const member = await message.guild.members.fetch(userMention.id).catch(() => null);

      if (member && !message.member.permissions.has(PermissionFlagsBits.Administrator) && member.roles.highest.position >= message.member.roles.highest.position) {
        const container = buildNotice(
          `# ${EMOJIS.error} **Hierarchy Error**`,
          `You cannot ban ${userMention.username} because their highest role is equal to or higher than yours.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const botMember = await message.guild.members.fetchMe();
      if (member && member.roles.highest.position >= botMember.roles.highest.position) {
        const container = buildNotice(
          `# ${EMOJIS.error} **Hierarchy Error**`,
          `I cannot ban ${userMention.username} because their highest role is equal to or higher than mine.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      markCommandInvoker(message.guild.id, 'tempban', userMention.id, message.author);

      await message.guild.bans.create(userMention.id, {
        reason: `Temporary ban: ${reason}`,
        deleteMessageSeconds: 24 * 60 * 60
      });

      try {
        const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
        if (!guildData.moderation) guildData.moderation = {};
        if (!guildData.moderation.actions) guildData.moderation.actions = [];

        const caseNumber = generateCaseNumber(guildData);

        guildData.moderation.actions.push({
          caseNumber,
          type: 'tempban',
          userId: userMention.id,
          moderator: { id: message.author.id, username: message.author.username },
          reason,
          duration,
          timestamp: new Date()
        });

        await client.db.updateOne(
          { guildId: message.guildId },
          { $set: guildData },
          { upsert: true }
        );
      } catch (dbError) {
        console.error('Error saving tempban action to database:', dbError);
      }

      const caseNum = guildData.moderation.actions[guildData.moderation.actions.length - 1].caseNumber;

      const timeUnits = {
        d: Math.floor(duration / (1000 * 60 * 60 * 24)),
        h: Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((duration % (1000 * 60)) / 1000)
      };

      let timeStr = [];
      if (timeUnits.d > 0) timeStr.push(`${timeUnits.d}d`);
      if (timeUnits.h > 0) timeStr.push(`${timeUnits.h}h`);
      if (timeUnits.m > 0) timeStr.push(`${timeUnits.m}m`);
      if (timeUnits.s > 0) timeStr.push(`${timeUnits.s}s`);
      timeStr = timeStr.join(' ');

      const container = buildNotice(
        `# ${EMOJIS.success} **User Temporarily Banned**`,
        `${userMention.username} has been banned for ${timeStr}.\n\n**Reason:** ${reason}`
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });

      await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_TEMPBAN, {
        executor: message.author,
        target: userMention,
        reason: reason,
        duration: duration,
        thumbnail: userMention.displayAvatarURL({ dynamic: true })
      });

      setTimeout(async () => {
        try {
          await message.guild.bans.remove(userMention.id, 'Temporary ban duration expired');
        } catch (err) {
          console.error(`Failed to unban ${userMention.username}:`, err);
        }
      }, duration);

    } catch (error) {
      console.error('Error applying temporary ban:', error);
      const container = buildNotice(
        `# ${EMOJIS.error} **Error**`,
        'Failed to ban the user. Please try again later.'
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
