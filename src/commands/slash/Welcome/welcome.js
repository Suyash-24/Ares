import { SlashCommandBuilder, ChannelType } from 'discord.js';
import prefix from '../../prefix/Welcome/welcome.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome message system with multi-channel support.')
    .addSubcommand(sub => sub
      .setName('show')
      .setDescription('Show the current welcome configuration'))
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a welcome channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('The channel to send welcome messages to')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true))
      .addStringOption(o => o
        .setName('message')
        .setDescription('The welcome message (supports placeholders and embed syntax)')
        .setRequired(false))
      .addIntegerOption(o => o
        .setName('self_destruct')
        .setDescription('Auto-delete after seconds (6-60)')
        .setMinValue(6)
        .setMaxValue(60)
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a welcome channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('The channel to remove')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all configured welcome channels'))
    .addSubcommand(sub => sub
      .setName('config')
      .setDescription('Configure a welcome channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('The channel to configure')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false))
      .addStringOption(o => o
        .setName('option')
        .setDescription('The option to configure')
        .setRequired(false)
        .addChoices(
          { name: 'content', value: 'content' },
          { name: 'title', value: 'title' },
          { name: 'description', value: 'description' },
          { name: 'author', value: 'author' },
          { name: 'authoricon', value: 'authoricon' },
          { name: 'footer', value: 'footer' },
          { name: 'footericon', value: 'footericon' },
          { name: 'thumbnail', value: 'thumbnail' },
          { name: 'image', value: 'image' },
          { name: 'color', value: 'color' },
          { name: 'selfdestruct', value: 'selfdestruct' },
          { name: 'fields', value: 'fields' },
          { name: 'buttons', value: 'buttons' }
        ))
      .addStringOption(o => o
        .setName('value')
        .setDescription('The value to set')
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('toggle')
      .setDescription('Toggle welcome messages on/off'))
    .addSubcommand(sub => sub
      .setName('enable')
      .setDescription('Enable welcome messages'))
    .addSubcommand(sub => sub
      .setName('disable')
      .setDescription('Disable welcome messages'))
    .addSubcommand(sub => sub
      .setName('test')
      .setDescription('Send a test welcome message')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Specific channel to test (optional)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Reset all welcome settings')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');
    const option = interaction.options.getString('option');
    const value = interaction.options.getString('value');
    const messageContent = interaction.options.getString('message');
    const selfDestruct = interaction.options.getInteger('self_destruct');

    const args = [subcommand];

    let rawContent = `welcome ${subcommand}`;

    if (channel) {
      args.push(`<#${channel.id}>`);
      rawContent += ` <#${channel.id}>`;
    }

    if (option) {
      args.push(option);
      rawContent += ` ${option}`;
    }

    if (value) {
      args.push(...value.split(/\s+/));
      rawContent += ` ${value}`;
    }

    if (messageContent) {
      args.push(...messageContent.split(/\s+/));
      rawContent += ` ${messageContent}`;
    }

    if (selfDestruct) {
      rawContent += ` --self_destruct ${selfDestruct}`;
    }

    const message = buildMessageFromInteraction(interaction, rawContent);
    await prefix.execute(message, args, interaction.client);
  }
};
