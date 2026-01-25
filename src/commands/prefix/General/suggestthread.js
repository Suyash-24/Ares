import { MessageFlags, ContainerBuilder, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { saveSuggestionThread } from '../../../utils/threadUtils.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

export default {
  name: 'suggestthread',
  aliases: ['suggestthreads', 'threadsuggestion'],
  description: 'Create a suggestion thread',
  usage: 'suggestthread <channel> <thread-name> | <suggestion-content>',
  category: 'General',

  async execute(message, args) {
    const config = message.client.config;
    if (!message.guild?.id) return;

    const subcommand = args[0]?.toLowerCase();

    const requireAdmin = async () => {
      if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      const container = buildNotice(
        `${EMOJIS.error} **Permission Denied**`,
        'You need **Administrator** permission to manage suggestion thread settings.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return false;
    };

    if (subcommand === 'enable') {
      if (!(await requireAdmin())) return;

      if (!config.suggestThreadChannelId) {
        const container = buildNotice(
          `${EMOJIS.error} **No Channel Configured**`,
          'Set a channel first using `!suggestthread channel #channel`'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      config.suggestThreadEnabled = true;
      await message.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Suggestion Threads Enabled**`,
        'Members can now create suggestion threads.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'disable') {
      if (!(await requireAdmin())) return;

      config.suggestThreadEnabled = false;
      await message.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Suggestion Threads Disabled**`,
        'Members can no longer create suggestion threads.'
      );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'channel') {
      if (!(await requireAdmin())) return;

      const channelMention = args[1];
      if (!channelMention) {
        const container = buildNotice(
          `${EMOJIS.error} **Usage Error**`,
          'Usage: `!suggestthread channel #channel` or `!suggestthread channel disable`'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      if (channelMention.toLowerCase() === 'disable') {
        config.suggestThreadChannelId = null;
        config.suggestThreadEnabled = false;
        await message.client.updateConfig(config);

        const container = buildNotice(
          `${EMOJIS.success} **Suggestion Thread Channel Cleared**`,
          'Suggestion threads are now disabled.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      if (!channelMention.startsWith('<#') || !channelMention.endsWith('>')) {
        const container = buildNotice(
          `${EMOJIS.error} **Invalid Channel**`,
          'Mention a valid channel, for example `!suggestthread channel #suggestions`.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const channelId = channelMention.slice(2, -1);

      try {
        const channel = await message.guild.channels.fetch(channelId);
        if (!channel) throw new Error('Channel not found');

        config.suggestThreadChannelId = channelId;
        await message.client.updateConfig(config);

        const container = buildNotice(
          `${EMOJIS.success} **Suggestion Thread Channel Set**`,
          `Suggestion threads will be created in ${channel}.`
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        const container = buildNotice(
          `${EMOJIS.error} **Channel Not Found**`,
          'Could not access the mentioned channel.'
        );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }
    }

    if (!config.suggestThreadEnabled || !config.suggestThreadChannelId) {
      return;
    }

    const channelInput = args[0];
    const threadName = args[1];
    const suggestionText = args.slice(2).join(' ');

    if (!channelInput || !threadName || !suggestionText) {
      return message.reply({
        components: [buildNotice(
          `${EMOJIS.error} **Invalid Usage**`,
          'Usage: `!suggestthread <thread-name> <suggestion-content>`\n\nExample: `!suggestthread New Feature Add dark mode support`'
        )],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (threadName.length > 100) {
      return message.reply({
        components: [buildNotice(
          `${EMOJIS.error} **Name Too Long**`,
          'Thread name must be 100 characters or less.'
        )],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    if (suggestionText.length > 2000) {
      return message.reply({
        components: [buildNotice(
          `${EMOJIS.error} **Content Too Long**`,
          'Suggestion content must be 2000 characters or less.'
        )],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }

    try {

      const channel = await message.guild.channels.fetch(config.suggestThreadChannelId);

      if (!channel) {
        return message.reply({
          components: [buildNotice(
            `${EMOJIS.error} **Configuration Error**`,
            'The configured suggestion thread channel is no longer accessible.'
          )],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }

      const thread = await channel.threads.create({
        name: channelInput,
        autoArchiveDuration: 60
      });

      const suggestionContent = `**Suggestion from ${message.author.username}** (ID: ${message.author.id})\n\n${threadName}`;
      await thread.send(suggestionContent);

      await saveSuggestionThread(message.client, message.guild.id, thread.id);

      const responseContainer = buildNotice(
        `${EMOJIS.success} **Suggestion Thread Created**`,
        `Thread created: ${thread}\n\n**Name:** ${channelInput}`
      );

      return message.reply({
        components: [responseContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error creating suggestion thread:', error);
      return message.reply({
        components: [buildNotice(
          `${EMOJIS.error} **Creation Failed**`,
          'Could not create the suggestion thread. Please try again later.'
        )],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }
  },

  components: []
};
