import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/slowmode.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('slowmode').setDescription(prefix.description || 'Set slowmode').addStringOption(o => o.setName('args').setDescription('[channel] duration').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
