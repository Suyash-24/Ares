import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  SeparatorSpacingSize
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
  container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
  return container;
};

export default {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit and manage server suggestions')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('submit')
        .setDescription('Open the suggestion form')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Configure the suggestion channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Target channel for submitted suggestions (leave empty to disable)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Choose whether to set or clear the suggestion channel')
            .setRequired(false)
            .addChoices(
              { name: 'Set channel', value: 'set' },
              { name: 'Clear channel', value: 'clear' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('anychannel')
        .setDescription('Allow or restrict using /suggest in any channel')
        .addStringOption((option) =>
          option
            .setName('state')
            .setDescription('Select whether to allow submissions from any channel')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'on' },
              { name: 'Disable', value: 'off' }
            )
        )
    ),

  async execute(interaction) {
    const config = interaction.client.config;
    const subcommand = interaction.options.getSubcommand();
    const allowAll = config.suggestAllowAllChannels === true;

    const requireAdmin = async () => {
      if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      const container = buildNotice(
        `${EMOJIS.error} **Permission Denied**`,
        'You need **Administrator** permission to manage suggestion settings.'
      );
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
      return false;
    };

    if (subcommand === 'channel') {
      if (!(await requireAdmin())) return;

      const targetChannel = interaction.options.getChannel('channel');
      const actionOption = interaction.options.getString('action');
      const action = (actionOption ?? (targetChannel ? 'set' : 'clear')).toLowerCase();

      if (action === 'clear') {
        config.suggestChannelId = null;
        await interaction.client.updateConfig(config);

        const container = buildNotice(
          `${EMOJIS.success} **Suggest Channel Cleared**`,
          'A new suggestion channel must be set before submitting suggestions.'
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      if (!targetChannel) {
        const container = buildNotice(
          `${EMOJIS.error} **Usage Error**`,
          'Select a channel or choose **Clear channel** to disable submissions.'
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      if (!targetChannel.isTextBased() || targetChannel.isThread()) {
        const container = buildNotice(
          `${EMOJIS.error} **Invalid Channel**`,
          'Please select a server text channel.'
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      config.suggestChannelId = targetChannel.id;
      await interaction.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Suggest Channel Set**`,
        `Suggestions will now be posted in ${targetChannel}.`
      );
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'anychannel') {
      if (!(await requireAdmin())) return;

      const state = interaction.options.getString('state');
      config.suggestAllowAllChannels = state === 'on';
      await interaction.client.updateConfig(config);

      const container = buildNotice(
        `${EMOJIS.success} **Any Channel Mode ${state === 'on' ? 'Enabled' : 'Disabled'}**`,
        state === 'on'
          ? 'Members can submit suggestions from any channel. Suggestions are still posted in the configured suggestion channel.'
          : 'Members must use the configured suggestion channel to submit suggestions.'
      );
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
      return;
    }

    if (subcommand === 'submit') {
      if (!config.suggestChannelId) {
        const container = buildNotice(
          `${EMOJIS.error} **Suggestion Channel Missing**`,
          'An administrator must configure a suggestion channel before members can submit suggestions.'
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      let suggestChannel = null;
      try {
        suggestChannel = await interaction.guild.channels.fetch(config.suggestChannelId);
      } catch (err) {
        suggestChannel = null;
      }

      if (!suggestChannel) {
        const container = buildNotice(
          `${EMOJIS.error} **Configuration Error**`,
          'The configured suggestion channel is no longer accessible. Ask an administrator to set a new one.'
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      if (!allowAll && interaction.channelId !== suggestChannel.id) {
        const container = buildNotice(
          `${EMOJIS.error} **Wrong Channel**`,
          `Use ${suggestChannel} to submit suggestions.`
        );
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('suggest_modal')
        .setTitle('Submit Your Suggestion');

      const titleInput = new TextInputBuilder()
        .setCustomId('suggestion_title')
        .setLabel('Suggestion Title')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(100)
        .setPlaceholder('Brief title for your suggestion')
        .setRequired(true);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('suggestion_description')
        .setLabel('Suggestion Description')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(2000)
        .setPlaceholder('Describe your suggestion in detail')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('suggestion_reason')
        .setLabel('Why Should This Be Implemented?')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(5)
        .setMaxLength(1000)
        .setPlaceholder('Explain the benefits or reasons')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
    }
  }
};
