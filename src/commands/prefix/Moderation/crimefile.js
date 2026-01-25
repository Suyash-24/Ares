import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getActionEmoji = (type) => {
  const emojiMap = {
    warn: '⚠️',
    kick: '👟',
    ban: '🔨',
    mute: '🔇',
    unmute: '🔊',
    unban: '📋',
    softban: '🔨',
    tempban: '⏰'
  };
  return emojiMap[type] || '📋';
};

export default {
  name: 'crimefile',
  aliases: ['casefile', 'crimefiles', 'userhistory'],
  description: 'View moderation actions taken against a user',
  usage: 'crimefile <@user|id>',
  category: 'Moderation',

  async execute(message, args, client) {

    const { ModerationPermissions, getModerationPermissionErrors } = await import('../../../utils/ModerationPermissions.js');
    const canUse = await ModerationPermissions.canUseCommand(message.member, 'crimefile', client, message.guildId);
    if (!canUse.allowed) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
      );
      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(getModerationPermissionErrors[canUse.reason])
      );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (!args.length) {
      const container = buildNotice(
        `${EMOJIS.error} **Usage Error**`,
        'Please specify a user.\n\nUsage: `!crimefile @user`'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const target = await parseUserInput(args[0], message.guild, client);

    if (!target) {
      const container = buildNotice(
        `${EMOJIS.error} **User Not Found**`,
        'Could not find the specified user.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      if (!client.db) {
        const container = buildNotice(
          `${EMOJIS.error} **Error**`,
          'Database is not available.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const guildData = await client.db.findOne({ guildId: message.guildId });

      if (!guildData || !guildData.moderation || !guildData.moderation.actions) {
        const container = buildNotice(
          `ℹ️ **Clean Record**`,
          `${formatUserDisplay(target.user)} has no recorded moderation actions.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

	  const allActions = guildData.moderation.actions || [];
	  const userActions = allActions.filter(action => action.userId === target.user.id && !action.deletedFromCrimefile);

      if (!userActions.length) {
        const container = buildNotice(
          `ℹ️ **Clean Record**`,
          `${formatUserDisplay(target.user)} has no recorded moderation actions.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const ACTIONS_PER_PAGE = 3;
      const sortedActions = userActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).reverse();
      const totalPages = Math.ceil(sortedActions.length / ACTIONS_PER_PAGE);

      let requestedPage = 0;
      if (args[1]) {
        requestedPage = parseInt(args[1]) || 0;
      }
      const currentPage = Math.min(Math.max(0, requestedPage), totalPages - 1);

      const buildCrimefilePage = (pageNum) => {
        const startIdx = pageNum * ACTIONS_PER_PAGE;
        const endIdx = startIdx + ACTIONS_PER_PAGE;
        const pageActions = sortedActions.slice(startIdx, endIdx);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`🕵️ **CRIME FILE: ${formatUserDisplay(target.user)}**`)
        );
        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        if (pageActions.length > 0) {
          pageActions.forEach((action, index) => {
            const modName = action.moderator?.username || 'Unknown Mod';
            const type = action.type?.toUpperCase() || 'UNKNOWN';
            const emoji = getActionEmoji(action.type);
            const reason = action.reason || 'No reason provided';
            const date = formatDate(action.timestamp);
            const caseNum = action.caseNumber || '?';

            const actionText = `${emoji} **#${caseNum} ${type}**\n**Moderator:** ${modName}\n**Date:** ${date}\n**Reason:** ${reason}`;

            container.addTextDisplayComponents((textDisplay) =>
              textDisplay.setContent(actionText)
            );

            if (index < pageActions.length - 1) {
              container.addSeparatorComponents((separator) =>
                separator.setSpacing(SeparatorSpacingSize.Small)
              );
            }
          });
        }

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**💀 Total Punishments: ${userActions.length}**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Page: ${pageNum + 1}/${totalPages}**`)
        );

        container.addActionRowComponents((row) => {
          const prevBtn = new ButtonBuilder()
            .setCustomId(`crimefile_prev_${message.author.id}_${target.user.id}_${pageNum - 1}`)
            .setEmoji(EMOJIS.pageprevious)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNum === 0);

          const nextBtn = new ButtonBuilder()
            .setCustomId(`crimefile_next_${message.author.id}_${target.user.id}_${pageNum + 1}`)
            .setEmoji(EMOJIS.pagenext)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNum >= totalPages - 1);

          row.setComponents(prevBtn, nextBtn);
          return row;
        });

        return container;
      };

      const initialContainer = buildCrimefilePage(currentPage);
      return message.reply({
        components: [initialContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error in crimefile command:', error);
      const container = buildNotice(
        `${EMOJIS.error} **Error**`,
        'Failed to fetch user history.'
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
