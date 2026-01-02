import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { buildServerInfoComponents } from '../../shared/serverinfoComponents.js';

const countTextChannels = (guild) =>
  guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).size;

const countVoiceChannels = (guild) =>
  guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice).size;

const countDisplayChannels = (guild) =>
  guild.channels.cache.filter((channel) => {
    const isThread = typeof channel.isThread === 'function' ? channel.isThread() : false;
    if (isThread) {
      return false;
    }

    return channel.type !== ChannelType.GuildCategory;
  }).size;

const countBots = async (guild) => {
  try {
    await guild.members.fetch();
    return guild.members.cache.filter((member) => member.user.bot).size;
  } catch (error) {
    return guild.members.cache.filter((member) => member.user.bot).size;
  }
};

const fetchOwner = async (guild) => {
  try {
    return await guild.fetchOwner();
  } catch (error) {
    return null;
  }
};

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get detailed information about the server'),
  async execute(interaction) {
    const { guild } = interaction;

    if (!guild) {
      await interaction.reply({
        content: 'This command can only be used inside a server.',
        ephemeral: true
      });
      return;
    }

    const owner = await fetchOwner(guild);
    const channelCount = countDisplayChannels(guild);
    const textChannelCount = countTextChannels(guild);
    const voiceChannelCount = countVoiceChannels(guild);
    const botCount = await countBots(guild);
    const iconUrl = guild.iconURL({ size: 4096, extension: 'png' }) ?? null;
    const bannerUrl = guild.bannerURL({ size: 4096, extension: 'png' }) ?? null;
    const userAvatarUrl = interaction.user.displayAvatarURL({ size: 4096, extension: 'png' });
    const botAvatarUrl = interaction.client.user.displayAvatarURL({ size: 512, extension: 'png' });

    const components = buildServerInfoComponents({
      guild,
      owner,
      iconUrl,
      bannerUrl,
      channelCount,
      textChannelCount,
      voiceChannelCount,
      botCount,
      commandUser: interaction.user,
      userAvatarUrl,
      botName: interaction.client.user.username,
      botAvatarUrl,
      timestamp: new Date()
    });

    await interaction.reply({
      components,
      flags: MessageFlags.IsComponentsV2
    });
  }
};
