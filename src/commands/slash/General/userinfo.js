import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { buildUserInfoComponents, formatPermissionsPreview } from '../../shared/userinfoComponents.js';

const fetchMember = async (guild, userId) => {
  if (!guild) {
    return null;
  }

  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    return null;
  }
};

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user.')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('User to inspect')
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target') ?? interaction.user;
    const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
    const guild = interaction.guild;
    const member = await fetchMember(guild, targetUser.id);

    const avatarUrl = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png' });
    const bannerUrl = fetchedUser.bannerURL({ size: 4096, extension: 'png' }) ?? null;
    const permissionsInfo = member
      ? formatPermissionsPreview(member)
      : { previewText: null, extraCount: 0, fullList: [] };

    const components = buildUserInfoComponents({
      user: fetchedUser,
      member,
      avatarUrl,
      bannerUrl,
      permissionsInfo
    });

    await interaction.reply({
      components,
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });
  },
  components: []
};
