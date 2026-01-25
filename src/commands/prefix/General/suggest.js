import { MessageFlags, ContainerBuilder, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markMessageAsAresDeleted } from '../../../events/loggingEvents.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

export default {
  name: 'suggest',
	description: 'Submit a suggestion',
  aliases: ['suggestion'],
  async execute(message, args) {
    const config = message.client.config;
    if (!message.guild?.id) return;

    const subcommand = args[0]?.toLowerCase();
    const allowAll = config.suggestAllowAllChannels === true;

    const isSuggestDisabled = !config.suggestChannelId;
    if (isSuggestDisabled && subcommand !== 'channel' && subcommand !== 'anychannel' && subcommand !== 'disable') {
      return;
    }

    const requireAdmin = async () => {
      if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      const container = buildNotice(
        `${EMOJIS.error} **Permission Denied**`,
        'You need **Administrator** permission to manage suggestion settings.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return false;
    };

    if (subcommand === 'channel') {
      if (!(await requireAdmin())) return;

      const channelMention = args[1];
      if (!channelMention) {
        const container = buildNotice(
          `${EMOJIS.error} **Usage Error**`,
          'Usage: `!suggest channel #channel` \nor\n `!suggest channel disable`'
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (channelMention.toLowerCase() === 'disable') {
        config.suggestChannelId = null;
        await message.client.updateConfig(config);

        const container = buildNotice(
          `${EMOJIS.success} **Suggest Channel Cleared**`,
          'Members must set a new suggestion channel before submitting suggestions.'
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      if (!channelMention.startsWith('<#') || !channelMention.endsWith('>')) {
        const container = buildNotice(
          `${EMOJIS.error} **Invalid Channel**`,
          'Mention a valid channel, for example `!suggest channel #suggestions`.'
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const channelId = channelMention.slice(2, -1);

      try {
        const channel = await message.guild.channels.fetch(channelId);
        if (!channel) throw new Error('Channel not found');

        config.suggestChannelId = channelId;
        await message.client.updateConfig(config);

        const container = buildNotice(
          `${EMOJIS.success} **Suggest Channel Set**`,
          `Suggestions will now be posted in ${channel}.`
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        const container = buildNotice(
          `${EMOJIS.error} **Channel Not Found**`,
          'Could not access the mentioned channel.'
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }
      return;
    }

    if (subcommand === 'anychannel') {
      if (!(await requireAdmin())) return;

      const nextState = args[1]?.toLowerCase();
      if (!['on', 'off'].includes(nextState)) {
        const container = buildNotice(
          `${EMOJIS.error} **Usage Error**`,
          'Usage: `!suggest anychannel on` or `!suggest anychannel off`'
        );
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      config.suggestAllowAllChannels = nextState === 'on';
      await message.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Any Channel Mode ${nextState === 'on' ? 'Enabled' : 'Disabled'}**`,
        nextState === 'on'
          ? 'Members can submit suggestions from any channel. Suggestions are still posted in the configured suggestion channel.'
          : 'Members must use the configured suggestion channel to submit suggestions.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (subcommand === 'disable') {
      if (!(await requireAdmin())) return;

      config.suggestChannelId = null;
      config.suggestAllowAllChannels = false;
      await message.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Suggestions Disabled**`,
        'Members can no longer submit suggestions. Use `!suggest channel #channel` to re-enable suggestions.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (!args.length) {
      return;
    }

    const fullText = args.join(' ');
    if (!fullText.includes('|')) {
      const container = buildNotice(
        `${EMOJIS.error} **Usage Error**`,
        'Separate the title, description, and reason with `|`.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const parts = fullText.split('|').map((part) => part.trim());
    if (parts.length !== 3) {
      const container = buildNotice(
        `${EMOJIS.error} **Usage Error**`,
        'Provide exactly three parts: title, description, and reason.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const [title, description, reason] = parts;

    if (title.length < 3 || title.length > 100) {
      const container = buildNotice(
        `${EMOJIS.error} **Invalid Title**`,
        'Title must be between 3 and 100 characters.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (description.length < 10 || description.length > 2000) {
      const container = buildNotice(
        `${EMOJIS.error} **Invalid Description**`,
        'Description must be between 10 and 2000 characters.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (reason.length < 5 || reason.length > 1000) {
      const container = buildNotice(
        `${EMOJIS.error} **Invalid Reason**`,
        'Reason must be between 5 and 1000 characters.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    let suggestionChannel;
    try {
      suggestionChannel = await message.guild.channels.fetch(config.suggestChannelId);
    } catch (err) {
      suggestionChannel = null;
    }

    if (!suggestionChannel) {
      const container = buildNotice(
        `${EMOJIS.error} **Configuration Error**`,
        'The configured suggestion channel is no longer accessible. Set a new channel with `!suggest channel #channel`.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (!allowAll && message.channel.id !== suggestionChannel.id) {
      const container = buildNotice(
        `${EMOJIS.error} **Wrong Channel**`,
        `Use ${suggestionChannel} to submit suggestions.`
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    try {
      const suggestionContainer = new ContainerBuilder();
      suggestionContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`${EMOJIS.commands} **Suggestion from ${message.author.username}**`)
      );
      suggestionContainer.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      suggestionContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`**Title:** ${title}

**Description:**
${description}

**Benefits/Reasons:**
${reason}

**User ID:** ${message.author.id}`)
      );

      const upvoteButton = new ButtonBuilder()
        .setCustomId(`suggest_upvote_${Date.now()}_${Math.random()}`)
        .setLabel('0')
        .setEmoji(EMOJIS.upvote)
        .setStyle(ButtonStyle.Success);

      const downvoteButton = new ButtonBuilder()
        .setCustomId(`suggest_downvote_${Date.now()}_${Math.random()}`)
        .setLabel('0')
        .setEmoji(EMOJIS.downvote)
        .setStyle(ButtonStyle.Danger);

      suggestionContainer.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );
      suggestionContainer.addActionRowComponents((row) => row.setComponents(upvoteButton, downvoteButton));

      await suggestionChannel.send({
        components: [suggestionContainer],
        flags: MessageFlags.IsComponentsV2
      });

      const responseContainer = buildNotice(
        `${EMOJIS.success} **Suggestion Submitted**`,
        allowAll && message.channel.id !== suggestionChannel.id
          ? `Your suggestion has been sent to ${suggestionChannel}.`
          : 'Your suggestion has been submitted to the team.'
      );

      const reply = await message.reply({
        components: [responseContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });

      if (message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        setTimeout(async () => {
          try {
            markMessageAsAresDeleted(reply.id);
            await reply.delete();
          } catch (err) {
            console.error('Error deleting bot reply:', err);
          }
        }, 3000);
      }

      if (message.deletable) {
        setTimeout(() => {
          markMessageAsAresDeleted(message.id);
          message.delete().catch(() => {});
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      const container = buildNotice(
        `${EMOJIS.error} **Error**`,
        'Failed to submit your suggestion. Please try again later.'
      );
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
    }
  },
  components: []
};
