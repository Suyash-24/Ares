import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/role color.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('role-color').setDescription(prefix.description || 'Change role color').addStringOption(o => o.setName('args').setDescription('role color').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
