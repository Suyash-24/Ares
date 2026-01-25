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

export default {
  name: 'restrictcommand',
  description: 'Restrict a command to specific roles. Main toggles restriction on/off; use add/remove to manage roles.',
  usage: 'restrictcommand <cmd> <role> | restrictcommand add <cmd> <role> | restrictcommand remove <cmd> <role>',
  category: 'Moderation',

  async execute(message, args, client) {
    const isOwner = message.member.id === message.guild.ownerId;
    const hasManage = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    if (!isOwner && !hasManage) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Guild** permission to use this command.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (!client.db) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} DB Missing`, 'Database is not configured.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    const sub = args[0]?.toLowerCase?.();
    let cmdName = null;
    let roleArg = null;

    if (sub === 'add' || sub === 'remove') {
      cmdName = args[1];
      roleArg = args[2];
      if (!cmdName || !roleArg) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: restrictcommand add|remove <cmd> <role>')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } else {
      cmdName = args[0];
      roleArg = args[1];
      if (!cmdName) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: restrictcommand <cmd> [role] (no role = remove restriction, role = remove role from restriction)')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    cmdName = String(cmdName).toLowerCase();
    let role = null;
    if (roleArg) {
      role = resolveRole(message.guild, roleArg);
      if (!role) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      if (role.managed) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'Cannot use a managed/integration role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const botMember = message.guild.members.me || message.guild.members.cache.get(client.user.id);
      const botHighest = botMember.roles.highest?.position ?? 0;
      if (role.position >= botHighest) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Cannot Modify Role`, 'I cannot manage or validate a role equal to or higher than my highest role.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
    if (!guildData.moderation) guildData.moderation = {};
    if (!guildData.moderation.restrictedCommands) guildData.moderation.restrictedCommands = {};

    if (sub === 'reset') {

      const confirmId = `restrictreset_confirm_${message.author.id}_${message.guildId}`;
      const cancelId = `restrictreset_cancel_${message.author.id}_${message.guildId}`;
      const confirmContainer = new ContainerBuilder();
      confirmContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '⚠️'} Confirm Reset`));
      confirmContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      confirmContainer.addTextDisplayComponents(td => td.setContent('This will remove all command restrictions for this server. This action cannot be undone. Do you want to continue?'));
      confirmContainer.addActionRowComponents(row => {
        const confirm = new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Danger);
        const cancel = new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary);
        row.setComponents(confirm, cancel);
        return row;
      });

      if (!client.restrictResetConfirmations) client.restrictResetConfirmations = new Map();
      client.restrictResetConfirmations.set(confirmId, { guildId: message.guildId, authorId: message.author.id });
      client.restrictResetConfirmations.set(cancelId, true);

      return message.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'list') {
      const entries = Object.entries(guildData.moderation.restrictedCommands || {});
      if (entries.length === 0) return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} No Restrictions`, 'There are no restricted commands configured.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      const PER_PAGE = 4;
      const totalPages = Math.ceil(entries.length / PER_PAGE);
      const buildPage = (pageNum) => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.commands || '📜'} Restricted Commands`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

        const page = entries.slice(pageNum * PER_PAGE, pageNum * PER_PAGE + PER_PAGE);
        page.forEach(([cmd, roles], idx) => {
          container.addTextDisplayComponents(td => td.setContent(`**Command:** \`${cmd}\``));
          if (!roles || roles.length === 0) {
            container.addTextDisplayComponents(td => td.setContent('_No roles configured_'));
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
        container.addTextDisplayComponents(td => td.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total Commands:** ${entries.length}`));

        if (totalPages > 1) {
          container.addActionRowComponents(row => {
            const prev = new ButtonBuilder().setCustomId(`restrictlist_prev_${message.author.id}_${pageNum - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(pageNum === 0);
            const next = new ButtonBuilder().setCustomId(`restrictlist_next_${message.author.id}_${pageNum + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(pageNum >= totalPages - 1);
            row.setComponents(prev, next);
            return row;
          });
        }

        return container;
      };

      const initial = buildPage(0);
      return message.reply({ components: [initial], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const current = guildData.moderation.restrictedCommands[cmdName] || [];

    try {
      if (sub === 'add') {
        if (current.includes(role.id)) return message.reply({ components: [buildNotice(`# ${EMOJIS.info} Already Added`, `Role **${role.name}** is already allowed to use \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        current.push(role.id);
        guildData.moderation.restrictedCommands[cmdName] = current;
        await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });
        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Added`, `Role **${role.name}** can now use \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (sub === 'remove') {
        if (!role) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: restrictcommand remove <cmd> <role>')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        if (!current.includes(role.id)) return message.reply({ components: [buildNotice(`# ${EMOJIS.info} Not Present`, `Role **${role.name}** was not configured for \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        const filtered = current.filter(id => id !== role.id);
        if (filtered.length === 0) delete guildData.moderation.restrictedCommands[cmdName]; else guildData.moderation.restrictedCommands[cmdName] = filtered;
        await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });
        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Removed`, `Role **${role.name}** can no longer use \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (current.length > 0) {
        delete guildData.moderation.restrictedCommands[cmdName];
        await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });
        return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Restriction Disabled`, `Command \`${cmdName}\` is no longer restricted.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (!role) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, 'Usage: restrictcommand <cmd> <role> (use `add` to add additional roles)')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

      guildData.moderation.restrictedCommands[cmdName] = [role.id];
      await client.db.updateOne({ guildId: message.guildId }, { $set: { moderation: guildData.moderation } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Restriction Enabled`, `Command \`${cmdName}\` is now restricted to role **${role.name}**.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('[restrictcommand] error:', err);
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Action Failed`, 'Failed to update restriction. Try again later.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
  }
};
