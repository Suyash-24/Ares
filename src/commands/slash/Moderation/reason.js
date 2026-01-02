import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/reason.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('reason').setDescription(prefix.description || 'Update case reason').addStringOption(o => o.setName('args').setDescription('case reason').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
