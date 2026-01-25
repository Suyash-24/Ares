import { PermissionsBitField, ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

export default {
  name: 'banflux',
  description: 'Bulk-ban the most recently joined members (anti-raid).',
  usage: 'banflux <count> [reason] ',
  category: 'Moderation',
  async execute(message, args, client) {

    const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
    const isOwner = message.guild.ownerId === message.author.id;
    const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
    const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
    const hasDiscordAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);

    if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Missing Permissions`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('You need **Discord Administrator** + **Antinuke Admin** permissions to run this command.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const countArg = parseInt(args[0], 10);
    const reason = args.slice(1).join(' ') || undefined;

    if (isNaN(countArg) || countArg < 1) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Invalid Count`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('Provide a valid number of recent members to ban (count >= 1).'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (countArg > 25) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Count Too Large`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('The maximum allowed count is 25.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const COOLDOWN_MS = 20 * 1000;
    if (!message.client.banfluxCooldowns) message.client.banfluxCooldowns = new Map();
    const cooldownKey = `${message.guild.id}_${message.author.id}`;
    const last = message.client.banfluxCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    if (now - last < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Cooldown`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent(`Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before using this command again.`));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
    message.client.banfluxCooldowns.set(cooldownKey, now);
    setTimeout(() => {
      try { message.client.banfluxCooldowns.delete(cooldownKey); } catch (e) {}
    }, COOLDOWN_MS);

    try { await message.guild.members.fetch(); } catch (e) { }

    const totalGuildMembers = message.guild.memberCount || Array.from(message.guild.members.cache.values()).length;
    if (countArg > totalGuildMembers) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Count Too Large`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('The requested count exceeds the guild member count.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const membersArray = Array.from(message.guild.members.cache.values()).filter(m => m.joinedTimestamp).sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));
    const selected = membersArray.slice(0, countArg);

    const botMember = message.guild.members.me || message.guild.members.cache.get(message.client.user.id);
    if (!botMember) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Bot Not In Guild`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('Unable to determine bot member in this guild.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (!botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Missing Permission`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('I need the **Ban Members** permission to perform this action.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const executorHighest = message.member.roles.highest?.position ?? 0;
    const botHighest = botMember.roles.highest?.position ?? 0;

    const eligible = [];
    for (const m of selected) {
      if (!m) continue;
      if (m.id === message.author.id) continue;
      if (m.id === message.client.user.id) continue;
      if (m.user.bot) continue;
      const targetHighest = m.roles.highest?.position ?? 0;
      if (executorHighest <= targetHighest) continue;
      if (botHighest <= targetHighest) continue;
      eligible.push(m);
    }

    if (eligible.length === 0) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.members} No Eligible Targets`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('No eligible members were found to ban.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const nonce = Date.now().toString();
    const confirmId = `banflux_confirm_${message.author.id}_${nonce}`;
    const cancelId = `banflux_cancel_${message.author.id}_${nonce}`;

    if (!message.client.banfluxConfirmations) message.client.banfluxConfirmations = new Map();

    const selectedPreview = eligible.slice(0, 10).map(m => `${m.user.tag} (${m.user.id})`).join('\n');

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.banned || ':warning:'} Confirm Ban Flux`));
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(`**Requested:** ${countArg}\n**Eligible:** ${eligible.length}\n**Preview (first ${Math.min(10, eligible.length)}):**\n${selectedPreview}`));
    container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

    container.addActionRowComponents((row) => {
      const confirmBtn = new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
      row.setComponents(confirmBtn, cancelBtn);
      return row;
    });

    message.client.banfluxConfirmations.set(confirmId, { executorId: message.author.id, eligibleIds: eligible.map(m => m.id), reason, count: countArg });
    message.client.banfluxConfirmations.set(cancelId, { executorId: message.author.id });

    setTimeout(() => {
      message.client.banfluxConfirmations.delete(confirmId);
      message.client.banfluxConfirmations.delete(cancelId);
    }, 60 * 1000);

    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
