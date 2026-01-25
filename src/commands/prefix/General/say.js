import { PermissionFlagsBits, MessageFlags, ContainerBuilder, SeparatorSpacingSize, ChannelType } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
export default {
  name: 'say',
	description: 'Make the bot say something',
  aliases: ['broadcast', 'announce'],
  async execute(message, args) {
    if (!message.member.permissions.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.Administrator])) {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`${EMOJIS.error} **Permission Denied**`)
      );

      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`You need **Manage Server** or **Administrator** permission to use this command.`)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (!args.length) {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`${EMOJIS.error} **Usage Error**`)
      );

      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`Please provide text to say.\n\n**Usage:** \`!say <text>\` or \`!say #channel <text>\`\n**Reply:** \`!say --reply <MessageID> <text>\`\n**Edit:** \`!say --edit <MessageID> <text>\``)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (args[0] === '--reply') {
      if (args.length < 3) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.error} **Usage Error**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Usage:** \`!say --reply <MessageID> <text>\``)
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const messageId = args[1];
      const textToSay = args.slice(2).join(' ');

      try {
        let targetMessage = null;

        try {
          targetMessage = await message.channel.messages.fetch(messageId);
        } catch (err) {

          const channels = message.guild.channels.cache.filter(ch => ch.isTextBased());
          for (const [, channel] of channels) {
            try {
              targetMessage = await channel.messages.fetch(messageId);
              if (targetMessage) break;
            } catch (e) {

            }
          }
        }

        if (!targetMessage) {
          throw new Error('Message not found');
        }

        await targetMessage.reply(textToSay);
        await message.react(EMOJIS.success).catch(() => {});
      } catch (error) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.error} **Error**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`Could not find the message with ID \`${messageId}\` in any channel.`)
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }
      return;
    }

    if (args[0] === '--edit') {
      if (args.length < 3) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.error} **Usage Error**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Usage:** \`!say --edit <MessageID> <text>\``)
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const messageId = args[1];
      const newText = args.slice(2).join(' ');

      try {
        let targetMessage = null;

        try {
          targetMessage = await message.channel.messages.fetch(messageId);
        } catch (err) {
          const channels = message.guild.channels.cache.filter(ch => ch.isTextBased());
          for (const [, channel] of channels) {
            try {
              targetMessage = await channel.messages.fetch(messageId);
              if (targetMessage) break;
            } catch (e) {

            }
          }
        }

        if (!targetMessage) {
          throw new Error('Message not found');
        }

        await targetMessage.edit(newText);
        await message.react(EMOJIS.success).catch(() => {});
      } catch (error) {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.error} **Error**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`Could not edit the message. Make sure the message ID is correct and the message was sent by the bot, or the bot doesn't have permission to edit it.`)
        );

        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { repliedUser: false }
        });
      }
      return;
    }

    let targetChannel = message.channel;
    let textToSay = args.join(' ');

    if (args[0] && args[0].startsWith('<#') && args[0].endsWith('>')) {
      const channelId = args[0].slice(2, -1);
      const mentionedChannel = message.guild.channels.cache.get(channelId);

      if (mentionedChannel) {
        targetChannel = mentionedChannel;
        textToSay = args.slice(1).join(' ');

        if (!textToSay.length) {
          const container = new ContainerBuilder();

          container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`${EMOJIS.error} **Usage Error**`)
          );

          container.addSeparatorComponents((separator) =>
            separator.setSpacing(SeparatorSpacingSize.Small)
          );

          container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`Please provide text to say after the channel.\n\n**Usage:** \`!say #channel <text>\``)
          );

          await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
          });
          return;
        }
      }
    }

    const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
    if (!botPermissions.has(PermissionFlagsBits.SendMessages)) {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`${EMOJIS.error} **Missing Permissions**`)
      );

      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`I don't have permission to send messages in ${targetChannel}.`)
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    await targetChannel.send(textToSay);

    await message.react(EMOJIS.success).catch(() => {});
  },
  components: []
};
