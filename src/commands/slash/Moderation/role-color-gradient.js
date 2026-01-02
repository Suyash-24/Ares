import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/role color gradient.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('role-color-gradient').setDescription(prefix.description || 'Gradient role colors').addStringOption(o => o.setName('args').setDescription('role1 role2 color1 color2').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
