import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/forcenickname.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('forcenickname').setDescription(prefix.description || 'Force a nickname').addStringOption(o => o.setName('args').setDescription('user [nickname|remove]|list').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
