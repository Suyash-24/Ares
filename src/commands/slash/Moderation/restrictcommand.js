import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/restrictcommand.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder().setName('restrictcommand').setDescription('Restrict a command to specific roles or channels').addStringOption(o => o.setName('args').setDescription('command [role/channel]').setRequired(false)),
  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
