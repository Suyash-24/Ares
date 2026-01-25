import { ChannelType, MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../utils/emojis.js';
import { ensureLevelingConfig } from '../utils/leveling.js';

export default function registerModalInteraction(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'suggest_modal') {
      const title = interaction.fields.getTextInputValue('suggestion_title');
      const description = interaction.fields.getTextInputValue('suggestion_description');
      const reason = interaction.fields.getTextInputValue('suggestion_reason');

      const config = client.config;
      const allowAll = config.suggestAllowAllChannels === true;

      if (!config.suggestChannelId) {
        await interaction.reply({
          content: `${EMOJIS.error} **Error** - Suggestion channel not configured.`,
          flags: 64
        });
        return;
      }

      let targetChannel = null;
      try {
        targetChannel = await interaction.guild.channels.fetch(config.suggestChannelId);
      } catch (error) {
        targetChannel = null;
      }

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: `${EMOJIS.error} **Error** - Suggestion channel not found or is not a text channel.`,
          flags: 64
        });
        return;
      }

      if (!allowAll && interaction.channelId !== targetChannel.id) {
        await interaction.reply({
          content: `${EMOJIS.error} **Error** - Suggestions can only be submitted in ${targetChannel}.`,
          flags: 64
        });
        return;
      }

      try {
        const suggestionContainer = new ContainerBuilder();
        suggestionContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.commands} **Suggestion from ${interaction.user.username}**`)
        );
        suggestionContainer.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        suggestionContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`**Title:** ${title}\n\n**Description:**\n${description}\n\n**Benefits/Reasons:**\n${reason}\n\n**User ID:** ${interaction.user.id}`)
        );

        const upvoteButton = new ButtonBuilder()
          .setCustomId(`suggest_upvote_${Date.now()}_${Math.random()}`)
          .setLabel('0')
          .setEmoji(EMOJIS.upvote)
          .setStyle(ButtonStyle.Success);

        const downvoteButton = new ButtonBuilder()
          .setCustomId(`suggest_downvote_${Date.now()}_${Math.random()}`)
          .setLabel('0')
          .setEmoji(EMOJIS.downvote)
          .setStyle(ButtonStyle.Danger);

        suggestionContainer.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        suggestionContainer.addActionRowComponents((row) =>
          row.setComponents(upvoteButton, downvoteButton)
        );

        await targetChannel.send({
          components: [suggestionContainer],
          flags: MessageFlags.IsComponentsV2
        });

        const responseContainer = new ContainerBuilder();
        responseContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`${EMOJIS.success} **Suggestion Submitted**`)
        );
        responseContainer.addSeparatorComponents((separator) =>
          separator.setSpacing(SeparatorSpacingSize.Small)
        );
        responseContainer.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            allowAll && interaction.channelId !== targetChannel.id
              ? `Your suggestion has been sent to ${targetChannel}.`
              : 'Your suggestion has been submitted to the team!'
          )
        );

        const reply = await interaction.reply({
          components: [responseContainer],
          flags: MessageFlags.IsComponentsV2
        });

        setTimeout(() => {
          reply.delete().catch(() => {});
        }, 3000);
      } catch (error) {
        console.error('Error submitting suggestion:', error);
        await interaction.reply({
          content: `${EMOJIS.error} **Error** - Failed to submit your suggestion. Please try again later.`,
          flags: 64
        });
      }
    }

    if (interaction.customId.startsWith('welcome_modal_')) {
      const parts = interaction.customId.split('_');
      const option = parts[2];
      const channelId = parts[3];
      const authorId = parts[4];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.welcome || !guildData.welcome.channels) {
        await interaction.reply({ content: '❌ Welcome system not configured.', flags: 64 }).catch(() => {});
        return;
      }

      const channelConfig = guildData.welcome.channels.find(c => c.channelId === channelId);
      if (!channelConfig) {
        await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
        return;
      }

      const value = interaction.fields.getTextInputValue('value')?.trim() || null;

      const parseColor = (input) => {
        if (!input) return null;
        let hex = input.replace('#', '');
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
        return parseInt(hex, 16);
      };

      const isValidUrl = (str) => {
        if (!str || typeof str !== 'string') return false;
        const lower = str.trim().toLowerCase();
        return lower.startsWith('http://') || lower.startsWith('https://');
      };

      switch (option) {
        case 'content':
          channelConfig.content = value;
          break;
        case 'title':
          if (value && value.length > 256) {
            await interaction.reply({ content: '❌ Title cannot exceed 256 characters.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.title = value;
          break;
        case 'description':
          if (value && value.length > 4000) {
            await interaction.reply({ content: '❌ Description cannot exceed 4000 characters.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.description = value;
          break;
        case 'color':
          if (!value) {
            channelConfig.color = null;
          } else {
            const color = parseColor(value);
            if (color === null) {
              await interaction.reply({ content: '❌ Invalid hex color. Use format like `#5865F2`.', flags: 64 }).catch(() => {});
              return;
            }
            channelConfig.color = color;
          }
          break;
        case 'author':
          if (!value) {
            channelConfig.author = null;
            channelConfig.authorIcon = null;
          } else if (value.includes('&&')) {
            const [name, icon] = value.split('&&').map(v => v.trim());
            channelConfig.author = name || null;
            channelConfig.authorIcon = icon || null;
          } else {
            channelConfig.author = value;
          }
          break;
        case 'footer':
          if (!value) {
            channelConfig.footer = null;
            channelConfig.footerIcon = null;
          } else if (value.includes('&&')) {
            const [text, icon] = value.split('&&').map(v => v.trim());
            channelConfig.footer = text || null;
            channelConfig.footerIcon = icon || null;
          } else {
            channelConfig.footer = value;
          }
          break;
        case 'thumbnail':
          if (value && !isValidUrl(value) && !value.startsWith('{')) {
            await interaction.reply({ content: '❌ Invalid URL. Use a valid image URL or placeholder like `{user.avatar}`.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.thumbnail = value;
          break;
        case 'image':
          if (value && !isValidUrl(value)) {
            await interaction.reply({ content: '❌ Invalid URL.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.image = value;
          break;
        case 'selfdestruct':
          if (!value) {
            channelConfig.selfDestruct = null;
          } else {
            const seconds = parseInt(value);
            if (isNaN(seconds) || seconds < 6 || seconds > 60) {
              await interaction.reply({ content: '❌ Self-destruct must be between 6 and 60 seconds.', flags: 64 }).catch(() => {});
              return;
            }
            channelConfig.selfDestruct = seconds;
          }
          break;
        case 'fields':
          channelConfig.fields = value;
          break;
        case 'buttons':
          channelConfig.buttons = value;
          break;
        default:
          await interaction.reply({ content: '❌ Unknown option.', flags: 64 }).catch(() => {});
          return;
      }

      await db.updateOne({ guildId: interaction.guildId }, { $set: { welcome: guildData.welcome } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');

      const parseFields = (fieldsStr) => {
        if (!fieldsStr) return [];
        return fieldsStr.split(';;').map(f => {
          const [name, value, inline] = f.split('&&').map(s => s.trim());
          if (!name || !value) return null;
          return { name, value, inline: inline?.toLowerCase() === 'true' };
        }).filter(Boolean);
      };

      const parseButtons = (buttonsStr) => {
        if (!buttonsStr) return [];
        return buttonsStr.split(';;').map(b => {
          const [label, url] = b.split('&&').map(s => s.trim());
          if (!label || !url) return null;
          return { label, url };
        }).filter(Boolean);
      };

      const container = new ContainerBuilder();
      if (channelConfig.color) container.setAccentColor(channelConfig.color);
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Config for <#${channelId}>`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent(
        `**Content:** ${channelConfig.content ? (channelConfig.content.length > 50 ? channelConfig.content.slice(0, 50) + '...' : channelConfig.content) : 'Not set'}\n` +
        `**Color:** ${channelConfig.color ? `\`#${channelConfig.color.toString(16).padStart(6, '0').toUpperCase()}\`` : 'Not set'}\n` +
        `**Self-Destruct:** ${channelConfig.selfDestruct ? `${channelConfig.selfDestruct}s` : 'Off'}`
      ));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent(
        `**Author:** ${channelConfig.author || 'Not set'}\n` +
        `**Author Icon:** ${channelConfig.authorIcon ? 'Set' : 'Not set'}\n` +
        `**Title:** ${channelConfig.title || 'Not set'}\n` +
        `**Description:** ${channelConfig.description ? (channelConfig.description.length > 50 ? channelConfig.description.slice(0, 50) + '...' : channelConfig.description) : 'Not set'}\n` +
        `**Footer:** ${channelConfig.footer || 'Not set'}\n` +
        `**Footer Icon:** ${channelConfig.footerIcon ? 'Set' : 'Not set'}\n` +
        `**Thumbnail:** ${channelConfig.thumbnail ? 'Set' : 'Not set'}\n` +
        `**Image:** ${channelConfig.image ? 'Set' : 'Not set'}\n` +
        `**Fields:** ${channelConfig.fields ? `${parseFields(channelConfig.fields).length} field(s)` : 'None'}\n` +
        `**Buttons:** ${channelConfig.buttons ? `${parseButtons(channelConfig.buttons).length} button(s)` : 'None'}`
      ));

      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`welcome_cfg_content_${channelId}_${authorId}`).setLabel('Content').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_title_${channelId}_${authorId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_description_${channelId}_${authorId}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_color_${channelId}_${authorId}`).setLabel('Color').setStyle(ButtonStyle.Secondary)
      ));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`welcome_cfg_author_${channelId}_${authorId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_footer_${channelId}_${authorId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_thumbnail_${channelId}_${authorId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_image_${channelId}_${authorId}`).setLabel('Image').setStyle(ButtonStyle.Secondary)
      ));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`welcome_cfg_selfdestruct_${channelId}_${authorId}`).setLabel('Self-Destruct').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_fields_${channelId}_${authorId}`).setLabel('Fields').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_cfg_buttons_${channelId}_${authorId}`).setLabel('Buttons').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`welcome_testch_${channelId}_${authorId}`).setLabel('Test').setStyle(ButtonStyle.Primary).setEmoji(EMOJIS.test)
      ));

      await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

  if (interaction.customId.startsWith('leveling_reward_modal:')) {
    const parts = interaction.customId.split(':');
    const authorId = parts[1];
    const roleId = parts[2];
    if (interaction.user.id !== authorId) {
      await interaction.reply({ content: '❌ This modal is locked to the invoker.', flags: 64 }).catch(() => {});
      return;
    }
    if (!interaction.member.permissions.has('ManageGuild') && !interaction.member.permissions.has('Administrator')) {
      await interaction.reply({ content: '❌ Manage Server is required.', flags: 64 }).catch(() => {});
      return;
    }
    const levelStr = interaction.fields.getTextInputValue('level')?.trim();
    const level = parseInt(levelStr, 10);
    if (!Number.isFinite(level) || level < 1) {
      await interaction.reply({ content: '❌ Level must be a positive number.', flags: 64 }).catch(() => {});
      return;
    }

    const role = interaction.guild?.roles?.cache?.get(roleId) || null;
    const me = interaction.guild?.members?.me;
    if (!role) {
      await interaction.reply({ content: '❌ Role not found.', flags: 64 }).catch(() => {});
      return;
    }
    if (!me || me.roles.highest.comparePositionTo(role) <= 0) {
      await interaction.reply({ content: '❌ I need my role above that role to assign it.', flags: 64 }).catch(() => {});
      return;
    }

    const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
    leveling.rewards.roles = leveling.rewards.roles || [];
    const existingIdx = leveling.rewards.roles.findIndex(r => r.roleId === roleId);
    if (existingIdx !== -1) {
      leveling.rewards.roles[existingIdx].level = level;
    } else {
      leveling.rewards.roles.push({ level, roleId });
    }
    await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

    try {
      const { buildRewards } = await import('../commands/prefix/Leveling/leveling.js');
      const panel = buildRewards(leveling, authorId, interaction.guild);
      if (interaction.message) {
        await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      console.error('[Leveling] Reward modal update failed:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '✅ Reward saved.', flags: 64 }).catch(() => {});
      }
    }
    return;
  }

  if (interaction.customId.startsWith('leveling_msg_modal:')) {
    const [, field, authorId] = interaction.customId.split(':');
    if (interaction.user.id !== authorId) {
      await interaction.reply({ content: '❌ This modal is locked to the invoker.', flags: 64 }).catch(() => {});
      return;
    }
    if (!interaction.member.permissions.has('ManageGuild') && !interaction.member.permissions.has('Administrator')) {
      await interaction.reply({ content: '❌ Manage Server is required.', flags: 64 }).catch(() => {});
      return;
    }

    const value = interaction.fields.getTextInputValue('value')?.trim() || '';
    const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
    leveling.announce.message = leveling.announce.message || {};

    if (value) {
      leveling.announce.message[field] = value;
    } else {
      delete leveling.announce.message[field];
    }

    await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

    try {
      const { buildMessageEditor } = await import('../commands/prefix/Leveling/leveling.js');
      const panel = buildMessageEditor(leveling, authorId);
      if (interaction.message) {
        await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      console.error('[Leveling] Message modal update failed:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '✅ Saved.', flags: 64 }).catch(() => {});
      }
    }
    return;
  }

  if (interaction.customId.startsWith('leveling_template_modal:')) {
    const [, authorId] = interaction.customId.split(':');
    if (interaction.user.id !== authorId) {
      await interaction.reply({ content: '❌ This modal is locked to the invoker.', flags: 64 }).catch(() => {});
      return;
    }

    if (!interaction.member.permissions.has('ManageGuild') && !interaction.member.permissions.has('Administrator')) {
      await interaction.reply({ content: '❌ Manage Server is required.', flags: 64 }).catch(() => {});
      return;
    }

    const template = interaction.fields.getTextInputValue('template')?.slice(0, 500) || '';
    const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
    leveling.announce.template = template;
    await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });

    try {
      if (interaction.message) {
        const { buildDashboard } = await import('../commands/prefix/Leveling/leveling.js');
        const panel = buildDashboard(leveling, authorId);
        await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ content: '✅ Template saved.', flags: 64 });
      }
    } catch (err) {
      console.error('[Leveling] Modal update failed:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '✅ Template saved.', flags: 64 }).catch(() => {});
      }
    }
    return;
  }

    if (interaction.customId.startsWith('welcome_addch_modal_')) {
      const authorId = interaction.customId.split('_')[3];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const input = interaction.fields.getTextInputValue('channel')?.trim();
      if (!input) {
        await interaction.reply({ content: '❌ Please provide a channel.', flags: 64 }).catch(() => {});
        return;
      }

      let channel = null;
      const channelIdMatch = input.match(/<#(\d+)>/) || input.match(/^(\d{17,19})$/);
      if (channelIdMatch) {
        channel = interaction.guild.channels.cache.get(channelIdMatch[1]);
      } else {

        const searchName = input.replace(/^#/, '').toLowerCase();
        channel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === searchName && c.isTextBased());
      }

      if (!channel) {
        await interaction.reply({ content: '❌ Channel not found. Use channel name (e.g. `general`) or channel ID.', flags: 64 }).catch(() => {});
        return;
      }

      if (!channel.isTextBased()) {
        await interaction.reply({ content: '❌ Please select a text channel.', flags: 64 }).catch(() => {});
        return;
      }

      const channelId = channel.id;
      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.welcome) {
        guildData.welcome = { enabled: false, channels: [] };
      }
      if (!guildData.welcome.channels) {
        guildData.welcome.channels = [];
      }

      if (guildData.welcome.channels.some(c => c.channelId === channelId)) {
        await interaction.reply({ content: `❌ <#${channelId}> is already a welcome channel.`, flags: 64 }).catch(() => {});
        return;
      }

      guildData.welcome.channels.push({
        channelId,
        content: null,
        title: 'Welcome!',
        description: '{user.mention} has joined the server!',
        color: 0x5865F2,
        thumbnail: '{user.avatar}',
        author: null,
        authorIcon: null,
        footer: 'Member #{guild.count}',
        footerIcon: null,
        image: null,
        selfDestruct: null,
        fields: null,
        buttons: null
      });

      await db.updateOne({ guildId: interaction.guildId }, { $set: { welcome: guildData.welcome } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
      const config = guildData.welcome;

      const rebuildMainContainer = () => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Welcome Configuration`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
          `**Channels:** ${config.channels.length > 0 ? config.channels.map(c => `<#${c.channelId}>`).join(', ') : 'None configured'}`
        ));

        if (config.channels.length > 0) {
          for (let i = 0; i < Math.min(config.channels.length, 3); i++) {
            const ch = config.channels[i];
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
              `### <#${ch.channelId}>\n` +
              `**Title:** ${ch.title || 'Not set'}\n` +
              `**Description:** ${ch.description ? (ch.description.length > 40 ? ch.description.slice(0, 40) + '...' : ch.description) : 'Not set'}\n` +
              `**Self-Destruct:** ${ch.selfDestruct ? `${ch.selfDestruct}s` : 'Off'}\n` +
              `**Fields:** ${ch.fields ? 'Set' : 'None'} | **Buttons:** ${ch.buttons ? 'Set' : 'None'}`
            ));
          }
          if (config.channels.length > 3) {
            container.addTextDisplayComponents(td => td.setContent(`*...and ${config.channels.length - 3} more channel(s)*`));
          }
        }

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Placeholders:**\n` +
          `\`{user}\` \`{user.mention}\` \`{user.tag}\` \`{user.name}\` \`{user.id}\`\n` +
          `\`{user.avatar}\` \`{user.created_at}\` \`{user.joined_at}\`\n` +
          `\`{guild.name}\` \`{guild.id}\` \`{guild.count}\` \`{guild.icon}\`\n` +
          `\`{guild.banner}\` \`{guild.boost_count}\` \`{guild.boost_tier}\`\n` +
          `\`{guild.vanity}\` \`{guild.owner_id}\` \`{timestamp}\``
        ));

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_toggle_${authorId}`)
            .setLabel(config.enabled ? 'Disable' : 'Enable')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(config.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
        ));

        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_addchannel_${authorId}`)
            .setLabel('Add Channel')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`welcome_removechannel_${authorId}`)
            .setLabel('Remove Channel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`welcome_test_${authorId}`)
            .setLabel('Test')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.test)
        ));

        return container;
      };

      await interaction.update({ components: [rebuildMainContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

    if (interaction.customId.startsWith('welcome_rmch_modal_')) {
      const authorId = interaction.customId.split('_')[3];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const input = interaction.fields.getTextInputValue('channel')?.trim();
      if (!input) {
        await interaction.reply({ content: '❌ Please provide a channel.', flags: 64 }).catch(() => {});
        return;
      }

      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.welcome || !guildData.welcome.channels || guildData.welcome.channels.length === 0) {
        await interaction.reply({ content: '❌ No welcome channels configured.', flags: 64 }).catch(() => {});
        return;
      }

      let channelId = null;
      const channelIdMatch = input.match(/<#(\d+)>/) || input.match(/^(\d{17,19})$/);
      if (channelIdMatch) {
        channelId = channelIdMatch[1];
      } else {

        const searchName = input.replace(/^#/, '').toLowerCase();
        const foundConfig = guildData.welcome.channels.find(c => {
          const ch = interaction.guild.channels.cache.get(c.channelId);
          return ch && ch.name.toLowerCase() === searchName;
        });
        if (foundConfig) channelId = foundConfig.channelId;
      }

      if (!channelId) {
        await interaction.reply({ content: '❌ Channel not found. Use channel name (e.g. `general`) or channel ID.', flags: 64 }).catch(() => {});
        return;
      }

      const channelIndex = guildData.welcome.channels.findIndex(c => c.channelId === channelId);
      if (channelIndex === -1) {
        await interaction.reply({ content: `❌ <#${channelId}> is not a configured welcome channel.`, flags: 64 }).catch(() => {});
        return;
      }

      guildData.welcome.channels.splice(channelIndex, 1);

      if (guildData.welcome.channels.length === 0) {
        guildData.welcome.enabled = false;
      }

      await db.updateOne({ guildId: interaction.guildId }, { $set: { welcome: guildData.welcome } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
      const config = guildData.welcome;

      const rebuildMainContainer = () => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Welcome Configuration`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
          `**Channels:** ${config.channels.length > 0 ? config.channels.map(c => `<#${c.channelId}>`).join(', ') : 'None configured'}`
        ));

        if (config.channels.length > 0) {
          for (let i = 0; i < Math.min(config.channels.length, 3); i++) {
            const ch = config.channels[i];
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
              `### <#${ch.channelId}>\n` +
              `**Title:** ${ch.title || 'Not set'}\n` +
              `**Description:** ${ch.description ? (ch.description.length > 40 ? ch.description.slice(0, 40) + '...' : ch.description) : 'Not set'}\n` +
              `**Self-Destruct:** ${ch.selfDestruct ? `${ch.selfDestruct}s` : 'Off'}\n` +
              `**Fields:** ${ch.fields ? 'Set' : 'None'} | **Buttons:** ${ch.buttons ? 'Set' : 'None'}`
            ));
          }
          if (config.channels.length > 3) {
            container.addTextDisplayComponents(td => td.setContent(`*...and ${config.channels.length - 3} more channel(s)*`));
          }
        }

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Placeholders:**\n` +
          `\`{user}\` \`{user.mention}\` \`{user.tag}\` \`{user.name}\` \`{user.id}\`\n` +
          `\`{user.avatar}\` \`{user.created_at}\` \`{user.joined_at}\`\n` +
          `\`{guild.name}\` \`{guild.id}\` \`{guild.count}\` \`{guild.icon}\`\n` +
          `\`{guild.banner}\` \`{guild.boost_count}\` \`{guild.boost_tier}\`\n` +
          `\`{guild.vanity}\` \`{guild.owner_id}\` \`{timestamp}\``
        ));

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_toggle_${authorId}`)
            .setLabel(config.enabled ? 'Disable' : 'Enable')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(config.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
        ));

        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_addchannel_${authorId}`)
            .setLabel('Add Channel')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`welcome_removechannel_${authorId}`)
            .setLabel('Remove Channel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`welcome_test_${authorId}`)
            .setLabel('Test')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.test)
        ));

        return container;
      };

      await interaction.update({ components: [rebuildMainContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

    if (interaction.customId.startsWith('goodbye_addch_modal_')) {
      const authorId = interaction.customId.split('_')[3];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const input = interaction.fields.getTextInputValue('channel')?.trim();
      if (!input) {
        await interaction.reply({ content: '❌ Please provide a channel.', flags: 64 }).catch(() => {});
        return;
      }

      let channel = null;
      const channelIdMatch = input.match(/<#(\d+)>/) || input.match(/^(\d{17,19})$/);
      if (channelIdMatch) {
        channel = interaction.guild.channels.cache.get(channelIdMatch[1]);
      } else {

        const searchName = input.replace(/^#/, '').toLowerCase();
        channel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === searchName && c.isTextBased());
      }

      if (!channel) {
        await interaction.reply({ content: '❌ Channel not found. Use channel name (e.g. `general`) or channel ID.', flags: 64 }).catch(() => {});
        return;
      }

      if (!channel.isTextBased()) {
        await interaction.reply({ content: '❌ Please select a text channel.', flags: 64 }).catch(() => {});
        return;
      }

      const channelId = channel.id;
      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.goodbye) {
        guildData.goodbye = { enabled: false, channels: [] };
      }
      if (!guildData.goodbye.channels) {
        guildData.goodbye.channels = [];
      }

      if (guildData.goodbye.channels.some(c => c.channelId === channelId)) {
        await interaction.reply({ content: `❌ <#${channelId}> is already a goodbye channel.`, flags: 64 }).catch(() => {});
        return;
      }

      guildData.goodbye.channels.push({
        channelId,
        content: null,
        title: 'Farewell!',
        description: '{user.name} has left the server.',
        color: 0xED4245,
        thumbnail: '{user.avatar}',
        author: null,
        authorIcon: null,
        footer: 'Member #{guild.count}',
        footerIcon: null,
        image: null,
        selfDestruct: null,
        fields: null,
        buttons: null
      });

      await db.updateOne({ guildId: interaction.guildId }, { $set: { goodbye: guildData.goodbye } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
      const config = guildData.goodbye;

      const rebuildMainContainer = () => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Goodbye Configuration`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
          `**Channels:** ${config.channels.length > 0 ? config.channels.map(c => `<#${c.channelId}>`).join(', ') : 'None configured'}`
        ));

        if (config.channels.length > 0) {
          for (let i = 0; i < Math.min(config.channels.length, 3); i++) {
            const ch = config.channels[i];
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
              `### <#${ch.channelId}>\n` +
              `**Title:** ${ch.title || 'Not set'}\n` +
              `**Description:** ${ch.description ? (ch.description.length > 40 ? ch.description.slice(0, 40) + '...' : ch.description) : 'Not set'}\n` +
              `**Self-Destruct:** ${ch.selfDestruct ? `${ch.selfDestruct}s` : 'Off'}\n` +
              `**Fields:** ${ch.fields ? 'Set' : 'None'} | **Buttons:** ${ch.buttons ? 'Set' : 'None'}`
            ));
          }
          if (config.channels.length > 3) {
            container.addTextDisplayComponents(td => td.setContent(`*...and ${config.channels.length - 3} more channel(s)*`));
          }
        }

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Placeholders:**\n` +
          `\`{user}\` \`{user.mention}\` \`{user.tag}\` \`{user.name}\` \`{user.id}\`\n` +
          `\`{user.avatar}\` \`{user.created_at}\` \`{user.joined_at}\`\n` +
          `\`{guild.name}\` \`{guild.id}\` \`{guild.count}\` \`{guild.icon}\`\n` +
          `\`{guild.banner}\` \`{guild.boost_count}\` \`{guild.boost_tier}\`\n` +
          `\`{guild.vanity}\` \`{guild.owner_id}\` \`{timestamp}\``
        ));

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`goodbye_toggle_${authorId}`)
            .setLabel(config.enabled ? 'Disable' : 'Enable')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(config.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
        ));

        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`goodbye_addchannel_${authorId}`)
            .setLabel('Add Channel')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`goodbye_removechannel_${authorId}`)
            .setLabel('Remove Channel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`goodbye_test_${authorId}`)
            .setLabel('Test')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.test)
        ));

        return container;
      };

      await interaction.update({ components: [rebuildMainContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

    if (interaction.customId.startsWith('goodbye_rmch_modal_')) {
      const authorId = interaction.customId.split('_')[3];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const input = interaction.fields.getTextInputValue('channel')?.trim();
      if (!input) {
        await interaction.reply({ content: '❌ Please provide a channel.', flags: 64 }).catch(() => {});
        return;
      }

      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.goodbye || !guildData.goodbye.channels || guildData.goodbye.channels.length === 0) {
        await interaction.reply({ content: '❌ No goodbye channels configured.', flags: 64 }).catch(() => {});
        return;
      }

      let channelId = null;
      const channelIdMatch = input.match(/<#(\d+)>/) || input.match(/^(\d{17,19})$/);
      if (channelIdMatch) {
        channelId = channelIdMatch[1];
      } else {

        const searchName = input.replace(/^#/, '').toLowerCase();
        const foundConfig = guildData.goodbye.channels.find(c => {
          const ch = interaction.guild.channels.cache.get(c.channelId);
          return ch && ch.name.toLowerCase() === searchName;
        });
        if (foundConfig) channelId = foundConfig.channelId;
      }

      if (!channelId) {
        await interaction.reply({ content: '❌ Channel not found. Use channel name (e.g. `general`) or channel ID.', flags: 64 }).catch(() => {});
        return;
      }

      const channelIndex = guildData.goodbye.channels.findIndex(c => c.channelId === channelId);
      if (channelIndex === -1) {
        await interaction.reply({ content: `❌ <#${channelId}> is not a configured goodbye channel.`, flags: 64 }).catch(() => {});
        return;
      }

      guildData.goodbye.channels.splice(channelIndex, 1);

      if (guildData.goodbye.channels.length === 0) {
        guildData.goodbye.enabled = false;
      }

      await db.updateOne({ guildId: interaction.guildId }, { $set: { goodbye: guildData.goodbye } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
      const config = guildData.goodbye;

      const rebuildMainContainer = () => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Goodbye Configuration`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
          `**Channels:** ${config.channels.length > 0 ? config.channels.map(c => `<#${c.channelId}>`).join(', ') : 'None configured'}`
        ));

        if (config.channels.length > 0) {
          for (let i = 0; i < Math.min(config.channels.length, 3); i++) {
            const ch = config.channels[i];
            container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
              `### <#${ch.channelId}>\n` +
              `**Title:** ${ch.title || 'Not set'}\n` +
              `**Description:** ${ch.description ? (ch.description.length > 40 ? ch.description.slice(0, 40) + '...' : ch.description) : 'Not set'}\n` +
              `**Self-Destruct:** ${ch.selfDestruct ? `${ch.selfDestruct}s` : 'Off'}\n` +
              `**Fields:** ${ch.fields ? 'Set' : 'None'} | **Buttons:** ${ch.buttons ? 'Set' : 'None'}`
            ));
          }
          if (config.channels.length > 3) {
            container.addTextDisplayComponents(td => td.setContent(`*...and ${config.channels.length - 3} more channel(s)*`));
          }
        }

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(
          `**Placeholders:**\n` +
          `\`{user}\` \`{user.mention}\` \`{user.tag}\` \`{user.name}\` \`{user.id}\`\n` +
          `\`{user.avatar}\` \`{user.created_at}\` \`{user.joined_at}\`\n` +
          `\`{guild.name}\` \`{guild.id}\` \`{guild.count}\` \`{guild.icon}\`\n` +
          `\`{guild.banner}\` \`{guild.boost_count}\` \`{guild.boost_tier}\`\n` +
          `\`{guild.vanity}\` \`{guild.owner_id}\` \`{timestamp}\``
        ));

        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`goodbye_toggle_${authorId}`)
            .setLabel(config.enabled ? 'Disable' : 'Enable')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(config.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
        ));

        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder()
            .setCustomId(`goodbye_addchannel_${authorId}`)
            .setLabel('Add Channel')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`goodbye_removechannel_${authorId}`)
            .setLabel('Remove Channel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`goodbye_test_${authorId}`)
            .setLabel('Test')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(EMOJIS.test)
        ));

        return container;
      };

      await interaction.update({ components: [rebuildMainContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

    if (interaction.customId.startsWith('goodbye_modal_')) {
      const parts = interaction.customId.split('_');
      const option = parts[2];
      const channelId = parts[3];
      const authorId = parts[4];

      if (interaction.user.id !== authorId) {
        await interaction.reply({ content: '❌ You cannot use this.', flags: 64 }).catch(() => {});
        return;
      }

      const db = interaction.client.db;
      let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

      if (!guildData.goodbye || !guildData.goodbye.channels) {
        await interaction.reply({ content: '❌ Goodbye system not configured.', flags: 64 }).catch(() => {});
        return;
      }

      const channelConfig = guildData.goodbye.channels.find(c => c.channelId === channelId);
      if (!channelConfig) {
        await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
        return;
      }

      const value = interaction.fields.getTextInputValue('value')?.trim() || null;

      const parseColor = (input) => {
        if (!input) return null;
        let hex = input.replace('#', '');
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
        return parseInt(hex, 16);
      };

      const isValidUrl = (str) => {
        if (!str || typeof str !== 'string') return false;
        const lower = str.trim().toLowerCase();
        return lower.startsWith('http://') || lower.startsWith('https://');
      };

      switch (option) {
        case 'content':
          channelConfig.content = value;
          break;
        case 'title':
          if (value && value.length > 256) {
            await interaction.reply({ content: '❌ Title cannot exceed 256 characters.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.title = value;
          break;
        case 'description':
          if (value && value.length > 4000) {
            await interaction.reply({ content: '❌ Description cannot exceed 4000 characters.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.description = value;
          break;
        case 'color':
          if (!value) {
            channelConfig.color = null;
          } else {
            const color = parseColor(value);
            if (color === null) {
              await interaction.reply({ content: '❌ Invalid hex color. Use format like `#5865F2`.', flags: 64 }).catch(() => {});
              return;
            }
            channelConfig.color = color;
          }
          break;
        case 'author':
          if (!value) {
            channelConfig.author = null;
            channelConfig.authorIcon = null;
          } else if (value.includes('&&')) {
            const [name, icon] = value.split('&&').map(v => v.trim());
            channelConfig.author = name || null;
            channelConfig.authorIcon = icon || null;
          } else {
            channelConfig.author = value;
          }
          break;
        case 'footer':
          if (!value) {
            channelConfig.footer = null;
            channelConfig.footerIcon = null;
          } else if (value.includes('&&')) {
            const [text, icon] = value.split('&&').map(v => v.trim());
            channelConfig.footer = text || null;
            channelConfig.footerIcon = icon || null;
          } else {
            channelConfig.footer = value;
          }
          break;
        case 'thumbnail':
          if (value && !isValidUrl(value) && !value.startsWith('{')) {
            await interaction.reply({ content: '❌ Invalid URL. Use a valid image URL or placeholder like `{user.avatar}`.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.thumbnail = value;
          break;
        case 'image':
          if (value && !isValidUrl(value)) {
            await interaction.reply({ content: '❌ Invalid URL.', flags: 64 }).catch(() => {});
            return;
          }
          channelConfig.image = value;
          break;
        case 'selfdestruct':
          if (!value) {
            channelConfig.selfDestruct = null;
          } else {
            const seconds = parseInt(value);
            if (isNaN(seconds) || seconds < 6 || seconds > 60) {
              await interaction.reply({ content: '❌ Self-destruct must be between 6 and 60 seconds.', flags: 64 }).catch(() => {});
              return;
            }
            channelConfig.selfDestruct = seconds;
          }
          break;
        case 'fields':
          channelConfig.fields = value;
          break;
        case 'buttons':
          channelConfig.buttons = value;
          break;
        default:
          await interaction.reply({ content: '❌ Unknown option.', flags: 64 }).catch(() => {});
          return;
      }

      await db.updateOne({ guildId: interaction.guildId }, { $set: { goodbye: guildData.goodbye } }, { upsert: true });

      const { ContainerBuilder, ButtonBuilder, ButtonStyle, SeparatorSpacingSize, MessageFlags } = await import('discord.js');

      const parseFields = (fieldsStr) => {
        if (!fieldsStr) return [];
        return fieldsStr.split(';;').map(f => {
          const [name, value, inline] = f.split('&&').map(s => s.trim());
          if (!name || !value) return null;
          return { name, value, inline: inline?.toLowerCase() === 'true' };
        }).filter(Boolean);
      };

      const parseButtons = (buttonsStr) => {
        if (!buttonsStr) return [];
        return buttonsStr.split(';;').map(b => {
          const [label, url] = b.split('&&').map(s => s.trim());
          if (!label || !url) return null;
          return { label, url };
        }).filter(Boolean);
      };

      const container = new ContainerBuilder();
      if (channelConfig.color) container.setAccentColor(channelConfig.color);
      container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Config for <#${channelId}>`));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent(
        `**Content:** ${channelConfig.content ? (channelConfig.content.length > 50 ? channelConfig.content.slice(0, 50) + '...' : channelConfig.content) : 'Not set'}\n` +
        `**Color:** ${channelConfig.color ? `\`#${channelConfig.color.toString(16).padStart(6, '0').toUpperCase()}\`` : 'Not set'}\n` +
        `**Self-Destruct:** ${channelConfig.selfDestruct ? `${channelConfig.selfDestruct}s` : 'Off'}`
      ));
      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(td => td.setContent(
        `**Author:** ${channelConfig.author || 'Not set'}\n` +
        `**Author Icon:** ${channelConfig.authorIcon ? 'Set' : 'Not set'}\n` +
        `**Title:** ${channelConfig.title || 'Not set'}\n` +
        `**Description:** ${channelConfig.description ? (channelConfig.description.length > 50 ? channelConfig.description.slice(0, 50) + '...' : channelConfig.description) : 'Not set'}\n` +
        `**Footer:** ${channelConfig.footer || 'Not set'}\n` +
        `**Footer Icon:** ${channelConfig.footerIcon ? 'Set' : 'Not set'}\n` +
        `**Thumbnail:** ${channelConfig.thumbnail ? 'Set' : 'Not set'}\n` +
        `**Image:** ${channelConfig.image ? 'Set' : 'Not set'}\n` +
        `**Fields:** ${channelConfig.fields ? `${parseFields(channelConfig.fields).length} field(s)` : 'None'}\n` +
        `**Buttons:** ${channelConfig.buttons ? `${parseButtons(channelConfig.buttons).length} button(s)` : 'None'}`
      ));

      container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`goodbye_cfg_content_${channelId}_${authorId}`).setLabel('Content').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_title_${channelId}_${authorId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_description_${channelId}_${authorId}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_color_${channelId}_${authorId}`).setLabel('Color').setStyle(ButtonStyle.Secondary)
      ));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`goodbye_cfg_author_${channelId}_${authorId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_footer_${channelId}_${authorId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_thumbnail_${channelId}_${authorId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_image_${channelId}_${authorId}`).setLabel('Image').setStyle(ButtonStyle.Secondary)
      ));
      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`goodbye_cfg_selfdestruct_${channelId}_${authorId}`).setLabel('Self-Destruct').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_fields_${channelId}_${authorId}`).setLabel('Fields').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_cfg_buttons_${channelId}_${authorId}`).setLabel('Buttons').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`goodbye_testch_${channelId}_${authorId}`).setLabel('Test').setStyle(ButtonStyle.Primary).setEmoji(EMOJIS.test)
      ));

      await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      return;
    }

    if (interaction.customId === 'starboard_color_modal') {
      try {
        const colorValue = interaction.fields.getTextInputValue('color_value')?.trim();

        if (!colorValue) {
          await interaction.reply({ content: '❌ Please provide a color.', ephemeral: true });
          return;
        }

        const hex = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;
        if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
          await interaction.reply({ content: '❌ Invalid hex color. Use format: `#FFD700` or `FFD700`', ephemeral: true });
          return;
        }

        const guildId = interaction.guildId;
        const guildData = await interaction.client.db.findOne({ guildId }) || { guildId };

        if (!guildData.starboard) {
          guildData.starboard = {
            enabled: false,
            channel: null,
            threshold: 3,
            emoji: '⭐',
            selfStar: false,
            color: '#FFD700',
            timestamp: true,
            jumpUrl: true,
            attachments: true,
            ignoredChannels: [],
            ignoredRoles: [],
            ignoredMembers: [],
            starredMessages: []
          };
        }

        guildData.starboard.color = hex;
        await interaction.client.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

        const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
        const newContainer = buildWizardContainer(guildData);

        await interaction.update({ components: [newContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        return;
      } catch (error) {
        console.error('[Starboard Color Modal] Error:', error);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'automod_logchannel_modal') {
      try {
        const input = interaction.fields.getTextInputValue('channel_id')?.trim();
        const guildId = interaction.guildId;

        let channelId = null;
        const channelIdMatch = input.match(/<#(\d+)>/) || input.match(/^(\d{17,19})$/);
        if (channelIdMatch) {
          channelId = channelIdMatch[1];
        } else {
          const searchName = input.replace(/^#/, '').toLowerCase();
          const channel = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === searchName && c.isTextBased());
          if (channel) channelId = channel.id;
        }

        if (!channelId) {
          await interaction.reply({ content: '❌ Channel not found. Use channel name or ID.', ephemeral: true }).catch(() => {});
          return;
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
          await interaction.reply({ content: '❌ Please provide a valid text channel.', ephemeral: true }).catch(() => {});
          return;
        }

        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const { getDefaultConfig, buildWizardContainer } = await import('../commands/prefix/Automod/automod.js');
        let config = guildData.automod || getDefaultConfig();
        config.logChannel = channelId;

        await interaction.client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });

        const updatedContainer = buildWizardContainer(config);
        await interaction.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      } catch (error) {
        console.error('[Automod Log Channel Modal] Error:', error);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'automod_words_add_modal') {
      try {
        const input = interaction.fields.getTextInputValue('word')?.trim().toLowerCase();
        const guildId = interaction.guildId;

        if (!input) {
          await interaction.reply({ content: '❌ Please provide words.', ephemeral: true }).catch(() => {});
          return;
        }

        const newWords = input.split(',').map(w => w.trim()).filter(w => w.length > 0);

        if (newWords.length === 0) {
            await interaction.reply({ content: '❌ Invalid input.', ephemeral: true }).catch(() => {});
            return;
        }

        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const { getDefaultConfig, buildWordsPage } = await import('../commands/prefix/Automod/automod.js');
        let config = guildData.automod || getDefaultConfig();

        if (!config.modules.badwords) {
          config.modules.badwords = { enabled: false, punishments: ['delete'], words: [], ignore: { channels: [], roles: [] } };
        }

        let addedCount = 0;
        for (const word of newWords) {
            if (!config.modules.badwords.words.includes(word)) {
                config.modules.badwords.words.push(word);
                addedCount++;
            }
        }

        if (addedCount === 0) {
            await interaction.reply({ content: '❌ All words are already in the filter.', ephemeral: true }).catch(() => {});
            return;
        }

        await interaction.client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });

        const updatedContainer = buildWordsPage(config);
        await interaction.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        await interaction.followUp({ content: `✅ Added **${addedCount}** words to the filter.`, ephemeral: true }).catch(() => {});
      } catch (error) {
        console.error('[Automod Words Add Modal] Error:', error);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'automod_words_bulk_remove_modal') {
      try {
        const input = interaction.fields.getTextInputValue('words')?.trim().toLowerCase();
        const guildId = interaction.guildId;

        if (!input) {
            await interaction.reply({ content: '❌ Please provide words to remove.', ephemeral: true }).catch(() => {});
            return;
        }

        const removeWords = input.split(',').map(w => w.trim()).filter(w => w.length > 0);

        if (removeWords.length === 0) {
            await interaction.reply({ content: '❌ Invalid input.', ephemeral: true }).catch(() => {});
            return;
        }

        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const { getDefaultConfig, buildWordsPage } = await import('../commands/prefix/Automod/automod.js');
        let config = guildData.automod || getDefaultConfig();

        if (!config.modules.badwords || !config.modules.badwords.words || config.modules.badwords.words.length === 0) {
            await interaction.reply({ content: '❌ No words to remove.', ephemeral: true }).catch(() => {});
            return;
        }

        let removedCount = 0;
        const initialLength = config.modules.badwords.words.length;

        config.modules.badwords.words = config.modules.badwords.words.filter(w => !removeWords.includes(w));
        removedCount = initialLength - config.modules.badwords.words.length;

        if (removedCount === 0) {
            await interaction.reply({ content: '❌ None of the provided words were found in the filter.', ephemeral: true }).catch(() => {});
            return;
        }

        await interaction.client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });

        const updatedContainer = buildWordsPage(config);
        await interaction.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        await interaction.followUp({ content: `✅ Removed **${removedCount}** words from the filter.`, ephemeral: true }).catch(() => {});
      } catch (error) {
        console.error('[Automod Words Bulk Remove Modal] Error:', error);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'automod_strike_expiry_modal') {
      try {
        const hours = parseInt(interaction.fields.getTextInputValue('hours')?.trim());
        const guildId = interaction.guildId;

        if (!hours || hours < 1 || hours > 8760) {
          await interaction.reply({ content: '❌ Please provide a valid number of hours (1-8760).', ephemeral: true }).catch(() => {});
          return;
        }

        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const { getDefaultConfig, buildStrikesPage } = await import('../commands/prefix/Automod/automod.js');
        let config = guildData.automod || getDefaultConfig();
        config.strikeExpiry = hours;

        await interaction.client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });

        const updatedContainer = buildStrikesPage(config);
        await interaction.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      } catch (error) {
        console.error('[Automod Strike Expiry Modal] Error:', error);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'birthday_wish_modal') {
      try {
        const guildId = interaction.guildId;
        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const existingMsg = guildData.birthday_config?.wishMessage || {};

        const content = interaction.fields.getTextInputValue('content') || '';
        const title = interaction.fields.getTextInputValue('title') || '';
        const description = interaction.fields.getTextInputValue('description') || '';
        const footer = interaction.fields.getTextInputValue('footer') || '';

        const wishMessage = {
          content, title, description, footer,
          thumbnail: existingMsg.thumbnail || 'avatar',
          image: existingMsg.image || '',
          accentColor: existingMsg.accentColor || ''
        };

        await interaction.client.db.updateOne(
          { guildId },
          { $set: { 'birthday_config.wishMessage': wishMessage } },
          { upsert: true }
        );

        await interaction.reply({
          content: '✅ Message content saved! Use **Preview** to see it.',
          ephemeral: true
        });
      } catch (error) {
        console.error('[Birthday Wish Modal]', error);
        await interaction.reply({ content: '❌ Failed to save message.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'birthday_appearance_modal') {
      try {
        const guildId = interaction.guildId;
        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const existingMsg = guildData.birthday_config?.wishMessage || {};

        const thumbnail = interaction.fields.getTextInputValue('thumbnail') || 'avatar';
        const image = interaction.fields.getTextInputValue('image') || '';
        const accentColor = interaction.fields.getTextInputValue('accentColor') || '';

        const wishMessage = {
          ...existingMsg,
          thumbnail,
          image: image || '',
          accentColor: accentColor === 'none' ? '' : (accentColor || '')
        };

        await interaction.client.db.updateOne(
          { guildId },
          { $set: { 'birthday_config.wishMessage': wishMessage } },
          { upsert: true }
        );

        await interaction.reply({
          content: `✅ Appearance saved! Use **Preview** to see.`,
          ephemeral: true
        });
      } catch (error) {
        console.error('[Birthday Appearance Modal]', error);
        await interaction.reply({ content: '❌ Failed to save settings.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'birthday_advanced_modal') {
      try {
        const guildId = interaction.guildId;
        const guildData = await interaction.client.db.findOne({ guildId }) || {};
        const existingMsg = guildData.birthday_config?.wishMessage || {};

        const image = interaction.fields.getTextInputValue('image') || '';
        const accentColor = interaction.fields.getTextInputValue('accentColor') || '';

        const wishMessage = {
          ...existingMsg,
          image: image || '',
          accentColor: accentColor === 'none' ? '' : (accentColor || '')
        };

        await interaction.client.db.updateOne(
          { guildId },
          { $set: { 'birthday_config.wishMessage': wishMessage } },
          { upsert: true }
        );

        await interaction.reply({
          content: `✅ Advanced settings saved!${accentColor ? ` Color: \`${accentColor}\`` : ''}${image ? ' Image set.' : ''}`,
          ephemeral: true
        });
      } catch (error) {
        console.error('[Birthday Advanced Modal]', error);
        await interaction.reply({ content: '❌ Failed to save settings.', ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.customId === 'embed_title_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        session.title = interaction.fields.getTextInputValue('title') || null;
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Title Modal]', err); }
    }

    if (interaction.customId === 'embed_desc_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        session.description = interaction.fields.getTextInputValue('description') || null;
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Desc Modal]', err); }
    }

    if (interaction.customId === 'embed_color_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        const colorInput = interaction.fields.getTextInputValue('color') || '';
        if (colorInput) {
          const hex = colorInput.replace('#', '');
          const parsed = parseInt(hex, 16);
          session.color = isNaN(parsed) ? null : parsed;
        } else {
          session.color = null;
        }
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Color Modal]', err); }
    }

    if (interaction.customId === 'embed_url_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        session.url = interaction.fields.getTextInputValue('url') || null;
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed URL Modal]', err); }
    }

    if (interaction.customId === 'embed_author_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        const name = interaction.fields.getTextInputValue('name') || null;
        const icon = interaction.fields.getTextInputValue('icon') || null;
        const url = interaction.fields.getTextInputValue('url') || null;

        if (name) {
          session.author = { name, iconURL: icon, url };
        } else {
          session.author = null;
        }
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Author Modal]', err); }
    }

    if (interaction.customId === 'embed_footer_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        const text = interaction.fields.getTextInputValue('text') || null;
        const icon = interaction.fields.getTextInputValue('icon') || null;

        if (text) {
          session.footer = { text, iconURL: icon };
        } else {
          session.footer = null;
        }
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Footer Modal]', err); }
    }

    if (interaction.customId === 'embed_thumb_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        session.thumbnail = interaction.fields.getTextInputValue('thumbnail') || null;
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Thumb Modal]', err); }
    }

    if (interaction.customId === 'embed_image_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        session.image = interaction.fields.getTextInputValue('image') || null;
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Image Modal]', err); }
    }

    if (interaction.customId === 'embed_field_modal') {
      try {
        const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
        const userId = interaction.user.id;
        const session = embedSessions.get(userId) || {};

        const name = interaction.fields.getTextInputValue('name');
        const value = interaction.fields.getTextInputValue('value');
        const inlineInput = interaction.fields.getTextInputValue('inline') || 'no';
        const inline = inlineInput.toLowerCase() === 'yes' || inlineInput.toLowerCase() === 'true';

        if (!session.fields) session.fields = [];
        session.fields.push({ name, value, inline });
        embedSessions.set(userId, session);

        const container = buildEmbedBuilderUI(userId, session);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) { console.error('[Embed Field Modal]', err); }
    }

    if (interaction.customId.startsWith('comp_modal_')) {
        try {
            const { ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonStyle, ComponentType } = await import('discord.js');
            const { componentSessions, buildComponentBuilderUI } = await import('../commands/prefix/miscellaneous/component.js');

            const userId = interaction.user.id;
            const session = componentSessions.get(userId);
            if (!session) return interaction.reply({ content: '❌ Session expired.', flags: MessageFlags.Ephemeral });

            const currentRow = session.rows[session.selectedRow];
            if (!currentRow) return interaction.reply({ content: '❌ No row selected.', flags: MessageFlags.Ephemeral });

            if (interaction.customId.startsWith('comp_modal_btn_')) {
                const label = interaction.fields.getTextInputValue('label');
                const styleStr = interaction.fields.getTextInputValue('style').toLowerCase();
                const idOrUrl = interaction.fields.getTextInputValue('id_url');
                const emoji = interaction.fields.getTextInputValue('emoji');

                const btn = new ButtonBuilder().setLabel(label);
                if (emoji) btn.setEmoji(emoji);

                let style = ButtonStyle.Secondary;
                if (styleStr === 'primary' || styleStr === 'blurple') style = ButtonStyle.Primary;
                else if (styleStr === 'success' || styleStr === 'green') style = ButtonStyle.Success;
                else if (styleStr === 'danger' || styleStr === 'red') style = ButtonStyle.Danger;
                else if (styleStr === 'link' || styleStr === 'url') style = ButtonStyle.Link;

                btn.setStyle(style);
                if (style === ButtonStyle.Link) btn.setURL(idOrUrl);
                else btn.setCustomId(idOrUrl);

                currentRow.addComponents(btn);
            }

            else if (interaction.customId.startsWith('comp_modal_select_')) {
                const customId = interaction.fields.getTextInputValue('id');
                const placeholder = interaction.fields.getTextInputValue('placeholder');
                const range = interaction.fields.getTextInputValue('range').split('-');
                const optionsText = interaction.fields.getTextInputValue('options');

                const min = parseInt(range[0]) || 1;
                const max = parseInt(range[1]) || 1;

                const select = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setMinValues(min)
                    .setMaxValues(max);

                if (placeholder) select.setPlaceholder(placeholder);

                const options = [];
                const lines = optionsText.split('\n');
                for (const line of lines) {
                    const parts = line.split('|').map(p => p.trim());

                    if (parts[0]) {
                        const opt = new StringSelectMenuOptionBuilder()
                            .setLabel(parts[0])
                            .setValue(parts[1] || parts[0]);
                        if (parts[2]) opt.setDescription(parts[2]);
                        if (parts[3]) opt.setEmoji(parts[3]);
                        options.push(opt);
                    }
                }

                if (options.length > 0) {
                    select.addOptions(options);
                    currentRow.addComponents(select);
                }
            }

            const container = buildComponentBuilderUI(userId, session);
            await interaction.update({ components: [container] });

        } catch (err) {
            console.error('[Component Modal]', err);
            try { await interaction.reply({ content: '❌ Failed to add component.', flags: MessageFlags.Ephemeral }); } catch {}
        }
    }
  });
}
