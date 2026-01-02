import { SlashCommandBuilder } from 'discord.js';
import prefix from '../../prefix/Moderation/unban.js';
import { buildMessageFromInteraction } from './_util.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription(prefix.description || 'Unban a user')
    .addStringOption(o => o.setName('user').setDescription('User ID or mention').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for unban').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getString('user') || '';
    const reason = interaction.options.getString('reason') || '';
    const args = [user];
    if (reason) args.push(reason);
    const message = buildMessageFromInteraction(interaction);
    await prefix.execute(message, args, interaction.client);
  }
};
