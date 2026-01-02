import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/newmembers.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('newmembers').setDescription(prefix.description || 'View new members').addStringOption(o => o.setName('args').setDescription('[count]').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
