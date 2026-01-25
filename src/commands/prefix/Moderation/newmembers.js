import { PermissionsBitField, ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
  name: 'newmembers',
  description: 'View list of recently joined members',
  usage: 'newmembers [count]',
  category: 'Moderation',
  async execute(message, args) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Missing Permissions`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent('You need the **Manage Messages** permission to use this command.'));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    let count = 5;
    if (args[0]) {
      const parsed = parseInt(args[0], 10);
      if (!isNaN(parsed)) count = parsed;
    }
    count = Math.max(1, Math.min(25, count));

    try { await message.guild.members.fetch(); } catch (e) {  }

    const allMembers = Array.from(message.guild.members.cache.values())
      .filter(m => !m.user.bot && m.joinedTimestamp)
      .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
      .slice(0, 50);

    if (!allMembers || allMembers.length === 0) {
      const containerEmpty = new ContainerBuilder();
      containerEmpty.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || ':information_source:'} New Members`));
      containerEmpty.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      containerEmpty.addTextDisplayComponents(td => td.setContent('No recent members found.'));
      return message.reply({ components: [containerEmpty], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const PER_PAGE = 5;
    const totalPages = Math.ceil(allMembers.length / PER_PAGE);
    const currentPage = 0;

    const buildPage = (pageNum) => {
      const start = pageNum * PER_PAGE;
      const pageMembers = allMembers.slice(start, start + PER_PAGE);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.members || ':information_source:'} New Members`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

      if (!pageMembers || pageMembers.length === 0) {
        container.addTextDisplayComponents(td => td.setContent('No recent members found.'));
      } else {
        pageMembers.forEach((m, idx) => {
          const joinedDate = m.joinedAt ? m.joinedAt.toLocaleDateString() : 'Unknown';
          const joinedTime = m.joinedAt ? m.joinedAt.toLocaleTimeString() : '';

          container.addTextDisplayComponents(td => td.setContent(`**${m.user.tag}** (${m.user.id})`));

          container.addTextDisplayComponents(td => td.setContent(`**joined**: ${joinedDate} , ${joinedTime}`));

          if (idx !== pageMembers.length - 1) {
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
          }
        });

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      }
      container.addTextDisplayComponents(td => td.setContent(`**Page:** ${pageNum + 1}/${totalPages} | **Total:** ${allMembers.length} member${allMembers.length !== 1 ? 's' : ''}`));

      container.addActionRowComponents((row) => {
        const prevBtn = new ButtonBuilder()
          .setCustomId(`newmembers_prev_${message.author.id}_${pageNum}`)
          .setEmoji(EMOJIS.pageprevious)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNum === 0);

        const nextBtn = new ButtonBuilder()
          .setCustomId(`newmembers_next_${message.author.id}_${pageNum}`)
          .setEmoji(EMOJIS.pagenext)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNum >= totalPages - 1);

        row.setComponents(prevBtn, nextBtn);
        return row;
      });

      return container;
    };

    const initial = buildPage(currentPage);
    return message.reply({ components: [initial], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
