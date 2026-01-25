import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
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

const resolveChannel = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<#>]/g, '');
  let channel = guild.channels.cache.get(clean);
  if (!channel) channel = guild.channels.cache.find(c => c.name.toLowerCase() === input.toLowerCase());
  return channel || null;
};

export default {
  name: 'channeltopic',
  description: 'Update the topic of a text channel.',
  usage: 'channeltopic [channel] <text>|clear',
  category: 'Moderation',

  async execute(message, args) {
    if (!message.guild) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Guild Only`, 'This command can only be used in a server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    let targetChannel = null;
    let textArgStart = 0;
    if (args[0]) {
      const possible = args[0];
      const resolved = resolveChannel(message.guild, possible);
      if (resolved) {
        targetChannel = resolved;
        textArgStart = 1;
      }
    }

    if (!targetChannel) targetChannel = message.channel;

    const topic = args.slice(textArgStart).join(' ').trim();

    if (!topic) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Topic`, 'Provide a non-empty topic text, or use `clear` to remove the topic.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const isClear = topic.toLowerCase() === 'clear';

    if (!isClear && topic.length > 1024) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Topic cannot exceed 1024 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (typeof targetChannel.setTopic !== 'function') return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'The specified channel is not a text-based channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) || !targetChannel.permissionsFor(message.member)?.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Channels** permission to update the channel topic.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const botMember = message.guild.members.me || message.guild.members.cache.get(message.client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels) || !targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Bot Permission`, 'I need the **Manage Channels** permission for that channel to update its topic.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const previous = targetChannel.topic || '(none)';

    try {
      markCommandInvoker(message.guild.id, 'channeltopic', targetChannel.id, message.author);
      if (isClear) {
        await targetChannel.setTopic(null, `Cleared by ${message.author.tag}`);
      } else {
        await targetChannel.setTopic(topic, `Updated by ${message.author.tag}`);
      }
    } catch (err) {
      console.error('[channeltopic] setTopic failed:', err?.message || err);
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, 'Failed to update channel topic. Ensure I have permission and the channel supports topics.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const success = new ContainerBuilder();
    success.addTextDisplayComponents(td => td.setContent(isClear ? `# ${EMOJIS.success} Topic Cleared` : `# ${EMOJIS.success} Topic Updated`));
    success.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    success.addTextDisplayComponents(td => td.setContent(`Channel: <#${targetChannel.id}>
Previous: ${previous}
${isClear ? 'Current: (none)' : topic}`));

    await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_CHANNEL_TOPIC, {
      executor: message.author,
      channel: targetChannel,
      previousTopic: previous,
      newTopic: isClear ? '(none)' : topic,
      thumbnail: message.guild.iconURL({ dynamic: true })
    });

    return message.reply({ components: [success], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
