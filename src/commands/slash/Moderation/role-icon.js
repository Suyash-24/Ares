import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/role icon.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('role-icon').setDescription(prefix.description || 'Set role icon').addStringOption(o => o.setName('args').setDescription('role icon').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
