import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(title));
  container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(textDisplay => textDisplay.setContent(description));
  return container;
};

const resolveRole = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<@&>]/g, '');
  let role = guild.roles.cache.get(clean);
  if (!role) role = guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
  return role || null;
};

const resolveMember = async (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<@!>]/g, '');
  let member = guild.members.cache.get(clean);
  if (!member) {
    try { member = await guild.members.fetch(clean).catch(() => null); } catch (e) { member = null; }
  }
  if (!member) member = guild.members.cache.find(m => m.user.username.toLowerCase() === input.toLowerCase());
  return member || null;
};

export default {
  name: 'bindrole',
  description: 'Toggle a sticky role binding for a member. Guild owner only.',
  usage: 'bindrole <member> <role> | bindrole add <member> <role> | bindrole remove <member> <role> | bindrole list',
  category: 'Moderation',

  async execute(message, args, client) {
    if (message.member.id !== message.guild.ownerId) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'Only the guild owner can use this command.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const sub = args[0]?.toLowerCase?.();

    if (sub === 'reset') {
      if (!args[1]) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `bindrole reset <member>` or `bindrole reset all`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const targetArg = args[1].toLowerCase();
      if (targetArg === 'all') {
        const confirmId = `bindreset_confirm_${message.author.id}_${message.guildId}`;
        const cancelId = `bindreset_cancel_${message.author.id}_${message.guildId}`;
        const confirmContainer = new ContainerBuilder();
        confirmContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.banned || '⚠️'} Confirm Reset All`));
        confirmContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        confirmContainer.addTextDisplayComponents(td => td.setContent('This will remove all role bindings for this server. This cannot be undone. Continue?'));
        confirmContainer.addActionRowComponents(row => {
          const confirm = new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Danger);
          const cancel = new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary);
          row.setComponents(confirm, cancel);
          return row;
        });

        if (!client.bindResetConfirmations) client.bindResetConfirmations = new Map();
        client.bindResetConfirmations.set(confirmId, { guildId: message.guildId, authorId: message.author.id });
        client.bindResetConfirmations.set(cancelId, true);

        return message.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const target = await resolveMember(message.guild, args[1]);
      if (!target) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Member Not Found`, 'Could not find the specified member.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };
      if (!guildData.binds || !guildData.binds[target.id]) return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} Not Found`, `No binds found for **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      delete guildData.binds[target.id];
      await client.db.updateOne({ guildId: message.guildId }, { $set: { binds: guildData.binds } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Reset`, `Bindings for **${target.user.tag}** have been cleared.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'list') {
      const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
      const entries = Object.entries(guildData.binds || {});
      if (entries.length === 0) return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} No Binds`, 'There are no role binds configured for this server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const PER_PAGE = 4;
      const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE));

      const buildPage = (pageNum) => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.commands || '🔗'} Sticky Role Bindings`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        const page = entries.slice(pageNum * PER_PAGE, pageNum * PER_PAGE + PER_PAGE);
        page.forEach(([memberId, roles], idx) => {
          const memberObj = message.guild.members.cache.get(memberId);
          container.addTextDisplayComponents(td => td.setContent(`**Member:** <@${memberId}> ${memberId}`));
          if (!roles || roles.length === 0) {
            container.addTextDisplayComponents(td => td.setContent('_No roles bound_'));
          } else {
            const lines = roles.map(rid => {
              const roleObj = message.guild.roles.cache.get(rid);
              if (roleObj) return `• <@&${rid}> — ${rid}`;
              return `• Role ID: ${rid}`;
            });
            container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
          }
          if (idx < page.length - 1) container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        });

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total Members:** ${entries.length}`));

        if (totalPages > 1) {
            container.addActionRowComponents(row => {
            const prev = new ButtonBuilder().setCustomId(`bindlist_prev_${message.author.id}_${pageNum - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(pageNum === 0);
            const next = new ButtonBuilder().setCustomId(`bindlist_next_${message.author.id}_${pageNum + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(pageNum >= totalPages - 1);
            row.setComponents(prev, next);
            return row;
          });
        }

        return container;
      };

      const initial = buildPage(0);
      return message.reply({ components: [initial], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
    let memberArg;
    let roleArg;

    if (sub === 'add' || sub === 'remove') {
      if (!args || args.length < 3) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `bindrole add|remove <member> <role>`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      memberArg = args[1];
      roleArg = args[2];
    } else {
      if (!args || args.length < 2) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: `bindrole <member> <role>` or `bindrole add|remove <member> <role>`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }
      memberArg = args[0];
      roleArg = args[1];
    }

    const target = await resolveMember(message.guild, memberArg);
    if (!target) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Member Not Found`, 'Could not find the specified member in this server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const role = resolveRole(message.guild, roleArg);
    if (!role) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role in this server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (role.managed) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Bind Role`, 'Cannot bind managed/integration roles.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (role.id === message.guild.id) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Role`, 'Cannot bind the @everyone role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (target.id === message.guild.ownerId) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Target`, 'Cannot bind roles for the guild owner.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
    const botHighest = botMember.roles.highest?.position ?? 0;
    if (role.position >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Bind Role`, 'I cannot bind a role equal to or higher than my highest role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const executorHighest = message.member.roles.highest?.position ?? 0;
    if (message.member.id !== message.guild.ownerId && role.position >= executorHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Bind Role`, 'You cannot bind a role equal to or higher than your highest role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };
    if (!guildData.binds) guildData.binds = {};
    if (!guildData.binds[target.id]) guildData.binds[target.id] = [];

    const current = guildData.binds[target.id] || [];
    if (sub === 'add') {
      if (current.includes(role.id)) return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} Already Bound`, `Role <@&${role.id}> is already bound to **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      current.push(role.id);
      guildData.binds[target.id] = current;
      await client.db.updateOne({ guildId: message.guildId }, { $set: { binds: guildData.binds } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Bound`, `Role <@&${role.id}> has been bound to **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'remove') {
      if (!current.includes(role.id)) return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} Not Bound`, `Role <@&${role.id}> is not bound to **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      const filtered = current.filter(rid => rid !== role.id);
      if (filtered.length === 0) delete guildData.binds[target.id]; else guildData.binds[target.id] = filtered;
      await client.db.updateOne({ guildId: message.guildId }, { $set: { binds: guildData.binds } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Unbound`, `Role <@&${role.id}> has been unbound from **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const already = current.includes(role.id);
    if (already) {
      const filtered = current.filter(rid => rid !== role.id);
      if (filtered.length === 0) delete guildData.binds[target.id]; else guildData.binds[target.id] = filtered;
      await client.db.updateOne({ guildId: message.guildId }, { $set: { binds: guildData.binds } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Unbound`, `Role <@&${role.id}> has been unbound from **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    current.push(role.id);
    guildData.binds[target.id] = current;
    await client.db.updateOne({ guildId: message.guildId }, { $set: { binds: guildData.binds } }, { upsert: true });
    return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Bound`, `Role <@&${role.id}> has been bound to **${target.user.tag}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
