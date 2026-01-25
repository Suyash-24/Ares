import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

export default {
  name: 'modstats',
  description: 'View punishment statistics for a moderator',
  usage: 'modstats [@moderator]',
  category: 'Moderation',

  async execute(message, args, client) {

    const canUse = await ModerationPermissions.canUseCommand(message.member, 'modstats', client, message.guildId);
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

    const target = args.length ? await parseUserInput(args[0], message.guild, client) : message.member;

    if (!target) {
      const container = buildNotice(
        `${EMOJIS.error} **User Not Found**`,
        'Could not find the specified moderator.'
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
          `${EMOJIS.info} **No Data**`,
          `${formatUserDisplay(target.user)} has no recorded actions.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const allActions = guildData.moderation.actions || [];
      const modActions = allActions.filter(action => action.moderator?.id === target.user.id);

      if (!modActions.length) {
        const container = buildNotice(
          `${EMOJIS.info} **No Actions**`,
          `${formatUserDisplay(target.user)} has not taken any moderation actions yet.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const stats = {
        warns: modActions.filter(a => a.type === 'warn').length,
        kicks: modActions.filter(a => a.type === 'kick').length,
        bans: modActions.filter(a => a.type === 'ban').length,
        mutes: modActions.filter(a => a.type === 'mute').length,
        unmutes: modActions.filter(a => a.type === 'unmute').length,
        unbans: modActions.filter(a => a.type === 'unban').length
      };

      const totalActions = Object.values(stats).reduce((a, b) => a + b, 0);

      const statsText = `⚠️ Warns: **${stats.warns}**\n👟 Kicks: **${stats.kicks}**\n🔨 Bans: **${stats.bans}**\n🔇 Mutes: **${stats.mutes}**\n🔊 Unmutes: **${stats.unmutes}**\n📋 Unbans: **${stats.unbans}**\n\n**Total: ${totalActions}**`;

      const container = buildNotice(
        `📊 **Moderation Stats: ${formatUserDisplay(target.user)}**`,
        statsText
      );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error in modstats command:', error);
      const container = buildNotice(
        `${EMOJIS.error} **Error**`,
        'Failed to fetch moderator statistics.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
