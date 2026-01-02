import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/massban.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('massban').setDescription(prefix.description || 'Mass ban users').addStringOption(o => o.setName('args').setDescription('user1 user2 ...').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
