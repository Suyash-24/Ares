import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description, color = null) => {
  const container = new ContainerBuilder();
  if (color) container.setAccentColor(color);
  container.addTextDisplayComponents(td => td.setContent(title));
  container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(td => td.setContent(description));
  return container;
};

const resolveChannel = (guild, input) => {
  if (!input) return null;
  const clean = input.replace(/[<#>]/g, '');
  let channel = guild.channels.cache.get(clean);
  if (!channel) channel = guild.channels.cache.find(c => c.name.toLowerCase() === input.toLowerCase());
  return channel || null;
};

const parseColor = (input) => {
  if (!input) return null;
  let hex = input.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return parseInt(hex, 16);
};

const placeholders = {

  '{user}': (member) => `<@${member.id}>`,
  '{user.mention}': (member) => `<@${member.id}>`,
  '{user.tag}': (member) => member.user.tag,
  '{user.name}': (member) => member.user.username,
  '{user.id}': (member) => member.id,
  '{user.avatar}': (member) => member.user.displayAvatarURL({ size: 512 }),
  '{user.created_at}': (member) => `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
  '{user.created_at_timestamp}': (member) => `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
  '{user.joined_at}': (member) => member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown',
  '{user.joined_at_timestamp}': (member) => member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown',

  '{server}': (member) => member.guild.name,
  '{guild}': (member) => member.guild.name,
  '{guild.name}': (member) => member.guild.name,
  '{server.id}': (member) => member.guild.id,
  '{guild.id}': (member) => member.guild.id,
  '{memberCount}': (member) => member.guild.memberCount.toString(),
  '{guild.count}': (member) => member.guild.memberCount.toString(),
  '{server.icon}': (member) => member.guild.iconURL({ size: 512 }) || '',
  '{guild.icon}': (member) => member.guild.iconURL({ size: 512 }) || '',
  '{guild.banner}': (member) => member.guild.bannerURL({ size: 1024 }) || '',
  '{guild.splash}': (member) => member.guild.splashURL({ size: 1024 }) || '',
  '{guild.owner_id}': (member) => member.guild.ownerId,
  '{guild.created_at}': (member) => `<t:${Math.floor(member.guild.createdTimestamp / 1000)}:F>`,
  '{guild.created_at_timestamp}': (member) => `<t:${Math.floor(member.guild.createdTimestamp / 1000)}:R>`,
  '{guild.boost_count}': (member) => member.guild.premiumSubscriptionCount?.toString() || '0',
  '{guild.boost_tier}': (member) => {
    const tier = member.guild.premiumTier;
    if (tier === 0) return 'No Level';
    if (tier === 1) return 'Level 1';
    if (tier === 2) return 'Level 2';
    if (tier === 3) return 'Level 3';
    return 'No Level';
  },
  '{guild.vanity}': (member) => member.guild.vanityURLCode || 'N/A',
  '{guild.role_count}': (member) => member.guild.roles.cache.size.toString(),
  '{guild.emoji_count}': (member) => member.guild.emojis.cache.size.toString(),
  '{guild.channel_count}': (member) => member.guild.channels.cache.size.toString(),

  '{timestamp}': () => `<t:${Math.floor(Date.now() / 1000)}:F>`,
  '{timestamp.relative}': () => `<t:${Math.floor(Date.now() / 1000)}:R>`,
  '{timestamp.date}': () => `<t:${Math.floor(Date.now() / 1000)}:D>`,
  '{timestamp.time}': () => `<t:${Math.floor(Date.now() / 1000)}:T>`,

  '{date}': () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  '{date.short}': () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  '{time}': () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  '{datetime}': () => new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
};

const footerSafePlaceholders = {
  '{timestamp}': () => new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC',
  '{timestamp.relative}': () => 'just now',
  '{timestamp.date}': () => new Date().toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'medium' }),
  '{timestamp.time}': () => new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) + ' UTC'
};

export const replacePlaceholders = (text, member) => {
  if (!text) return '';
  let result = text;
  for (const [placeholder, fn] of Object.entries(placeholders)) {
    result = result.split(placeholder).join(fn(member));
  }
  return result;
};

