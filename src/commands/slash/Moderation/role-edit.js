import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/role edit.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('role-edit').setDescription(prefix.description || 'Edit a role').addStringOption(o => o.setName('args').setDescription('role property value').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
