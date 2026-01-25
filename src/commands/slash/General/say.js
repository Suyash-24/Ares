import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, SeparatorSpacingSize, ChannelType } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('send')
        .setDescription('Send a new message')
        .addStringOption((option) =>
          option.setName('text')
            .setDescription('The text you want the bot to say')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option.setName('channel')
            .setDescription('The channel to send the message to (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reply')
        .setDescription('Reply to an existing message')
        .addStringOption((option) =>
          option.setName('message_id')
            .setDescription('The ID of the message to reply to')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('text')
            .setDescription('The reply text')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing message')
        .addStringOption((option) =>
          option.setName('message_id')
            .setDescription('The ID of the message to edit')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('text')
            .setDescription('The new text')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!interaction.member.permissions.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.Administrator])) {
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

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'send') {
      const textToSay = interaction.options.getString('text');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
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

        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      await targetChannel.send(textToSay);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`${EMOJIS.success} **Message Sent**`)
      );

      container.addSeparatorComponents((separator) =>
        separator.setSpacing(SeparatorSpacingSize.Small)
      );

      container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`Your message has been sent to ${targetChannel}.`)
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    } else if (subcommand === 'reply') {
      const messageId = interaction.options.getString('message_id');
      const textToSay = interaction.options.getString('text');

      try {
        let targetMessage = null;

        try {
          targetMessage = await interaction.channel.messages.fetch(messageId);
        } catch (err) {

          const channels = interaction.guild.channels.cache.filter(ch => ch.isTextBased());
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

        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.success} **Reply Sent**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`Your reply has been sent.`)
        );

        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
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

        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
    } else if (subcommand === 'edit') {
      const messageId = interaction.options.getString('message_id');
      const newText = interaction.options.getString('text');

      try {
        let targetMessage = null;

        try {
          targetMessage = await interaction.channel.messages.fetch(messageId);
        } catch (err) {

          const channels = interaction.guild.channels.cache.filter(ch => ch.isTextBased());
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

        const container = new ContainerBuilder();

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.success} **Message Edited**`)
        );

        container.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );

        container.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`The message has been updated.`)
        );

        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
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

        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
    }
  }
};