const replacePlaceholdersFooterSafe = (text, member) => {
  if (!text) return '';
  let result = text;

  for (const [placeholder, fn] of Object.entries(footerSafePlaceholders)) {
    result = result.split(placeholder).join(fn(member));
  }

  for (const [placeholder, fn] of Object.entries(placeholders)) {
    result = result.split(placeholder).join(fn(member));
  }
  return result;
};

const isValidUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  const lower = str.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
};

const parseSelfDestruct = (content) => {
  const match = content.match(/--self[_-]?destruct\s+(\d+)/i);
  if (match) {
    const seconds = parseInt(match[1]);
    if (seconds >= 6 && seconds <= 60) {
      return seconds;
    }
  }
  return null;
};

export const parseFields = (fieldsStr) => {
  if (!fieldsStr) return [];
  const fields = [];
  const fieldParts = fieldsStr.split(';;').map(f => f.trim()).filter(f => f);
  for (const part of fieldParts) {
    const parts = part.split('&&').map(p => p.trim());
    if (parts.length >= 2) {
      fields.push({
        name: parts[0],
        value: parts[1],
        inline: parts[2]?.toLowerCase() === 'true' || parts[2]?.toLowerCase() === 'yes'
      });
    }
  }
  return fields;
};

export const parseButtons = (buttonsStr) => {
  if (!buttonsStr) return [];
  const buttons = [];
  const buttonParts = buttonsStr.split(';;').map(b => b.trim()).filter(b => b);
  for (const part of buttonParts) {
    const parts = part.split('&&').map(p => p.trim());
    if (parts.length >= 2 && isValidUrl(parts[1])) {
      buttons.push({
        label: parts[0].slice(0, 80),
        url: parts[1]
      });
    }
  }
  return buttons.slice(0, 5);
};

const defaultChannelConfig = {
  message: null,
  content: null,
  color: null,
  image: null,
  author: null,
  authorIcon: null,
  title: 'Goodbye!',
  description: '**{user.tag}** has left the server.',
  footer: null,
  footerIcon: null,
  thumbnail: null,
  selfDestruct: null,
  fields: null,
  buttons: null,
  timestamp: true
};

const defaultConfig = {
  enabled: false,
  channels: []
};

export const buildGoodbyeEmbed = (channelConfig, member) => {

  const hasEmbedContent = channelConfig.title || channelConfig.description ||
                          channelConfig.author || channelConfig.footer ||
                          channelConfig.thumbnail || channelConfig.image ||
                          channelConfig.fields || channelConfig.color;

  if (!hasEmbedContent) return null;

  const embed = new EmbedBuilder();

  if (channelConfig.color) embed.setColor(channelConfig.color);

  if (channelConfig.author) {
    const authorText = replacePlaceholders(channelConfig.author, member);
    const authorIconUrl = channelConfig.authorIcon ? replacePlaceholders(channelConfig.authorIcon, member) : null;
    if (authorIconUrl && isValidUrl(authorIconUrl)) {
      embed.setAuthor({ name: authorText, iconURL: authorIconUrl });
    } else {
      embed.setAuthor({ name: authorText });
    }
  }

  if (channelConfig.title) {
    embed.setTitle(replacePlaceholders(channelConfig.title, member));
  }

  if (channelConfig.description) {
    embed.setDescription(replacePlaceholders(channelConfig.description, member));
  }

  if (channelConfig.fields) {
    const fields = parseFields(channelConfig.fields);
    for (const field of fields) {
      embed.addFields({
        name: replacePlaceholders(field.name, member),
        value: replacePlaceholders(field.value, member),
        inline: field.inline
      });
    }
  }

  if (channelConfig.thumbnail) {
    const thumbUrl = replacePlaceholders(channelConfig.thumbnail, member);
    if (isValidUrl(thumbUrl)) {
      embed.setThumbnail(thumbUrl);
    }
  }

  if (channelConfig.image) {
    const imageUrl = replacePlaceholders(channelConfig.image, member);
    if (isValidUrl(imageUrl)) {
      embed.setImage(imageUrl);
    }
  }

  if (channelConfig.footer) {
    const footerText = replacePlaceholdersFooterSafe(channelConfig.footer, member);
    const footerIconUrl = channelConfig.footerIcon ? replacePlaceholders(channelConfig.footerIcon, member) : null;
    if (footerIconUrl && isValidUrl(footerIconUrl)) {
      embed.setFooter({ text: footerText, iconURL: footerIconUrl });
    } else {
      embed.setFooter({ text: footerText });
    }
  }

  if (channelConfig.timestamp !== false) {
    embed.setTimestamp();
  }

  return embed;
};

