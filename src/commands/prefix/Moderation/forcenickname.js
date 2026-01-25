import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ModerationPermissions } from '../../../utils/ModerationPermissions.js';
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
  let member = null;
  try {
    member = await guild.members.fetch(clean).catch(() => null);
  } catch (e) {
    member = null;
  }
  if (!member) member = guild.members.cache.get(clean) || guild.members.cache.find(m => (m.user.tag || '').toLowerCase() === input.toLowerCase() || m.user.username.toLowerCase() === input.toLowerCase());
  return member || null;
};

const isEmojiOnly = (s) => {
  if (!s) return false;
  try {
    const stripped = s.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, '');
    return stripped.length === 0;
  } catch (e) {
    return false;
  }
};

export default {
  name: 'forcenickname',
  description: 'Persistently enforce a nickname for a member until removed.',
  usage: 'forcenickname <member> <nickname>  OR  forcenickname <member> (remove)',
  category: 'Moderation',

  async execute(message, args, client) {
    if (!message.guild) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Guild Only`, 'This command can only be used in a server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const sub = args[0]?.toLowerCase?.() || null;

    if (sub === 'list') {

      const hasManage = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.ManageNicknames);
      const hasHeadmod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
      const hasMod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'mod');
      if (!hasManage && !hasHeadmod && !hasMod && message.member.id !== message.guild.ownerId) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Server** or **Manage Nicknames** permission, or a configured moderator role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (!client.db) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Missing`, 'Database is not configured.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
      const entries = guildData.moderation?.forcedNicknames || {};
      const keys = Object.keys(entries || {});
      if (keys.length === 0) return message.reply({ components: [buildNotice(`# ${EMOJIS.info} None`, 'There are no forced nicknames configured for this server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const PER_PAGE = 4;
      const totalPages = Math.max(1, Math.ceil(keys.length / PER_PAGE));

      const buildPage = (pageNum) => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.security} ForceNickname`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        const page = keys.slice(pageNum * PER_PAGE, pageNum * PER_PAGE + PER_PAGE);
        page.forEach((memberId, idx) => {
          const record = entries[memberId];
          const nickname = typeof record === 'string' ? record : (record?.nickname || '');
          const by = typeof record === 'object' && record?.by ? record.by : null;
          container.addTextDisplayComponents(td => td.setContent(`**user:** <@${memberId}> ${memberId}`));
          container.addTextDisplayComponents(td => td.setContent(`**forcenick:** ${nickname}`));
          container.addTextDisplayComponents(td => td.setContent(`**By:** ${by ? `<@${by}> ${by}` : 'Unknown'}`));
          if (idx < page.length - 1) container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        });

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total:** ${keys.length}`));

        if (totalPages > 1) {
          container.addActionRowComponents(row => {
            const prev = new ButtonBuilder().setCustomId(`forcenicklist_prev_${message.author.id}_${pageNum - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(pageNum === 0);
            const next = new ButtonBuilder().setCustomId(`forcenicklist_next_${message.author.id}_${pageNum + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(pageNum >= totalPages - 1);
            row.setComponents(prev, next);
            return row;
          });
        }

        return container;
      };

      const initial = buildPage(0);
      return message.reply({ components: [initial], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targetArg = args[0];
    const nicknameArg = args.slice(1).join(' ').trim();

    if (!targetArg) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `forcenickname <member> <nickname>` or `forcenickname <member> remove`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const target = await resolveMember(message.guild, targetArg);
    if (!target) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} User Not Found`, 'Could not find that member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const hasManage = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.ManageNicknames);
    const hasHeadmod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'headmod');
    const hasMod = await ModerationPermissions.hasCustomRole(message.member, client, message.guildId, 'mod');
    if (!hasManage && !hasHeadmod && !hasMod && message.member.id !== message.guild.ownerId) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Server** or **Manage Nicknames** permission, or a configured moderator role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Bot Permission`, 'I need the **Manage Nicknames** permission to apply forced nicknames.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (target.id === message.guild.ownerId) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Owner`, 'Cannot modify the guild owner.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const executorHighest = message.member.roles.highest;
    const targetHighest = target.roles.highest;
    const botHighest = botMember.roles.highest;

    if (message.member.id !== message.guild.ownerId && targetHighest && executorHighest && targetHighest.position >= executorHighest.position) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Hierarchy`, 'The target member has an equal or higher role than you.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (targetHighest && botHighest && botHighest.position <= targetHighest.position) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Hierarchy`, 'I cannot modify that member due to role hierarchy.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (target.roles.highest?.managed && !target.user?.bot) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Managed Role`, 'Cannot apply forced nicknames to a member with managed roles.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!client.db) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Missing`, 'Database is not configured.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
    if (!guildData.moderation) guildData.moderation = {};
    if (!guildData.moderation.forcedNicknames) guildData.moderation.forcedNicknames = {};

    if (!nicknameArg || nicknameArg.toLowerCase() === 'remove') {
      if (!guildData.moderation.forcedNicknames[target.id]) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.info} Not Configured`, 'No forced nickname is configured for that user.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const oldNickname = guildData.moderation.forcedNicknames[target.id]?.nickname || 'Unknown';
      delete guildData.moderation.forcedNicknames[target.id];

      if (Object.keys(guildData.moderation.forcedNicknames).length === 0) delete guildData.moderation.forcedNicknames;

      await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });

      await sendLog(client, message.guildId, LOG_EVENTS.MOD_FORCENICK, {
        executor: message.author,
        target: target.user,
        action: 'Removed',
        details: `Forced nickname "${oldNickname}" removed`
      });

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enforcement Removed`, `Forced nickname enforcement removed for <@${target.id}>.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const nickname = nicknameArg;
    if (!nickname || nickname.length === 0) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Nickname`, 'Nickname cannot be empty.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    if (nickname.length > 32) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Nickname cannot exceed 32 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    if (isEmojiOnly(nickname)) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Nickname`, 'Emoji-only nicknames are not allowed.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    guildData.moderation.forcedNicknames[target.id] = { nickname, by: message.author.id, ts: Date.now() };
    await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });

    try {
      markCommandInvoker(message.guild.id, 'forcenickname', target.id, message.author);
      await target.setNickname(nickname, `Forced nickname set by ${message.author.tag}`);
    } catch (err) {
      console.error('[forcenickname] setNickname failed:', err?.message || err);
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, 'Failed to set nickname. Ensure I have permission and role hierarchy allows it.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    await sendLog(client, message.guildId, LOG_EVENTS.MOD_FORCENICK, {
      executor: message.author,
      target: target.user,
      action: 'Set',
      details: `Forced nickname set to "${nickname}"`
    });

    return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Enforced`, `Forced nickname **${nickname}** applied to <@${target.id}> and will be re-applied on change/rejoin.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
