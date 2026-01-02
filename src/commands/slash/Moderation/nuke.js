import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/nuke.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('nuke').setDescription(prefix.description || 'Nuke a channel').addStringOption(o => o.setName('args').setDescription('[channel]').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
