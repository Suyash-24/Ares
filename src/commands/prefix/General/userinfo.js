import { MessageFlags } from 'discord.js';
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

const resolveTargetUser = async (message, args) => {
  const mention = message.mentions.users.first();

  if (mention) {
    return mention;
  }

  if (args.length > 0) {
    const idCandidate = args[0].replace(/[^0-9]/g, '');

    if (idCandidate.length) {
      try {
        return await message.client.users.fetch(idCandidate, { force: true });
      } catch (error) {
        return null;
      }
    }
  }

  return message.author;
};

export default {
  name: 'userinfo',
	description: 'Displays user information',
  aliases: ['whois', 'ui'],
  async execute(message, args) {
    if (!message.guild) {
      await message.reply({
        content: 'This command can only be used inside a server.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const targetUser = await resolveTargetUser(message, args);

    if (!targetUser) {
      await message.reply({
        content: 'Unable to find that user.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const fetchedUser = await message.client.users.fetch(targetUser.id, { force: true });
    const member = await fetchMember(message.guild, fetchedUser.id);

    const avatarUrl = fetchedUser.displayAvatarURL({ size: 4096, extension: 'png' });
    const bannerUrl = fetchedUser.bannerURL({ size: 4096, extension: 'png' }) ?? null;

    const permissionsInfo = formatPermissionsPreview(member);

    const components = buildUserInfoComponents({
      user: fetchedUser,
      member,
      avatarUrl,
      bannerUrl,
      permissionsInfo
    });

    await message.reply({
      components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false }
    });
  },
  components: []
};