export const buildGoodbyeButtons = (channelConfig, member) => {
  if (!channelConfig.buttons) return null;
  const buttons = parseButtons(channelConfig.buttons);
  if (buttons.length === 0) return null;

  const row = new ActionRowBuilder();
  for (const btn of buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(replacePlaceholders(btn.label, member))
        .setURL(replacePlaceholders(btn.url, member))
        .setStyle(ButtonStyle.Link)
    );
  }
  return row;
};

export default {
  name: 'goodbye',
  description: 'Configure the goodbye message system with multi-channel support.',
  usage: 'goodbye <add|remove|list|config|toggle|test|reset|show> [channel] [options]',
  category: 'Welcome',

  async execute(message, args, client) {
    if (!message.guild) return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Guild Only`, 'This command can only be used in a server.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Permission`, 'You need **Administrator** or **Manage Server** permission to configure goodbye messages.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const subcommand = args[0]?.toLowerCase();
    const rawContent = message.content;

    let guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };

    if (guildData.goodbye && !guildData.goodbye.channels) {
      const oldConfig = guildData.goodbye;
      const newConfig = { enabled: oldConfig.enabled || false, channels: [] };
      if (oldConfig.channel) {
        newConfig.channels.push({
          channelId: oldConfig.channel,
          content: oldConfig.content,
          color: oldConfig.color,
          image: oldConfig.image,
          author: oldConfig.author,
          authorIcon: oldConfig.authorIcon,
          title: oldConfig.title,
          description: oldConfig.description,
          footer: oldConfig.footer,
          footerIcon: oldConfig.footerIcon,
          thumbnail: oldConfig.thumbnail,
          selfDestruct: null,
          fields: null,
          buttons: null
        });
      }
      guildData.goodbye = newConfig;
      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: newConfig } }, { upsert: true });
    }

    if (!guildData.goodbye) guildData.goodbye = { ...defaultConfig, channels: [] };
    const config = guildData.goodbye;

    if (!subcommand || subcommand === 'show') {
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
          .setCustomId(`goodbye_toggle_${message.author.id}`)
          .setLabel(config.enabled ? 'Disable' : 'Enable')
          .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
          .setEmoji(config.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
      ));

      container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder()
          .setCustomId(`goodbye_addchannel_${message.author.id}`)
          .setLabel('Add Channel')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`goodbye_removechannel_${message.author.id}`)
          .setLabel('Remove Channel')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`goodbye_test_${message.author.id}`)
          .setLabel('Test')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJIS.test)
      ));

      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'add') {
      const channelArg = args[1];
      if (!channelArg) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Channel`, 'Please specify a channel.\n\n**Usage:** `goodbye add #channel`\n**Optional:** `goodbye add #channel --self_destruct 10`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const channel = resolveChannel(message.guild, channelArg);
      if (!channel) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel`, 'Could not find that channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Channel Type`, 'Goodbye channel must be a text channel.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (config.channels.some(c => c.channelId === channel.id)) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Already Configured`, `<#${channel.id}> is already configured for goodbye messages.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (config.channels.length >= 5) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Limit Reached`, 'You can only have up to 5 goodbye channels.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const selfDestruct = parseSelfDestruct(rawContent);

      const newChannelConfig = {
        ...defaultChannelConfig,
        channelId: channel.id,
        selfDestruct
      };

      config.channels.push(newChannelConfig);
      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });

      let response = `Goodbye channel <#${channel.id}> has been added.`;
      if (selfDestruct) {
        response += `\nMessages will self-destruct after **${selfDestruct} seconds**.`;
      }
      response += `\n\nUse \`goodbye config #${channel.name} <option> <value>\` to customize.`;

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Channel Added`, response)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'remove') {
      const channelArg = args[1];
      if (!channelArg) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Channel`, 'Please specify a channel to remove.\n\n**Usage:** `goodbye remove #channel`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const channel = resolveChannel(message.guild, channelArg);
      const channelId = channel?.id || channelArg.replace(/[<#>]/g, '');

      const index = config.channels.findIndex(c => c.channelId === channelId);
      if (index === -1) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Not Found`, 'That channel is not configured for goodbye messages.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      config.channels.splice(index, 1);
      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Channel Removed`, `Goodbye channel has been removed.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'list') {
      if (config.channels.length === 0) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} No Channels`, 'No goodbye channels are configured.\n\nUse `goodbye add #channel` to add one.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const PER_PAGE = 3;
      const totalPages = Math.ceil(config.channels.length / PER_PAGE);
      const page = 0;

      const buildListContainer = (pageNum) => {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Goodbye Channels (${config.channels.length})`));
        container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`**System Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}`));

        const start = pageNum * PER_PAGE;
        const end = Math.min(start + PER_PAGE, config.channels.length);
        const pageChannels = config.channels.slice(start, end);

        for (let i = 0; i < pageChannels.length; i++) {
          const ch = pageChannels[i];
          const globalIndex = start + i + 1;
          container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
          container.addTextDisplayComponents(td => td.setContent(
            `### <#${ch.channelId}>\n` +
            `**Content:** ${ch.content ? (ch.content.length > 30 ? ch.content.slice(0, 30) + '...' : ch.content) : 'None'}\n` +
            `**Title:** ${ch.title || 'None'}\n` +
            `**Description:** ${ch.description ? (ch.description.length > 30 ? ch.description.slice(0, 30) + '...' : ch.description) : 'None'}\n` +
            `**Self-Destruct:** ${ch.selfDestruct ? `${ch.selfDestruct}s` : 'Off'}\n` +
            `**Fields:** ${ch.fields ? parseFields(ch.fields).length : 0} | **Buttons:** ${ch.buttons ? parseButtons(ch.buttons).length : 0}`
          ));
        }

        if (totalPages > 1) {
          container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
          container.addTextDisplayComponents(td => td.setContent(`**Page ${pageNum + 1}/${totalPages}**`));
          container.addActionRowComponents(row => row.addComponents(
            new ButtonBuilder()
              .setCustomId(`goodbyelist_prev_${message.author.id}_${pageNum}`)
              .setEmoji(EMOJIS.pageprevious)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(pageNum === 0),
            new ButtonBuilder()
              .setCustomId(`goodbyelist_next_${message.author.id}_${pageNum}`)
              .setEmoji(EMOJIS.pagenext)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(pageNum >= totalPages - 1)
          ));
        }

        return container;
      };

      return message.reply({ components: [buildListContainer(page)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'config') {
      let channelArg = args[1];
      let option = args[2]?.toLowerCase();

      const configOptions = ['content', 'title', 'description', 'desc', 'author', 'authoricon', 'footer', 'footericon', 'thumbnail', 'image', 'color', 'selfdestruct', 'self_destruct', 'fields', 'buttons'];

      const extractValueFromRaw = (optionName) => {
        const optionPattern = new RegExp(`\\b${optionName}\\b\\s*`, 'i');
        const match = rawContent.match(optionPattern);
        if (match) {
          const optionIndex = rawContent.indexOf(match[0]) + match[0].length;
          return rawContent.slice(optionIndex).replace(/\\n/g, '\n').trim() || null;
        }
        return null;
      };

      if (channelArg && configOptions.includes(channelArg.toLowerCase()) && config.channels.length > 1) {
        const channelsList = config.channels.map(c => `<#${c.channelId}>`).join(', ');
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Multiple Channels Configured`,
          `Please specify which channel to configure.\n\n**Usage:** \`goodbye config #channel ${channelArg.toLowerCase()} <value>\`\n\n**Configured channels:** ${channelsList}`)],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      let value;
      if (channelArg && configOptions.includes(channelArg.toLowerCase()) && config.channels.length === 1) {

        option = channelArg.toLowerCase();
        channelArg = null;
        value = extractValueFromRaw(option);
      } else if (option) {
        value = extractValueFromRaw(option);
      } else {
        value = null;
      }

      let channelId;
      let channelConfig;

      if (!channelArg && config.channels.length === 1) {
        channelConfig = config.channels[0];
        channelId = channelConfig.channelId;
      } else if (!channelArg) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Channel`, 'Please specify a channel.\n\n**Usage:** `goodbye config #channel <option> <value>`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      } else {
        const channel = resolveChannel(message.guild, channelArg);
        channelId = channel?.id || channelArg.replace(/[<#>]/g, '');
        channelConfig = config.channels.find(c => c.channelId === channelId);
      }

      if (!channelConfig) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Not Found`, 'That channel is not configured for goodbye messages.\n\nUse `goodbye add #channel` first.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (!option) {

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
          new ButtonBuilder().setCustomId(`goodbye_cfg_content_${channelId}_${message.author.id}`).setLabel('Content').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_title_${channelId}_${message.author.id}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_description_${channelId}_${message.author.id}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_color_${channelId}_${message.author.id}`).setLabel('Color').setStyle(ButtonStyle.Secondary)
        ));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder().setCustomId(`goodbye_cfg_author_${channelId}_${message.author.id}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_footer_${channelId}_${message.author.id}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_thumbnail_${channelId}_${message.author.id}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_image_${channelId}_${message.author.id}`).setLabel('Image').setStyle(ButtonStyle.Secondary)
        ));
        container.addActionRowComponents(row => row.addComponents(
          new ButtonBuilder().setCustomId(`goodbye_cfg_selfdestruct_${channelId}_${message.author.id}`).setLabel('Self-Destruct').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_fields_${channelId}_${message.author.id}`).setLabel('Fields').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_cfg_buttons_${channelId}_${message.author.id}`).setLabel('Buttons').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`goodbye_testch_${channelId}_${message.author.id}`).setLabel('Test').setStyle(ButtonStyle.Primary).setEmoji(EMOJIS.test)
        ));

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      switch (option) {
        case 'content':
          if (!value) {
            channelConfig.content = null;
          } else if (value.length > 2000) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Content cannot exceed 2000 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.content = value;
          }
          break;

        case 'color':
          if (!value) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Missing Color`, 'Provide a hex color.\nUsage: `goodbye config #channel color #ED4245`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          const color = parseColor(value);
          if (color === null) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Provide a valid hex color (e.g., `#ED4245`).')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.color = color;
          break;

        case 'title':
          if (!value) {
            channelConfig.title = null;
          } else if (value.length > 256) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Title cannot exceed 256 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.title = value;
          }
          break;

        case 'description':
        case 'desc':
          if (!value) {
            channelConfig.description = null;
          } else if (value.length > 2000) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Description cannot exceed 2000 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.description = value;
          }
          break;

        case 'author':
          if (!value) {
            channelConfig.author = null;
          } else if (value.length > 256) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Author cannot exceed 256 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.author = value;
          }
          break;

        case 'authoricon':
          if (!value) {
            channelConfig.authorIcon = null;
          } else if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid image URL or placeholder like `{user.avatar}` or `{server.icon}`.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.authorIcon = value;
          }
          break;

        case 'footer':
          if (!value) {
            channelConfig.footer = null;
          } else if (value.length > 256) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Footer cannot exceed 256 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.footer = value;
          }
          break;

        case 'footericon':
          if (!value) {
            channelConfig.footerIcon = null;
          } else if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid image URL or placeholder like `{user.avatar}` or `{server.icon}`.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.footerIcon = value;
          }
          break;

        case 'thumbnail':
          if (!value) {
            channelConfig.thumbnail = null;
          } else if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid image URL or placeholder like `{user.avatar}` or `{server.icon}`.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.thumbnail = value;
          }
          break;

        case 'image':
          if (!value) {
            channelConfig.image = null;
          } else if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid image URL or placeholder.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          } else {
            channelConfig.image = value;
          }
          break;

        case 'selfdestruct':
        case 'self_destruct':
          if (!value || value.toLowerCase() === 'off' || value === '0') {
            channelConfig.selfDestruct = null;
          } else {
            const seconds = parseInt(value);
            if (isNaN(seconds) || seconds < 6 || seconds > 60) {
              return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Duration`, 'Self-destruct must be between 6 and 60 seconds, or "off".')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
            channelConfig.selfDestruct = seconds;
          }
          break;

        case 'fields':
          if (!value || value.toLowerCase() === 'none' || value.toLowerCase() === 'clear') {
            channelConfig.fields = null;
          } else {

            const testFields = parseFields(value);
            if (testFields.length === 0) {
              return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Format`, 'Use format: `Name && Value && inline ;; Name2 && Value2 && false`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
            channelConfig.fields = value;
          }
          break;

        case 'buttons':
          if (!value || value.toLowerCase() === 'none' || value.toLowerCase() === 'clear') {
            channelConfig.buttons = null;
          } else {

            const testButtons = parseButtons(value);
            if (testButtons.length === 0) {
              return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Format`, 'Use format: `Label && https://url ;; Label2 && https://url2`')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
            channelConfig.buttons = value;
          }
          break;

        default:
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Unknown Option`, `Available options:\n\`content\`, \`color\`, \`title\`, \`description\`, \`author\`, \`authoricon\`,\n\`footer\`, \`footericon\`, \`thumbnail\`, \`image\`, \`selfdestruct\`,\n\`fields\`, \`buttons\``)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Updated`, `**${option}** has been updated for <#${channelId}>.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'toggle' || subcommand === 'enable' || subcommand === 'disable') {
      if (subcommand === 'enable') {
        config.enabled = true;
      } else if (subcommand === 'disable') {
        config.enabled = false;
      } else {
        config.enabled = !config.enabled;
      }

      if (config.enabled && config.channels.length === 0) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} No Channels`, 'Add a goodbye channel first with `goodbye add #channel`.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Goodbye ${config.enabled ? 'Enabled' : 'Disabled'}`, config.enabled ? 'Goodbye messages are now enabled.' : 'Goodbye messages are now disabled.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'test') {
      const channelArg = args[1];
      let targetChannels = [];

      if (channelArg) {
        const channel = resolveChannel(message.guild, channelArg);
        const channelId = channel?.id || channelArg.replace(/[<#>]/g, '');
        const channelConfig = config.channels.find(c => c.channelId === channelId);
        if (!channelConfig) {
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Not Found`, 'That channel is not configured for goodbye messages.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
        targetChannels.push(channelConfig);
      } else {
        if (config.channels.length === 0) {
          return message.reply({ components: [buildNotice(`# ${EMOJIS.error} No Channels`, 'No goodbye channels are configured.\n\nUse `goodbye add #channel` first.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }
        targetChannels = config.channels;
      }

      let successCount = 0;
      let failCount = 0;

      for (const channelConfig of targetChannels) {
        const channel = message.guild.channels.cache.get(channelConfig.channelId);
        if (!channel) {
          failCount++;
          continue;
        }

        try {
          const embed = buildGoodbyeEmbed(channelConfig, message.member);
          const content = channelConfig.content ? replacePlaceholders(channelConfig.content, message.member) : null;
          const buttonRow = buildGoodbyeButtons(channelConfig, message.member);

          if (!content && !embed) {
            failCount++;
            continue;
          }

          const messagePayload = { allowedMentions: { parse: ['users'] } };
          if (content) messagePayload.content = content;
          if (embed) messagePayload.embeds = [embed];
          if (buttonRow) messagePayload.components = [buttonRow];

          const sent = await channel.send(messagePayload);

          if (channelConfig.selfDestruct) {
            setTimeout(() => sent.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
          }

          successCount++;
        } catch (err) {
          console.error('[goodbye] test send failed:', err?.message || err);
          failCount++;
        }
      }

      if (successCount === 0) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Test Failed`, 'Failed to send test messages. Check bot permissions or add some content.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      let response = `Sent ${successCount} test message${successCount !== 1 ? 's' : ''}.`;
      if (failCount > 0) response += ` (${failCount} failed)`;

      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Test Sent`, response)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'reset') {
      guildData.goodbye = { ...defaultConfig, channels: [] };
      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: guildData.goodbye } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Reset Complete`, 'Goodbye settings have been reset to defaults.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const legacyCommands = ['channel', 'content', 'title', 'description', 'desc', 'author', 'authoricon', 'footer', 'footericon', 'thumbnail', 'image', 'color'];

    if (legacyCommands.includes(subcommand)) {

      if (subcommand === 'channel') {
        const channelArg = args[1];
        if (channelArg) {
          const channel = resolveChannel(message.guild, channelArg);
          if (channel) {

            if (config.channels.length === 0) {
              const newChannelConfig = { ...defaultChannelConfig, channelId: channel.id };
              config.channels.push(newChannelConfig);
              await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });
              return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Channel Added`, `Goodbye channel set to <#${channel.id}>.\n\nUse \`goodbye config #${channel.name}\` to customize the message.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
          }
        }
        return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} Multi-Channel Support`,
          'Goodbye now supports multiple channels!\n\n**Commands:**\n`goodbye add #channel` - Add a channel\n`goodbye remove #channel` - Remove a channel\n`goodbye config #channel` - Configure a channel\n`goodbye list` - List all channels')],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (config.channels.length === 0) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.error} No Channel`,
          'No goodbye channel is configured.\n\n**Use:** `goodbye channel #channel` or `goodbye add #channel`')],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      if (config.channels.length > 1) {
        return message.reply({ components: [buildNotice(`# ${EMOJIS.info || 'ℹ️'} Multiple Channels`,
          `You have ${config.channels.length} channels configured. Use the config command:\n\n\`goodbye config #channel ${subcommand} <value>\``)],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      const channelConfig = config.channels[0];
      const value = args.slice(1).join(' ').replace(/\\n/g, '\n');

      switch (subcommand) {
        case 'content':
          channelConfig.content = value || null;
          break;
        case 'title':
          if (value && value.length > 256) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Title cannot exceed 256 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.title = value || null;
          break;
        case 'description':
        case 'desc':
          if (value && value.length > 4000) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Too Long`, 'Description cannot exceed 4000 characters.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.description = value || null;
          break;
        case 'author':
          channelConfig.author = value || null;
          break;
        case 'authoricon':
          if (value && !isValidUrl(value) && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid URL or placeholder.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.authorIcon = value || null;
          break;
        case 'footer':
          channelConfig.footer = value || null;
          break;
        case 'footericon':
          if (value && !isValidUrl(value) && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid URL or placeholder.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.footerIcon = value || null;
          break;
        case 'thumbnail':
          if (value && !isValidUrl(value) && !value.startsWith('{')) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid URL or placeholder.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.thumbnail = value || null;
          break;
        case 'image':
          if (value && !isValidUrl(value)) {
            return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid URL`, 'Provide a valid image URL.')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
          }
          channelConfig.image = value || null;
          break;
        case 'color':
          if (!value) {
            channelConfig.color = null;
          } else {
            const color = parseColor(value);
            if (color === null) {
              return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Provide a valid hex color (e.g., `#ED4245`).')], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
            }
            channelConfig.color = color;
          }
          break;
      }

      await client.db.updateOne({ guildId: message.guildId }, { $set: { goodbye: config } }, { upsert: true });
      return message.reply({ components: [buildNotice(`# ${EMOJIS.success} Updated`, `**${subcommand}** has been ${value ? 'updated' : 'cleared'}.`)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    return message.reply({ components: [buildNotice(`# ${EMOJIS.error} Unknown Subcommand`, `Available subcommands:\n\`add\`, \`remove\`, \`list\`, \`config\`, \`toggle\`, \`test\`, \`reset\`, \`show\`.\n\n**Legacy commands** (when 1 channel configured):\n\`channel\`, \`content\`, \`title\`, \`description\`, \`author\`, \`footer\`, \`thumbnail\`, \`image\`, \`color\``)], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  }
};
