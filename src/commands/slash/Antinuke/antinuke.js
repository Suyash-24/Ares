import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Antinuke/antinuke.js';
import { buildMessageFromInteraction } from '../Moderation/_util.js';

export default {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription(prefix.description || 'Manage antinuke protection system')
    .addStringOption(o =>
      o.setName('args')
        .setDescription('Subcommand and arguments (enable, disable, admin, whitelist, etc.)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const raw = interaction.options.getString('args') || '';
    const args = raw.trim().length ? raw.trim().split(/\s+/) : [];
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
