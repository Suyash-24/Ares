import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';

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
  name: 'modhistory',
  aliases: ['moderatorhistory'],
  description: 'View moderation actions issued by a moderator',
  usage: 'modhistory <@moderator|id>',
  category: 'Moderation',

  async execute(message, args, client) {

    const { ModerationPermissions, getModerationPermissionErrors } = await import('../../../utils/ModerationPermissions.js');
    const canUse = await ModerationPermissions.canUseCommand(message.member, 'modhistory', client, message.guildId);
    if (!canUse.allowed) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`# ❌ Permission Denied`)
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
      const container = new ContainerBuilder();
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`# ❌ Missing Arguments`)
      );
      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`Please specify a moderator.\nUsage: \`${client.prefix}modhistory @moderator\``)
      );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    const moderator = await parseUserInput(args[0], message.guild, client);

    if (!moderator) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`# ❌ Moderator Not Found`)
      );
      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Could not find the specified moderator.')
      );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      if (!client.db) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`# ❌ Error`)
        );
        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('Database is not available.')
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const guildData = await client.db.findOne({ guildId: message.guildId });

      if (!guildData || !guildData.moderation || !guildData.moderation.actions) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`# 📋 No History`)
        );
        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${formatUserDisplay(moderator.user)} has no recorded moderation actions.`)
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const allActions = guildData.moderation.actions || [];
      const modActions = allActions.filter(action => action.moderator?.id === moderator.user.id && !action.deletedFromModhistory);

      if (!modActions.length) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`# 📋 No History`)
        );
        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${formatUserDisplay(moderator.user)} has no recorded moderation actions.`)
        );

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const ACTIONS_PER_PAGE = 3;
      const sortedActions = modActions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).reverse();
      const totalPages = Math.ceil(sortedActions.length / ACTIONS_PER_PAGE);

      let requestedPage = 0;
      if (args[1]) {
        requestedPage = parseInt(args[1]) || 0;
      }
      const currentPage = Math.min(Math.max(0, requestedPage), totalPages - 1);

      const buildModHistoryPage = (pageNum) => {
        const startIdx = pageNum * ACTIONS_PER_PAGE;
        const endIdx = startIdx + ACTIONS_PER_PAGE;
        const pageActions = sortedActions.slice(startIdx, endIdx);

        const container = new ContainerBuilder();
        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`📋 **MOD HISTORY: ${formatUserDisplay(moderator.user)}**`)
        );
        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        if (pageActions.length > 0) {
          pageActions.forEach((action, index) => {
            const type = action.type?.toUpperCase() || 'UNKNOWN';
            const emoji = getActionEmoji(action.type);
            const reason = action.reason || 'No reason provided';
            const date = formatDate(action.timestamp);
            const caseNum = action.caseNumber || '?';

            const targetDisplay = `<@${action.userId}>`;

            const actionText = `${emoji} **#${caseNum} ${type}**\n**Target:** ${targetDisplay}\n**Date:** ${date}\n**Reason:** ${reason}`;

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

        const actionCounts = {};
        modActions.forEach(action => {
          actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
        });

        const statEntries = Object.entries(actionCounts)
          .map(([type, count]) => `${getActionEmoji(type)} **${type.toUpperCase()}**: ${count}`);

        let summaryContent = '**📊 Summary:**\n';
        for (let i = 0; i < statEntries.length; i += 2) {
          const line = [statEntries[i], statEntries[i + 1]].filter(Boolean).join(' | ');
          summaryContent += line + '\n';
        }

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(summaryContent.trim())
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Total Actions: ${modActions.length}** | **Page: ${pageNum + 1}/${totalPages}**`)
        );

        container.addActionRowComponents((row) => {
          const prevBtn = new ButtonBuilder()
            .setCustomId(`modhistory_prev_${message.author.id}_${moderator.user.id}_${pageNum - 1}`)
            .setEmoji(EMOJIS.pageprevious)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNum === 0);

          const nextBtn = new ButtonBuilder()
            .setCustomId(`modhistory_next_${message.author.id}_${moderator.user.id}_${pageNum + 1}`)
            .setEmoji(EMOJIS.pagenext)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageNum >= totalPages - 1);

          row.setComponents(prevBtn, nextBtn);
          return row;
        });

        return container;
      };

      const initialContainer = buildModHistoryPage(currentPage);
      return message.reply({
        components: [initialContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error in modhistory command:', error);
      const container = new ContainerBuilder();
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`# ❌ Error`)
      );
      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Failed to fetch moderator history.')
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
