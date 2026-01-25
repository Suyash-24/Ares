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

export default {
  name: 'softban',
  description: 'Soft ban a user (ban to delete messages, then unban)',
  usage: 'softban <@user> [reason]',
  category: 'Moderation',

  async execute(message, args) {
    const config = message.client.config;
    const headmodRoles = config.headmodRoles ? (Array.isArray(config.headmodRoles) ? config.headmodRoles : [config.headmodRoles]) : [];
    const isHeadmod = message.member.roles.cache.some(role => headmodRoles.includes(role.id));

    const hasPermission = message.member.permissions.has(PermissionFlagsBits.BanMembers) || isHeadmod;

    if (!hasPermission) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Permission Denied**`,
        'You need **Ban Members** permission or be a Head Moderator to use this command.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const botMember = await message.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Bot Permission Missing**`,
        'I need **Ban Members** permission to use this command.'
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
        'Please mention a user or provide their ID.\n\nUsage: `!softban @user [reason]`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      const member = await message.guild.members.fetch(userMention.id).catch(() => null);

      if (member && !message.member.permissions.has(PermissionFlagsBits.Administrator) && member.roles.highest.position >= message.member.roles.highest.position) {
        const container = buildNotice(
          `# ${EMOJIS.error} **Hierarchy Error**`,
          `You cannot soft ban ${userMention.username} because their highest role is equal to or higher than yours.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      if (member && member.roles.highest.position >= botMember.roles.highest.position) {
        const container = buildNotice(
          `# ${EMOJIS.error} **Hierarchy Error**`,
          `I cannot soft ban ${userMention.username} because their highest role is equal to or higher than mine.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      markCommandInvoker(message.guild.id, 'softban', userMention.id, message.author);

      await message.guild.bans.create(userMention.id, {
        reason: `Soft ban: ${reason}`,
        deleteMessageSeconds: 24 * 60 * 60
      });

      let caseNum = 1;
      try {
        const guildData = await message.client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
        if (!guildData.moderation) guildData.moderation = {};
        if (!guildData.moderation.actions) guildData.moderation.actions = [];

        const caseNumber = generateCaseNumber(guildData);

        guildData.moderation.actions.push({
          caseNumber,
          type: 'softban',
          userId: userMention.id,
          moderator: { id: message.author.id, username: message.author.username },
          reason,
          timestamp: new Date()
        });

        await message.client.db.updateOne(
          { guildId: message.guildId },
          { $set: guildData },
          { upsert: true }
        );

        caseNum = caseNumber;
      } catch (dbError) {
        console.error('Error saving softban action to database:', dbError);
      }

      const container = buildNotice(
        `# ${EMOJIS.success} **User Soft Banned**`,
        `${userMention.username} has been soft banned.\n\n**Reason:** ${reason}`
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });

      await message.guild.bans.remove(userMention.id, 'Soft ban - messages deleted');

      await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_SOFTBAN, {
        executor: message.author,
        target: userMention,
        reason: reason,
        thumbnail: userMention.displayAvatarURL({ dynamic: true })
      });

    } catch (error) {
      console.error('Error applying soft ban:', error);
      const container = buildNotice(
        `# ${EMOJIS.error} **Error**`,
        'Failed to soft ban the user. Please try again later.'
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
