import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/BumpReminder/bumpreminder.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bumpreminder')
    .setDescription('Manage bump reminder system')
    .addStringOption(o => o.setName('args').setDescription('Subcommand and arguments').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
