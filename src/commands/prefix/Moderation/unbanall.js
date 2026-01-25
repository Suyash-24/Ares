import { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
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

const activeUnbans = new Map();

export default {
  name: 'unbanall',
  description: 'Unban all banned users in the server',
  usage: 'unbanall [cancel]',
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

    if (args[0] && args[0].toLowerCase() === 'cancel') {
      if (!activeUnbans.has(message.guildId)) {
        const container = buildNotice(
          `# ${EMOJIS.error} **No Active Unban**`,
          'There is no active unban operation to cancel.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const unbanData = activeUnbans.get(message.guildId);
      unbanData.cancelled = true;

      const container = buildNotice(
        `# ${EMOJIS.success} **Unban Cancelled**`,
        'The active unban operation has been cancelled.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = buildNotice(
        `# ${EMOJIS.error} **Permission Denied**`,
        'Only administrators can use this command.'
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
        'I need **Ban Members** permission to unban users.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      const bans = await message.guild.bans.fetch();

      if (!bans.size) {
        const container = buildNotice(
          `# ${EMOJIS.info} **No Bans Found**`,
          'There are no banned users to unban.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const container = buildNotice(
        `# ${EMOJIS.waiting || '⏳'} **Unbanning Users**`,
        `Attempting to unban ${bans.size} users...`
      );
      const statusMessage = await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });

      const successes = [];
      const failures = [];
      const successPreview = [];
      const failurePreview = [];

      activeUnbans.set(message.guildId, { cancelled: false });

      for (const ban of bans.values()) {

        if (activeUnbans.get(message.guildId)?.cancelled) {
          break;
        }

        try {
          markCommandInvoker(message.guild.id, 'unbanall', ban.user.id, message.author);
          await message.guild.bans.remove(ban.user.id, 'Bulk unban via unbanall command');
          successes.push(ban.user.tag || ban.user.username);
          if (successPreview.length < 5) {
            successPreview.push(`• ${ban.user.tag || ban.user.username}`);
          }
        } catch (error) {
          failures.push({ user: ban.user.tag || ban.user.username, error: error?.message || 'Failed to unban' });
          if (failurePreview.length < 5) {
            failurePreview.push(`• ${(ban.user.tag || ban.user.username)} — ${error?.message || 'Failed to unban'}`);
          }
        }
      }

      const wasCancelled = activeUnbans.get(message.guildId)?.cancelled;
      activeUnbans.delete(message.guildId);

      const resultParts = [];
      if (successes.length) {
        if (successes.length > 5) {
          resultParts.push(`**Successfully Unbanned (${successes.length})**\n${successPreview.join('\n')}\n• ...and ${successes.length - successPreview.length} more`);
        } else {
          resultParts.push(`**Successfully Unbanned (${successes.length})**\n${successes.map((name) => `• ${name}`).join('\n')}`);
        }
      }
      if (failures.length) {
        if (failures.length > 5) {
          resultParts.push(`**Failed (${failures.length})**\n${failurePreview.join('\n')}\n• ...and ${failures.length - failurePreview.length} more`);
        } else {
          resultParts.push(`**Failed (${failures.length})**\n${failures.map(({ user, error }) => `• ${user} — ${error}`).join('\n')}`);
        }
      }

      if (successes.length > 0) {
        await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_MASS_ACTION, {
          executor: message.author,
          action: 'Mass Unban',
          count: successes.length,
          reason: 'Bulk unban via unbanall command',
          details: `Unbanned ${successes.length} user(s)${wasCancelled ? ' (cancelled)' : ''}${failures.length > 0 ? `, ${failures.length} failed` : ''}`
        });
      }

      const resultDescription = resultParts.join('\n\n');

      const resultContainer = buildNotice(
        `# ${wasCancelled ? EMOJIS.error : EMOJIS.success} **${wasCancelled ? 'Unban Cancelled' : 'Unban Report'}**`,
        wasCancelled
          ? `Unban operation was cancelled.\n\n${resultDescription}`
          : resultDescription
      );

      return statusMessage.edit({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error in unbanall command:', error);
      const container = buildNotice(
        `# ${EMOJIS.error} **Error**`,
        'Failed to fetch bans or unban users. Please try again later.'
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
