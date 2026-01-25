import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(title));
  container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(description));
  return container;
};

const resolveMember = async (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<@!>]/g, '');
  let member = guild.members.cache.get(clean);
  if (!member) {
    try {
      member = await guild.members.fetch(clean).catch(() => null);
    } catch (e) {
      member = null;
    }
  }
  if (!member) member = guild.members.cache.find(m => m.user.username.toLowerCase() === input.toLowerCase());
  return member || null;
};

export default {
  name: 'nick',
  aliases: ['nickname' , 'setnick'],
  description: 'Change a member\'s nickname on this server. Requires Manage Nicknames.',
  usage: 'nick <user> <new nickname> | nick <user> reset',
  category: 'Moderation',

  async execute(message, args, client) {
    const author = message.member;
    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);

    if (!author.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Nicknames** permission to use this command.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (!args || args.length < 1) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `nick <user> [new nickname]` — omit the nickname to reset it or use `reset`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targetArg = args[0];
    const rest = args.slice(1).join(' ').trim();
    const member = await resolveMember(message.guild, targetArg);
    if (!member) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Member Not Found`, 'Could not find the specified member in this server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const botHighest = botMember.roles.highest?.position ?? 0;
    if (member.roles.highest?.position >= botHighest) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify`, 'I cannot change the nickname of a member with an equal or higher role than me.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let newNick = rest;
    if (!newNick || ['reset', 'remove', '-'].includes(newNick.toLowerCase())) newNick = null;
    if (newNick && newNick.length > 32) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Nickname must be 32 characters or fewer.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const oldNick = member.nickname || member.user.username;

    try {

      markCommandInvoker(message.guild.id, 'nick', member.id, message.author);

      await member.setNickname(newNick, `Changed by ${message.author.tag} (${message.author.id})`).catch(e => { throw e; });

      await sendLog(client, message.guildId, LOG_EVENTS.MOD_NICK, {
        executor: message.author,
        target: member.user,
        previousNickname: oldNick,
        newNickname: newNick || member.user.username,
        details: newNick ? `Nickname changed to "${newNick}"` : 'Nickname reset'
      });

      if (newNick) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Nickname Changed`, `Changed **${member.user.tag}**'s nickname to **${newNick}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Nickname Reset`, `Reset nickname for **${member.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('[nick] error:', err);
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, 'Failed to change nickname. Ensure I have the proper permissions and my role is high enough.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
  }
};
