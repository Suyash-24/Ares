import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/notes remove.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('notes-remove').setDescription(prefix.description || 'Remove a note').addStringOption(o => o.setName('args').setDescription('user noteId').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
