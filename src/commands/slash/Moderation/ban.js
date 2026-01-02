import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/ban.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('ban').setDescription(prefix.description || 'Ban a user from the server').addStringOption(o => o.setName('args').setDescription('user [reason]').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
