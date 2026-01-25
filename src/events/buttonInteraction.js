import { ChannelType, MessageFlags, ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, Events } from 'discord.js';
import EMOJIS from '../utils/emojis.js';
import { buildWizardContainer, MODULES, PRESETS } from '../commands/prefix/Antinuke/antinuke.js';
import { sendAntinukeLog } from '../utils/antinukeLogger.js';

export default function registerButtonInteraction(client) {
	client.on('interactionCreate', async (interaction) => {
		if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu() && !interaction.isChannelSelectMenu() && !interaction.isRoleSelectMenu()) return;

		const { ButtonBuilder, ButtonStyle, ActionRowBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');
		const guildId = interaction.guildId;
		const discordClient = client;

		if (interaction.customId.startsWith('forcenicklist_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const pageNum = parseInt(parts[3]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 });
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId }) || {};
				const entries = Object.entries(guildData?.moderation?.forcedNicknames || {});
				if (!entries || entries.length === 0) {
					await interaction.followUp({ content: '❌ No forced nicknames configured.', flags: 64 }).catch(() => {});
					return;
				}

				const PER_PAGE = 4;
				const totalPages = Math.ceil(entries.length / PER_PAGE);
				let newPage = pageNum;
				if (action === 'prev') newPage = Math.max(0, pageNum - 1);
				else if (action === 'next') newPage = Math.min(pageNum + 1, totalPages - 1);

				const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.security || '🔐'} ForceNickname`));
				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

				const page = entries.slice(newPage * PER_PAGE, newPage * PER_PAGE + PER_PAGE);
				page.forEach(([memberId, record], idx) => {
					const nickname = typeof record === 'string' ? record : (record?.nickname || '');
					const by = typeof record === 'object' && record?.by ? record.by : null;
					container.addTextDisplayComponents(td => td.setContent(`**user:** <@${memberId}> ${memberId}`));
					container.addTextDisplayComponents(td => td.setContent(`**forcenick:** ${nickname}`));
					container.addTextDisplayComponents(td => td.setContent(`**By:** ${by ? `<@${by}> ${by}` : 'Unknown'}`));
					if (idx < page.length - 1) container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				});

				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Page:** ${newPage + 1}/${totalPages} | **Total:** ${entries.length}`));

				if (totalPages > 1) {
					container.addActionRowComponents(row => {
						const prev = new ButtonBuilder().setCustomId(`forcenicklist_prev_${commandAuthorId}_${newPage - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(newPage === 0);
						const next = new ButtonBuilder().setCustomId(`forcenicklist_next_${commandAuthorId}_${newPage + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(newPage >= totalPages - 1);
						row.setComponents(prev, next);
						return row;
					});
				}

				await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				return;
			} catch (error) {
				console.error('Error handling forcenicklist pagination:', error);
				await interaction.followUp({ content: '❌ An error occurred while navigating forced nicknames.', flags: 64 }).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('starboard_')) {
			try {
				const guildId = interaction.guildId;

				const wizardData = discordClient.starboardWizards?.get(interaction.message.id);
				if (wizardData && wizardData.authorId !== interaction.user.id) {
					await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true });
					return;
				}

				const customId = interaction.customId;

				if (customId === 'starboard_color') {
					const guildData = await discordClient.db.findOne({ guildId }) || { guildId };
					const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalRow } = await import('discord.js');

					const modal = new ModalBuilder()
						.setCustomId('starboard_color_modal')
						.setTitle('Set Starboard Color');

					const colorInput = new TextInputBuilder()
						.setCustomId('color_value')
						.setLabel('Hex Color Code')
						.setPlaceholder('#FFD700 or FFD700')
						.setStyle(TextInputStyle.Short)
						.setValue(guildData.starboard?.color || '#FFD700')
						.setRequired(true)
						.setMaxLength(7)
						.setMinLength(6);

					modal.addComponents(new ModalRow().addComponents(colorInput));

					await interaction.showModal(modal).catch(err => {
						console.error('[Starboard] Error showing color modal:', err);
					});
					return;
				}

				const isSelect = customId === 'starboard_ignore_channel_select' || customId === 'starboard_ignore_role_select' || customId === 'starboard_ignore_member_select';
				const isImmediateButton = customId === 'starboard_emoji';
				if (!isSelect && !isImmediateButton) {
					await interaction.deferUpdate().catch(() => {});
				}

				const guildData = await discordClient.db.findOne({ guildId }) || { guildId };
				if (!guildData.starboard) {
					guildData.starboard = {
						enabled: false,
						channel: null,
						emojis: [],
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

				if (customId === 'starboard_toggle_on' || customId === 'starboard_toggle_off') {
					const newState = customId === 'starboard_toggle_on';

					if (newState && !guildData.starboard.channel) {
						await interaction.followUp({
							content: '❌ Please set a starboard channel first using `.starboard set #channel`',
							ephemeral: true
						});
						return;
					}

					guildData.starboard.enabled = newState;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_selfstar') {
					guildData.starboard.selfStar = !guildData.starboard.selfStar;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_timestamp') {
					guildData.starboard.timestamp = !guildData.starboard.timestamp;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_jumpurl') {
					guildData.starboard.jumpUrl = !guildData.starboard.jumpUrl;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_attachments') {
					guildData.starboard.attachments = !guildData.starboard.attachments;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_view_config') {
					const config = guildData.starboard;

					let content = `**Status:** ${config.enabled ? '✅ Active' : '❌ Inactive'}\n`;
					content += `**Channel:** ${config.channel ? `<#${config.channel}>` : 'Not Set'}\n\n`;
					content += `**Settings:**\n`;
					content += `• Emoji: ${config.emoji}\n`;
					content += `• Threshold: ${config.threshold} reactions\n`;
					content += `• Self-Star: ${config.selfStar ? 'Enabled' : 'Disabled'}\n`;
					content += `• Color: ${config.color}\n\n`;
					content += `**Display:**\n`;
					content += `• Timestamp: ${config.timestamp ? 'Shown' : 'Hidden'}\n`;
					content += `• Jump URL: ${config.jumpUrl ? 'Included' : 'Excluded'}\n`;
					content += `• Attachments: ${config.attachments ? 'Shown' : 'Hidden'}\n\n`;
					content += `**Ignored:**\n`;
					content += `• Channels: ${config.ignoredChannels?.length || 0}\n`;
					content += `• Roles: ${config.ignoredRoles?.length || 0}\n`;
					content += `• Members: ${config.ignoredMembers?.length || 0}\n\n`;
					content += `**Stats:**\n`;
					content += `• Starred Messages: ${config.starredMessages?.length || 0}`;

					const configContainer = new ContainerBuilder();
					configContainer.addTextDisplayComponents(td => td.setContent(`# ⭐ Starboard Configuration`));
					configContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					configContainer.addTextDisplayComponents(td => td.setContent(content));

					const backRow = new ActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setCustomId('starboard_back_to_wizard')
							.setLabel('Back to Wizard')
							.setEmoji('⬅️')
							.setStyle(ButtonStyle.Primary)
					);
					configContainer.addActionRowComponents(backRow);

					await interaction.message.edit({ components: [configContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_back_to_wizard') {
					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});
					return;
				}

				if (customId === 'starboard_reset') {
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
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});

					await interaction.followUp({ content: '✅ Starboard settings have been reset.', ephemeral: true });
					return;
				}

				if (customId === 'starboard_quick_setup') {
					if (!guildData.starboard.channel) {
						await interaction.followUp({
							content: '❌ Please set a starboard channel first using `.starboard set #channel`',
							ephemeral: true
						});
						return;
					}

					guildData.starboard.enabled = true;
					await discordClient.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildWizardContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const newContainer = buildWizardContainer(guildData);
					await interaction.message.edit({ components: [newContainer] }).catch(() => {});

					await interaction.followUp({
						content: `✅ Starboard activated! Messages with **${guildData.starboard.threshold}+** ${guildData.starboard.emoji} reactions will appear in <#${guildData.starboard.channel}>.`,
						ephemeral: true
					});
					return;
				}

				if (customId === 'starboard_set_channel') {
					await interaction.followUp({
						content: '📝 Use `.starboard set #channel` to set the starboard channel.',
						ephemeral: true
					});
					return;
				}

				if (customId === 'starboard_emoji') {
					const { buildEmojiManagementContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const guildData = await interaction.client.db.findOne({ guildId }) || { guildId };
					if (!guildData.starboard) guildData.starboard = {};

					const container = buildEmojiManagementContainer(guildData);
					await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
					return;
				}

				if (customId === 'starboard_ignore') {
					const { buildIgnoreListContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const guildData = await interaction.client.db.findOne({ guildId }) || { guildId };
					if (!guildData.starboard) guildData.starboard = {};

					const container = buildIgnoreListContainer(guildData);
					if (!interaction.deferred && !interaction.replied) {
						await interaction.deferUpdate().catch(() => {});
					}
					await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
					return;
				}

				if (customId === 'starboard_ignore_channel_select' || customId === 'starboard_ignore_role_select' || customId === 'starboard_ignore_member_select') {
					const guildData = await interaction.client.db.findOne({ guildId }) || { guildId };
					if (!guildData.starboard) guildData.starboard = { emojis: [], ignoredChannels: [], ignoredRoles: [], ignoredMembers: [] };
					const values = interaction.values || [];
					let listKey;
					if (customId.includes('channel')) listKey = 'ignoredChannels';
					else if (customId.includes('role')) listKey = 'ignoredRoles';
					else listKey = 'ignoredMembers';

					if (!guildData.starboard[listKey]) guildData.starboard[listKey] = [];
					values.forEach(id => {
						const idx = guildData.starboard[listKey].indexOf(id);
						if (idx === -1) guildData.starboard[listKey].push(id); else guildData.starboard[listKey].splice(idx, 1);
					});

					await interaction.client.db.updateOne({ guildId }, { $set: { starboard: guildData.starboard } }, { upsert: true });

					const { buildIgnoreListContainer } = await import('../commands/prefix/Starboard/starboard.js');
					const container = buildIgnoreListContainer(guildData);
					await interaction.update({ components: [container] }).catch(() => {});
					return;
				}

			} catch (error) {
				console.error('[Starboard Button Handler] Error:', error);
				await interaction.followUp({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('antinuke_default_punish_')) {
			const parts = interaction.customId.split('_');
			const action = parts[3];
			const authorId = parts[4];
			const value = parts[5];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			if (action === 'cancel') {
				const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Action Cancelled`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent('No changes were made to default punishment.'));
				await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
				return;
			}
			try {
				const EMOJIS = (await import('../utils/emojis.js')).default;
				const guildData = await interaction.client.db.findOne({ guildId }) || { guildId, antinuke: {} };
				if (!guildData.antinuke) guildData.antinuke = {};
				if (!guildData.antinuke.modules) guildData.antinuke.modules = {};

				guildData.antinuke.defaultPunishment = value;
				for (const key of Object.keys(guildData.antinuke.modules)) {
					const cfg = guildData.antinuke.modules[key] || {};
					guildData.antinuke.modules[key] = { ...cfg, punishment: value };
				}

				await interaction.client.db.updateOne({ guildId }, { $set: { antinuke: guildData.antinuke } }, { upsert: true });

				const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Default Punishment Updated`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Default punishment set to **${value}** and applied to all modules.`));
				await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
			} catch (e) {
				console.error('[Antinuke Default Punish Confirm] Error:', e);
				await interaction.followUp({ content: '❌ Failed to update default punishment.', ephemeral: true }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('antinuke_default_threshold_')) {
			const parts = interaction.customId.split('_');
			const action = parts[3];
			const authorId = parts[4];
			const valueRaw = parts[5];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			if (action === 'cancel') {
				const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} Action Cancelled`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent('No changes were made to default threshold.'));
				await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
				return;
			}
			const threshold = parseInt(valueRaw);
			if (!threshold || threshold < 1 || threshold > 20) {
				await interaction.followUp({ content: '❌ Invalid threshold value.', ephemeral: true }).catch(() => {});
				return;
			}
			try {
				const EMOJIS = (await import('../utils/emojis.js')).default;
				const guildData = await interaction.client.db.findOne({ guildId }) || { guildId, antinuke: {} };
				if (!guildData.antinuke) guildData.antinuke = {};
				if (!guildData.antinuke.modules) guildData.antinuke.modules = {};

				guildData.antinuke.defaultThreshold = threshold;
				for (const key of Object.keys(guildData.antinuke.modules)) {
					const cfg = guildData.antinuke.modules[key] || {};
					guildData.antinuke.modules[key] = { ...cfg, threshold };
				}

				await interaction.client.db.updateOne({ guildId }, { $set: { antinuke: guildData.antinuke } }, { upsert: true });

				const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Default Threshold Updated`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`Default threshold set to **${threshold}** and applied to all modules.`));
				await interaction.editReply({ components: [container], flags: interaction.message.flags }).catch(() => {});
			} catch (e) {
				console.error('[Antinuke Default Threshold Confirm] Error:', e);
				await interaction.followUp({ content: '❌ Failed to update default threshold.', ephemeral: true }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('pins_txt_')) {
			const parts = interaction.customId.split('_');
			const authorId = parts[2];
			const channelId = parts[3];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}

			await interaction.deferReply({ ephemeral: true }).catch(() => {});

			try {
				const guild = interaction.guild;
				let channel = guild.channels.cache.get(channelId);
				if (!channel) {
					try { channel = await guild.channels.fetch(channelId); } catch (e) { channel = null; }
				}
				if (!channel || !channel.viewable) {
					await interaction.editReply({ content: '❌ Channel not found or not viewable.' }).catch(() => {});
					return;
				}

				const pins = await channel.messages.fetchPinned();
				if (!pins || !pins.size) {
					await interaction.editReply({ content: 'No pinned messages found in this channel.' }).catch(() => {});
					return;
				}

				let text = `Pinned messages for #${channel.name} (${channel.id}):\n\n`;
				for (const msg of pins.values()) {
					text += `Author: ${msg.author?.tag || msg.author?.id || 'Unknown'}\n`;
					text += `ID: ${msg.id}\n`;
					text += `Time: ${msg.createdAt.toISOString()}\n`;
					if (msg.content && msg.content.trim()) {
						text += `Content: ${msg.content}\n`;
					} else if (msg.embeds && msg.embeds.length > 0) {
						for (let i = 0; i < msg.embeds.length; i++) {
							const embed = msg.embeds[i];
							text += `Embed ${i + 1}:\n`;
							if (embed.title) text += `  Title: ${embed.title}\n`;
							if (embed.url) text += `  URL: ${embed.url}\n`;
							if (embed.author) {
								if (embed.author.name) text += `  Author: ${embed.author.name}\n`;
								if (embed.author.url) text += `    Author URL: ${embed.author.url}\n`;
							}
							if (embed.description) text += `  Description: ${embed.description}\n`;
							if (embed.fields && embed.fields.length > 0) {
								text += `  Fields:\n`;
								for (const f of embed.fields) {
									text += `    - ${f.name}: ${f.value}\n`;
								}
							}
							if (embed.image && embed.image.url) text += `  Image: ${embed.image.url}\n`;
							if (embed.thumbnail && embed.thumbnail.url) text += `  Thumbnail: ${embed.thumbnail.url}\n`;
							if (embed.footer && embed.footer.text) text += `  Footer: ${embed.footer.text}\n`;
							if (embed.timestamp) text += `  Embed Time: ${embed.timestamp}\n`;
						}
					} else {
						text += `Content: [Embed/Attachment/Empty]\n`;
					}
					if (msg.attachments && msg.attachments.size > 0) {
						text += `Attachments: ${msg.attachments.map(a => a.url).join(', ')}\n`;
					}
					text += `---\n`;
				}

				const { AttachmentBuilder } = await import('discord.js');
				const buffer = Buffer.from(text, 'utf-8');
				const attachment = new AttachmentBuilder(buffer, { name: `pins-${channel.name}.txt` });
				try {
					await interaction.user.send({ files: [attachment] });
					await interaction.editReply({ content: '📎 Pinned messages file sent to your DMs.' }).catch(() => {});
				} catch (dmErr) {
					await interaction.editReply({ content: 'Could not DM you, sending file here.', files: [attachment] }).catch(() => {});
				}
			} catch (err) {
				console.error('Error exporting pins TXT:', err);
				await interaction.editReply({ content: 'Failed to export pinned messages.' }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('pins_json_')) {
			const parts = interaction.customId.split('_');
			const authorId = parts[2];
			const channelId = parts[3];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}
			await interaction.deferReply({ ephemeral: true }).catch(() => {});
			try {
				const guild = interaction.guild;
				let channel = guild.channels.cache.get(channelId);
				if (!channel) {
					try { channel = await guild.channels.fetch(channelId); } catch (e) { channel = null; }
				}
				if (!channel || !channel.viewable) {
					await interaction.editReply({ content: '❌ Channel not found or not viewable.' }).catch(() => {});
					return;
				}
				const pins = await channel.messages.fetchPinned();
				if (!pins || !pins.size) {
					await interaction.editReply({ content: 'No pinned messages found in this channel.' }).catch(() => {});
					return;
				}
				const out = [];
				const MAX_INLINE_ATTACHMENT = 5 * 1024 * 1024;
				for (const msg of pins.values()) {
					const attachments = [];
					for (const a of msg.attachments.values()) {
						const attObj = { id: a.id, url: a.url, name: a.name, size: a.size };
						if (a.size && a.size <= MAX_INLINE_ATTACHMENT) {
							try {
								const res = await fetch(a.url);
								const arrayBuffer = await res.arrayBuffer();
								attObj.data = Buffer.from(arrayBuffer).toString('base64');
								attObj.dataEncoding = 'base64';
							} catch (e) {
								console.error('Failed to inline attachment for JSON export', a.url, e);
							}
						}
						attachments.push(attObj);
					}

					out.push({
						id: msg.id,
						author: { id: msg.author?.id, tag: msg.author?.tag },
						content: msg.content,
						embeds: msg.embeds.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : e)),
						attachments,
						createdAt: msg.createdAt.toISOString()
					});
				}
				const buffer = Buffer.from(JSON.stringify(out, null, 2), 'utf-8');
				const { AttachmentBuilder } = await import('discord.js');
				const attachment = new AttachmentBuilder(buffer, { name: `pins-${channel.name}.json` });
				try {
					await interaction.user.send({ files: [attachment] });
					await interaction.editReply({ content: '📦 Pinned messages (JSON) sent to your DMs.' }).catch(() => {});
				} catch (dmErr) {
					await interaction.editReply({ content: 'Could not DM you, sending JSON file here.', files: [attachment] }).catch(() => {});
				}
			} catch (err) {
				console.error('Error exporting pins JSON:', err);
				await interaction.editReply({ content: 'Failed to export pinned messages to JSON.' }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('pins_attachments_')) {
			const parts = interaction.customId.split('_');
			const authorId = parts[2];
			const channelId = parts[3];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}
			await interaction.deferReply({ ephemeral: true }).catch(() => {});
			try {
				const guild = interaction.guild;
				let channel = guild.channels.cache.get(channelId);
				if (!channel) {
					try { channel = await guild.channels.fetch(channelId); } catch (e) { channel = null; }
				}
				if (!channel || !channel.viewable) {
					await interaction.editReply({ content: '❌ Channel not found or not viewable.' }).catch(() => {});
					return;
				}
				const pins = await channel.messages.fetchPinned();
				if (!pins || !pins.size) {
					await interaction.editReply({ content: 'No pinned messages found in this channel.' }).catch(() => {});
					return;
				}

				const archiverMod = await import('archiver');
				const archiver = archiverMod.default || archiverMod;
				const { PassThrough } = await import('stream');
				const archive = archiver('zip', { zlib: { level: 9 } });
				const passthrough = new PassThrough();
				archive.pipe(passthrough);

				let addedAny = false;
				for (const msg of pins.values()) {
					for (const att of msg.attachments.values()) {
						try {
							const res = await fetch(att.url);
							const arrayBuffer = await res.arrayBuffer();
							archive.append(Buffer.from(arrayBuffer), { name: att.name || `${att.id}` });
							addedAny = true;
						} catch (e) {
							console.error('Failed to download attachment for zipping', att.url, e);
						}
					}
				}

				if (!addedAny) {
					await interaction.editReply({ content: 'No attachments found in pinned messages.' }).catch(() => {});
					return;
				}

				archive.finalize();

				const chunks = [];
				for await (const chunk of passthrough) {
					chunks.push(chunk);
				}
				const zipBuffer = Buffer.concat(chunks);

				const { AttachmentBuilder } = await import('discord.js');
				const attachment = new AttachmentBuilder(zipBuffer, { name: `pins-${channel.name}-attachments.zip` });
				try {
					await interaction.user.send({ files: [attachment] }).catch(() => { throw new Error('DM failed'); });
					await interaction.editReply({ content: '📦 Attachments zipped and sent to your DMs.' }).catch(() => {});
				} catch (dmErr) {
					try {
						await interaction.editReply({ content: 'Could not DM you. Sending zip here (ephemeral).', files: [attachment] }).catch(() => {});
					} catch (e) {
						console.error('Failed to send zipped attachments in reply:', e);
						await interaction.editReply({ content: 'Failed to send attachments.' }).catch(() => {});
					}
				}
			} catch (err) {
				console.error('Error zipping attachments for pins:', err);
				await interaction.editReply({ content: 'Failed to download or zip attachments.' }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('restrictreset_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts[2];
			const guildId = parts[3];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}

			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;

			if (action === 'cancel') {
				const cancelContainer = new ContainerBuilder();
				cancelContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Cancelled`));
				cancelContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				cancelContainer.addTextDisplayComponents(td => td.setContent('Reset cancelled.'));
				await interaction.message.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				if (interaction.client.restrictResetConfirmations) {
					interaction.client.restrictResetConfirmations.delete(interaction.customId);
					interaction.client.restrictResetConfirmations.delete(`restrictreset_confirm_${authorId}_${guildId}`);
				}
				return;
			}

			try {
				const guild = interaction.guild;
				const db = interaction.client.db;
				if (!db) {
					const fail = new ContainerBuilder();
					fail.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Failed`));
					fail.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					fail.addTextDisplayComponents(td => td.setContent('Database unavailable.'));
					await interaction.message.edit({ components: [fail], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

				const guildData = await db.findOne({ guildId: guild.id }) || { guildId: guild.id, moderation: {} };
				if (!guildData.moderation) guildData.moderation = {};
				guildData.moderation.restrictedCommands = {};
				await db.updateOne({ guildId: guild.id }, { $set: { moderation: guildData.moderation } }, { upsert: true });

				const success = new ContainerBuilder();
				success.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Reset Complete`));
				success.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				success.addTextDisplayComponents(td => td.setContent('All command restrictions have been removed.'));
				await interaction.message.edit({ components: [success], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

				if (interaction.client.restrictResetConfirmations) {
					interaction.client.restrictResetConfirmations.delete(`restrictreset_confirm_${authorId}_${guildId}`);
					interaction.client.restrictResetConfirmations.delete(`restrictreset_cancel_${authorId}_${guildId}`);
				}
			} catch (err) {
				console.error('[restrictreset] error:', err);
				try {
					const fail = new ContainerBuilder();
					fail.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Failed`));
					fail.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					fail.addTextDisplayComponents(td => td.setContent('Failed to reset restrictions.'));
					await interaction.message.edit({ components: [fail], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				} catch (e) {}
			}
			return;
		}

		if (interaction.customId.startsWith('bindreset_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts[2];
			const guildId = parts[3];
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}

			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;

			if (action === 'cancel') {
				const cancelContainer = new ContainerBuilder();
				cancelContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Cancelled`));
				cancelContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				cancelContainer.addTextDisplayComponents(td => td.setContent('Reset cancelled.'));
				await interaction.message.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				if (interaction.client.bindResetConfirmations) {
					interaction.client.bindResetConfirmations.delete(interaction.customId);
					interaction.client.bindResetConfirmations.delete(`bindreset_confirm_${authorId}_${guildId}`);
				}
				return;
			}

			try {
				const db = interaction.client.db;
				if (!db) {
					const fail = new ContainerBuilder();
					fail.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Failed`));
					fail.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					fail.addTextDisplayComponents(td => td.setContent('Database unavailable.'));
					await interaction.message.edit({ components: [fail], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

				const guildData = await db.findOne({ guildId: guildId }) || { guildId };
				guildData.binds = {};
				await db.updateOne({ guildId }, { $set: { binds: guildData.binds } }, { upsert: true });

				const success = new ContainerBuilder();
				success.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Reset Complete`));
				success.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				success.addTextDisplayComponents(td => td.setContent('All role bindings have been removed.'));
				await interaction.message.edit({ components: [success], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

				if (interaction.client.bindResetConfirmations) {
					interaction.client.bindResetConfirmations.delete(`bindreset_confirm_${authorId}_${guildId}`);
					interaction.client.bindResetConfirmations.delete(`bindreset_cancel_${authorId}_${guildId}`);
				}
			} catch (err) {
				console.error('[bindreset] error:', err);
				try {
					const fail = new ContainerBuilder();
					fail.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Failed`));
					fail.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					fail.addTextDisplayComponents(td => td.setContent('Failed to reset bindings.'));
					await interaction.message.edit({ components: [fail], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				} catch (e) {}
			}
			return;
		}
		if (interaction.customId.startsWith('bindlist_')) {
			const parts = interaction.customId.split('_');
			const dir = parts[1];
			const authorId = parts[2];
			let pageNum = parseInt(parts[3], 10);
			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', ephemeral: true }).catch(() => {});
				return;
			}

			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;

			try {
				const db = interaction.client.db;
				if (!db) {
					const err = new ContainerBuilder();
					err.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} DB Missing`));
					err.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					err.addTextDisplayComponents(td => td.setContent('Database not available.'));
					await interaction.message.edit({ components: [err], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

				const guildData = await db.findOne({ guildId: interaction.guildId }) || {};
				const entries = Object.entries(guildData.binds || {});
				if (!entries.length) {
					const none = new ContainerBuilder();
					none.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || 'ℹ️'} No Binds`));
					none.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					none.addTextDisplayComponents(td => td.setContent('There are no role binds configured for this server.'));
					await interaction.message.edit({ components: [none], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

				const PER_PAGE = 4;
				const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
				if (isNaN(pageNum) || pageNum < 0) pageNum = 0;
				if (pageNum >= totalPages) pageNum = totalPages - 1;

				const buildPage = (page) => {
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.commands || '🔗'} Role Bindings`));
					container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

					const pageItems = entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
					pageItems.forEach(([memberId, roles], idx) => {
						const memberObj = interaction.guild.members.cache.get(memberId);
						container.addTextDisplayComponents(td => td.setContent(`**Member:** <@${memberId}> ${memberId}`));
						if (!roles || roles.length === 0) {
							container.addTextDisplayComponents(td => td.setContent('_No roles bound_'));
						} else {
							const lines = roles.map(rid => {
								const roleObj = interaction.guild.roles.cache.get(rid);
								if (roleObj) return `• <@&${rid}> — ${rid}`;
								return `• Role ID: ${rid}`;
							});
							container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
						}
						if (idx < pageItems.length - 1) container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					});

					container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`**Page:** ${page + 1}/${totalPages} | **Total Members:** ${entries.length}`));

					if (totalPages > 1) {
						container.addActionRowComponents(row => {
							const prev = new ButtonBuilder().setCustomId(`bindlist_prev_${authorId}_${page - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(page === 0);
							const next = new ButtonBuilder().setCustomId(`bindlist_next_${authorId}_${page + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1);
							row.setComponents(prev, next);
							return row;
						});
					}

					return container;
				};

				const pageContainer = buildPage(pageNum);
				await interaction.message.edit({ components: [pageContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[bindlist] error:', err);
				try {
					await interaction.followUp({ content: 'Failed to update bind list.', ephemeral: true }).catch(() => {});
				} catch (e) {}
			}
			return;
		}

		if (
			interaction.customId.startsWith('nuke_confirm_') ||
			interaction.customId.startsWith('nuke_cancel_') ||
			interaction.customId.startsWith('nukeadd_confirm_') ||
			interaction.customId.startsWith('nukeadd_cancel_')
		) {
			try {
				const parts = interaction.customId.split('_');
				const command = parts[0];
				let authorId = parts[2];
				let channelId = parts[3];
				const isScheduledNuke = command === 'nukeadd';
				let intervalRaw;
				if (isScheduledNuke && parts.length > 4) {
					intervalRaw = parts.slice(4).join('_');
				}

				if (interaction.user.id !== authorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;

				if (isScheduledNuke) {

					if (interaction.customId.startsWith('nukeadd_cancel_')) {

						const cancelContainer = new ContainerBuilder();
						cancelContainer.addTextDisplayComponents((textDisplay) =>
							textDisplay.setContent(`# ${EMOJIS.error} Cancelled`)
						);
						cancelContainer.addSeparatorComponents((separator) =>
							separator.setSpacing(SeparatorSpacingSize.Small)
						);
						cancelContainer.addTextDisplayComponents((textDisplay) =>
							textDisplay.setContent('Scheduled nuke operation cancelled.')
						);
						await interaction.message.edit({
							components: [cancelContainer],
							flags: MessageFlags.IsComponentsV2
						}).catch(() => {});

						if (interaction.client.nukeAddConfirmations) {
							interaction.client.nukeAddConfirmations.delete(interaction.customId);
							interaction.client.nukeAddConfirmations.delete(`nukeadd_confirm_${authorId}_${channelId}_${intervalRaw}`);
							interaction.client.nukeAddConfirmations.delete(`nukeadd_cancel_${authorId}_${channelId}`);
						}
						return;
					}

					let nukeData = interaction.client.nukeAddConfirmations?.get(interaction.customId);
					if (!nukeData) {

						nukeData = interaction.client.nukeAddConfirmations?.get(`nukeadd_confirm_${authorId}_${channelId}_${intervalRaw}`);
					}
					if (!nukeData) {
						await interaction.followUp({
							content: '❌ Confirmation expired or not found.',
							flags: 64
						});
						return;
					}
					const guild = interaction.guild;
					const channel = guild.channels.cache.get(channelId);
					if (!channel) {
						await interaction.followUp({
							content: '❌ Channel not found.',
							flags: 64
						});
						return;
					}

					if (!globalThis._scheduledNukes) globalThis._scheduledNukes = new Map();
					const scheduledNukes = globalThis._scheduledNukes;
					if (scheduledNukes.has(channelId)) {
						await interaction.followUp({
							content: '❌ A nuke is already scheduled for this channel.',
							flags: 64
						});
						return;
					}

					const nukeMsgContainer = new ContainerBuilder();
					nukeMsgContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ${EMOJIS.success} Nuke Message`)
					);
					nukeMsgContainer.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					nukeMsgContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(nukeData.nukeMsg)
					);
					await channel.send({
						components: [nukeMsgContainer],
						flags: MessageFlags.IsComponentsV2
					});

					const timeout = setTimeout(async () => {
						try {
							const cloned = await channel.clone({
								name: channel.name,
								topic: channel.topic,
								position: channel.position,
								permissionOverwrites: channel.permissionOverwrites.cache.map(o => o),
								rateLimitPerUser: channel.rateLimitPerUser
							});
							await channel.delete();

							setTimeout(async () => {
								const newChannel = channel.guild.channels.cache.get(cloned.id);
								if (newChannel) {
									const { EmbedBuilder } = await import('discord.js');
									const EMOJIS = (await import('../utils/emojis.js')).default;
									const embed = new EmbedBuilder()
										.setColor(0x57F287)
										.setTitle(`${EMOJIS.success} Channel Nuked!`)
										.setDescription('This channel was nuked and recreated.');
									await newChannel.send({
										embeds: [embed],
										flags: 0
									});
								}
								scheduledNukes.delete(channelId);
							}, 2000);
						} catch (e) {
							scheduledNukes.delete(channelId);
						}
					}, nukeData.intervalMs);
					scheduledNukes.set(channelId, {
						timeout,
						scheduledBy: nukeData.authorId,
						interval: nukeData.intervalRaw,
						nukeMsg: nukeData.nukeMsg,
						scheduledAt: Date.now()
					});

					const successContainer = new ContainerBuilder();
					successContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ${EMOJIS.success} Nuke Scheduled`)
					);
					successContainer.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					successContainer.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`Channel: <#${channelId}>\nInterval: ${nukeData.intervalRaw}\nMessage: ${nukeData.nukeMsg}`)
					);
					await interaction.message.edit({
						components: [successContainer],
						flags: MessageFlags.IsComponentsV2
					}).catch(() => {});

					if (interaction.client.nukeAddConfirmations) {
						interaction.client.nukeAddConfirmations.delete(interaction.customId);
						interaction.client.nukeAddConfirmations.delete(`nukeadd_confirm_${authorId}_${channelId}_${intervalRaw}`);
						interaction.client.nukeAddConfirmations.delete(`nukeadd_cancel_${authorId}_${channelId}`);
					}
					return;
				}

				const nukeData = interaction.client.nukeConfirmations?.get(interaction.customId);
				if (!nukeData) {

					const cancelData = interaction.client.nukeConfirmations?.get(interaction.customId.replace('cancel', 'confirm'));
					if (cancelData) {
						authorId = cancelData.authorId;
						channelId = cancelData.channelId;
					} else {
						await interaction.followUp({ content: '❌ Confirmation expired or not found.', flags: 64 });
						return;
					}
				} else {
					authorId = nukeData.authorId;
					channelId = nukeData.channelId;
				}

				if (interaction.user.id !== authorId) {
					await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 });
					return;
				}

				if (interaction.customId.startsWith('nuke_cancel_')) {
					const cancelContainer = new ContainerBuilder();
					cancelContainer.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`# ${EMOJIS.error} Cancelled`));
					cancelContainer.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
					cancelContainer.addTextDisplayComponents((textDisplay) => textDisplay.setContent('Nuke operation cancelled.'));
					await interaction.message.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					if (interaction.client.nukeConfirmations) {
						interaction.client.nukeConfirmations.delete(`nuke_confirm_${authorId}_${channelId}`);
						interaction.client.nukeConfirmations.delete(interaction.customId);
					}
					return;
				}

				const guild = interaction.guild;
				const channel = guild.channels.cache.get(channelId);
				if (!channel) {
					await interaction.followUp({ content: '❌ Channel not found.', flags: 64 });
					return;
				}

				try {
					const cloned = await channel.clone({
						name: channel.name,
						topic: channel.topic,
						position: channel.position,
						permissionOverwrites: channel.permissionOverwrites.cache.map(o => o),
						rateLimitPerUser: channel.rateLimitPerUser
					});
					await channel.delete();

					await sendLog(interaction.client, guild.id, LOG_EVENTS.MOD_NUKE, {
						executor: interaction.user,
						channel: cloned,
						details: `Channel #${channel.name} was nuked and recreated`
					});

					const successContainer = new ContainerBuilder();
					successContainer.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`# ${EMOJIS.success} Channel Nuked!`));
					successContainer.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
					successContainer.addTextDisplayComponents((textDisplay) => textDisplay.setContent('This channel was nuked and recreated successfully.'));
					await cloned.send({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

				} catch (e) {
					console.error('Error during instant nuke:', e);
					try {
						await interaction.followUp({ content: '❌ Failed to nuke channel. Please check my permissions.', flags: 64 });
					} catch (fuErr) {
						console.error('Failed to followUp after nuke error, attempting DM:', fuErr);
						try {
							await interaction.user.send('❌ Failed to nuke channel. Please check my permissions.').catch(() => {});
						} catch {}
					}
				} finally {
					if (interaction.client.nukeConfirmations) {
						interaction.client.nukeConfirmations.delete(interaction.customId);
						interaction.client.nukeConfirmations.delete(`nuke_cancel_${authorId}_${channelId}`);
					}
				}

			} catch (error) {
				console.error('Error handling nuke confirmation:', error);
				await interaction.followUp({
					content: '❌ An error occurred while handling nuke confirmation.',
					flags: 64
				}).catch(() => {});
			}
		}
		if (interaction.customId === 'refresh_profile') {
			await interaction.deferUpdate();
			await interaction.followUp({
				content: '✅ Profile refreshed!',
				flags: 64
			});
		}

		if (interaction.customId.startsWith('warnings_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const warnedUserId = parts[3];
				const pageNum = parseInt(parts[4]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.warnings) {
					await interaction.followUp({
						content: '❌ No warnings found.',
						flags: 64
					});
					return;
				}

				const userWarnings = guildData.moderation.warnings.filter(w => w.userId === warnedUserId);

				if (userWarnings.length === 0) {
					await interaction.followUp({
						content: '❌ No warnings found.',
						flags: 64
					});
					return;
				}

				const WARNINGS_PER_PAGE = 3;
				const totalPages = Math.ceil(userWarnings.length / WARNINGS_PER_PAGE);
				let newPage = pageNum;

				if (action === 'prev') {
					newPage = Math.max(0, pageNum - 1);
				} else if (action === 'next') {
					newPage = Math.min(pageNum + 1, totalPages - 1);
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing warnings reply:', err);
							throw err;
						});
					}
				};

				const warningsCommand = interaction.client.prefixCommands?.get('warnings');
				if (warningsCommand) {

					await warningsCommand.execute(messageWrapper, [warnedUserId, newPage.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling warnings pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating warnings.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('newmembers_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const pageNum = parseInt(parts[3]) || 0;

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				try { await interaction.guild.members.fetch(); } catch (e) {  }
				const allMembers = Array.from(interaction.guild.members.cache.values())
					.filter(m => !m.user.bot && m.joinedTimestamp)
					.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
					.slice(0, 50);

				const PER_PAGE = 5;
				const totalPages = Math.max(1, Math.ceil(allMembers.length / PER_PAGE));

				let newPage = pageNum;
				if (action === 'prev') newPage = Math.max(0, pageNum - 1);
				else if (action === 'next') newPage = Math.min(pageNum + 1, totalPages - 1);

				const pageMembers = allMembers.slice(newPage * PER_PAGE, newPage * PER_PAGE + PER_PAGE);

				const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || ':information_source:'} New Members`));
				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

				if (!pageMembers || pageMembers.length === 0) {
					container.addTextDisplayComponents(td => td.setContent('No recent members found.'));
				} else {
					const lines = pageMembers.map(m => {
						const joined = m.joinedAt ? m.joinedAt.toLocaleString() : 'Unknown';
						return `• ${m.user.tag} — Joined: ${joined}`;
					});
					container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
				}

				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Page:** ${newPage + 1}/${totalPages} | **Total:** ${allMembers.length} member${allMembers.length !== 1 ? 's' : ''}`));

				if (totalPages > 1) {
					container.addActionRowComponents((row) => {
						const prevBtn = new ButtonBuilder()
							.setCustomId(`newmembers_prev_${commandAuthorId}_${newPage}`)
							.setEmoji(EMOJIS.pageprevious)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(newPage === 0);

						const nextBtn = new ButtonBuilder()
							.setCustomId(`newmembers_next_${commandAuthorId}_${newPage}`)
							.setEmoji(EMOJIS.pagenext)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(newPage >= totalPages - 1);

						row.setComponents(prevBtn, nextBtn);
						return row;
					});
				}

				await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

				return;
			} catch (error) {
				console.error('Error handling newmembers pagination:', error);
				await interaction.followUp({ content: '❌ An error occurred while navigating new members.', flags: 64 }).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('notes_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const notedUserId = parts[3];
				const pageNum = parseInt(parts[4]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.notes || !guildData.moderation.notes[notedUserId]) {
					await interaction.followUp({
						content: '❌ No notes found.',
						flags: 64
					});
					return;
				}

				const userNotes = guildData.moderation.notes[notedUserId];

				if (userNotes.length === 0) {
					await interaction.followUp({
						content: '❌ No notes found.',
						flags: 64
					});
					return;
				}

				const NOTES_PER_PAGE = 3;
				const totalPages = Math.ceil(userNotes.length / NOTES_PER_PAGE);
				let newPage = pageNum;

				if (action === 'prev') {
					newPage = Math.max(0, pageNum - 1);
				} else if (action === 'next') {
					newPage = Math.min(pageNum + 1, totalPages - 1);
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing notes reply:', err);
							throw err;
						});
					}
				};

				const notesCommand = interaction.client.prefixCommands?.get('notes');
				if (notesCommand) {

					await notesCommand.execute(messageWrapper, [notedUserId, newPage.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling notes pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating notes.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('restrictlist_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const pageNum = parseInt(parts[3]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 });
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId }) || {};
				const entries = Object.entries(guildData?.moderation?.restrictedCommands || {});
				if (!entries || entries.length === 0) {
					await interaction.followUp({ content: '❌ No restricted commands configured.', flags: 64 }).catch(() => {});
					return;
				}

				const PER_PAGE = 4;
				const totalPages = Math.ceil(entries.length / PER_PAGE);
				let newPage = pageNum;
				if (action === 'prev') newPage = Math.max(0, pageNum - 1);
				else if (action === 'next') newPage = Math.min(pageNum + 1, totalPages - 1);

				const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.commands || '📜'} Restricted Commands`));
				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

				const page = entries.slice(newPage * PER_PAGE, newPage * PER_PAGE + PER_PAGE);
				page.forEach(( [cmd, roles], idx ) => {
					container.addTextDisplayComponents(td => td.setContent(`**Command:** \`${cmd}\``));
					if (!roles || roles.length === 0) {
						container.addTextDisplayComponents(td => td.setContent('_No roles configured_'));
					} else {
						const lines = roles.map(rid => {
							const roleObj = interaction.guild.roles.cache.get(rid);
							return `• ${roleObj ? `<@&${rid}> — ${roleObj.name}` : `Role ID: ${rid}`}`;
						});
						container.addTextDisplayComponents(td => td.setContent(lines.join('\n')));
					}

					if (idx < page.length - 1) container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				});

				container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Page:** ${newPage + 1}/${totalPages} | **Total Commands:** ${entries.length}`));

				if (totalPages > 1) {
					container.addActionRowComponents(row => {
						const prev = new ButtonBuilder().setCustomId(`restrictlist_prev_${commandAuthorId}_${newPage - 1}`).setEmoji(EMOJIS.pageprevious).setStyle(ButtonStyle.Primary).setDisabled(newPage === 0);
						const next = new ButtonBuilder().setCustomId(`restrictlist_next_${commandAuthorId}_${newPage + 1}`).setEmoji(EMOJIS.pagenext).setStyle(ButtonStyle.Primary).setDisabled(newPage >= totalPages - 1);
						row.setComponents(prev, next);
						return row;
					});
				}

				await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				return;
			} catch (error) {
				console.error('Error handling restrictlist pagination:', error);
				await interaction.followUp({ content: '❌ An error occurred while navigating restricted commands.', flags: 64 }).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('detainlist_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const pageNum = parseInt(parts[3]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.detains) {
					await interaction.followUp({
						content: '❌ No detained members found.',
						flags: 64
					});
					return;
				}

				const detainedUsers = guildData.moderation.detains;

				if (detainedUsers.length === 0) {
					await interaction.followUp({
						content: '❌ No detained members found.',
						flags: 64
					});
					return;
				}

				const MEMBERS_PER_PAGE = 3;
				const totalPages = Math.ceil(detainedUsers.length / MEMBERS_PER_PAGE);
				let newPage = pageNum;

				if (action === 'prev') {
					newPage = Math.max(0, pageNum - 1);
				} else if (action === 'next') {
					newPage = Math.min(pageNum + 1, totalPages - 1);
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing detainlist reply:', err);
							throw err;
						});
					}
				};

				const detainlistCommand = interaction.client.prefixCommands?.get('detainlist');
				if (detainlistCommand) {

					await detainlistCommand.execute(messageWrapper, [newPage.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling detainlist pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating the detained members list.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('queue-')) {
			try {
				const customIdParts = interaction.customId.split('-');
				const action = customIdParts[1];
				const guildId = customIdParts[2];
				const currentPage = parseInt(customIdParts[3]) || 0;

				if (guildId !== interaction.guildId.toString()) return;

				await interaction.deferUpdate().catch(() => {});

				const queue = interaction.client.queue.get(guildId);

				if (!queue || queue.stopped || !queue.tracks.peekAt(0)) {
					await interaction.followUp({
						content: '❌ Queue no longer available or music stopped.',
						flags: 64
					}).catch(() => {});
					return;
				}

				let newPage = currentPage;
				const pageSize = 4;
				const allTracks = queue.tracks.toArray().slice(1);
				const totalPages = allTracks.length > 0 ? Math.ceil(allTracks.length / pageSize) : 1;

				if (action === 'home') {
					newPage = 0;
				} else if (action === 'prev') {
					newPage = Math.max(0, currentPage - 1);
				} else if (action === 'next') {
					newPage = Math.min(currentPage + 1, totalPages - 1);
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing queue reply:', err);
							throw err;
						});
					}
				};

				const queueCommand = interaction.client.prefixCommands?.get('queue');
				if (queueCommand) {
					await queueCommand.execute(messageWrapper, [newPage.toString()], interaction.client);
				}
			} catch (error) {
				console.error('Error handling queue pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating the queue.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('modstats_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const modId = parts[3];
				const pageNum = parseInt(parts[4]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.actions) {
					await interaction.followUp({
						content: '❌ No moderation actions found.',
						flags: 64
					});
					return;
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing modstats reply:', err);
							throw err;
						});
					}
				};

				const modstatsCommand = interaction.client.prefixCommands?.get('modstats');
				if (modstatsCommand) {

					await modstatsCommand.execute(messageWrapper, [`<@${modId}>`, pageNum.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling modstats pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating modstats.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('crimefile_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const userId = parts[3];
				const pageNum = parseInt(parts[4]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.actions) {
					await interaction.followUp({
						content: '❌ No moderation actions found.',
						flags: 64
					});
					return;
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing crimefile reply:', err);
							throw err;
						});
					}
				};

				const crimefileCommand = interaction.client.prefixCommands?.get('crimefile');
				if (crimefileCommand) {

					await crimefileCommand.execute(messageWrapper, [`<@${userId}>`, pageNum.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling crimefile pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating crimefile.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('modhistory_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const moderatorId = parts[3];
				const pageNum = parseInt(parts[4]);

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData || !guildData.moderation || !guildData.moderation.actions) {
					await interaction.followUp({
						content: '❌ No moderation actions found.',
						flags: 64
					});
					return;
				}

				const messageWrapper = {
					guildId: interaction.guildId,
					author: interaction.user,
					guild: interaction.guild,
					member: interaction.member,
					reply: async (options) => {
						await interaction.editReply(options).catch(err => {
							console.error('Error editing modhistory reply:', err);
							throw err;
						});
					}
				};

				const modhistoryCommand = interaction.client.prefixCommands?.get('modhistory');
				if (modhistoryCommand) {

					await modhistoryCommand.execute(messageWrapper, [`<@${moderatorId}>`, pageNum.toString()], interaction.client);
				}

			} catch (error) {
				console.error('Error handling modhistory pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating modhistory.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('suggest_upvote_') || interaction.customId.startsWith('suggest_downvote_')) {
			try {
				await interaction.deferUpdate().catch(() => {});
				const message = interaction.message;
				const userId = interaction.user.id;
				const messageId = message.id;
				const isUpvote = interaction.customId.startsWith('suggest_upvote_');

				let voteState = suggestionVotes.get(messageId);
				if (!voteState) {
					voteState = {
						up: new Set(),
						down: new Set()
					};
					suggestionVotes.set(messageId, voteState);
				}

				if (isUpvote) {
					if (voteState.up.has(userId)) {
						await interaction.followUp({ content: 'You already upvoted this suggestion.', flags: 64 }).catch(() => {});
						return;
					}
					voteState.down.delete(userId);
					voteState.up.add(userId);
				} else {
					if (voteState.down.has(userId)) {
						await interaction.followUp({ content: 'You already downvoted this suggestion.', flags: 64 }).catch(() => {});
						return;
					}
					voteState.up.delete(userId);
					voteState.down.add(userId);
				}

				const upCount = voteState.up.size;
				const downCount = voteState.down.size;

				const updateComponentTree = (component) => {
					const raw = typeof component.toJSON === 'function' ? component.toJSON() : component;

					if (raw.type === ComponentType.Button && raw.custom_id) {
						if (raw.custom_id.startsWith('suggest_upvote_')) {
							return { ...raw, label: String(upCount) };
						}

						if (raw.custom_id.startsWith('suggest_downvote_')) {
							return { ...raw, label: String(downCount) };
						}
					}

					if (Array.isArray(raw.components) && raw.components.length) {
						return {
							...raw,
							components: raw.components.map(updateComponentTree)
						};
					}

					return raw;
				};

				const updatedComponents = message.components.map(updateComponentTree);
				await message.edit({ components: updatedComponents });
			} catch (error) {
				console.error('Error handling suggestion vote:', error);
			}
		}

		if (interaction.customId.startsWith('clear_confirm_')) {
			try {
				const parts = interaction.customId.split('_');
				const clearType = parts[2];
				const targetId = parts[3];
				const authorId = parts[4];

				if (interaction.user.id !== authorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId });

				if (!guildData) {
					await interaction.followUp({
						content: '❌ Guild data not found.',
						flags: 64
					}).catch(() => {});
					return;
				}

			let clearedCount = 0;

			if (clearType === 'warnings') {
				if (guildData.moderation?.warnings) {
					guildData.moderation.warnings = guildData.moderation.warnings.map(w => {
						if (w.userId === targetId && !w.deletedFromWarnings) {
							clearedCount++;
							w.deletedFromWarnings = true;
						}
						return w;
					});
				}
			} else if (clearType === 'crimefiles') {
				if (guildData.moderation?.actions) {
					guildData.moderation.actions = guildData.moderation.actions.map(a => {
						if (a.userId === targetId && !a.deletedFromCrimefile) {
							clearedCount++;
							a.deletedFromCrimefile = true;
						}
						return a;
					});
				}
			} else if (clearType === 'modhistory') {
				if (guildData.moderation?.actions) {
					guildData.moderation.actions = guildData.moderation.actions.map(a => {
						if (a.moderator?.id === targetId && !a.deletedFromModhistory) {
							clearedCount++;
							a.deletedFromModhistory = true;
						}
						return a;
					});
				}
			}
				await interaction.client.db.updateOne(
					{ guildId: interaction.guildId },
					{ $set: guildData },
					{ upsert: true }
				);

				const clearData = interaction.client.clearCommands?.get(interaction.customId);

				const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
				await sendLog(interaction.client, interaction.guildId, LOG_EVENTS.MOD_CLEAR, {
					executor: interaction.user,
					target: targetUser,
					clearType: clearType,
					count: clearedCount,
					details: `Cleared ${clearedCount} ${clearType} record(s)`
				});

				const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
				const successContainer = new ContainerBuilder();
				successContainer.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ ${clearData?.typeDisplay || 'Records'} Cleared`)
				);
				successContainer.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				successContainer.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**User:** <@${targetId}>\n` +
						`**Type:** ${clearData?.typeDisplay}\n` +
						`**Cleared:** ${clearedCount} record(s)`
					)
				);

				await interaction.message.edit({
					components: [successContainer],
					flags: MessageFlags.IsComponentsV2
				}).catch(() => {});

				if (interaction.client.clearCommands) {
					interaction.client.clearCommands.delete(interaction.customId);
				}

			} catch (error) {
				console.error('Error handling clear confirmation:', error);
				await interaction.followUp({
					content: '❌ An error occurred while clearing records.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('clear_cancel_')) {
			try {
				const authorId = interaction.customId.split('_')[2];

				if (interaction.user.id !== authorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
				const cancelContainer = new ContainerBuilder();
				cancelContainer.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Cancelled`)
				);
				cancelContainer.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				cancelContainer.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('Clear operation cancelled.')
				);

				await interaction.message.edit({
					components: [cancelContainer],
					flags: MessageFlags.IsComponentsV2
				}).catch(() => {});

			} catch (error) {
				console.error('Error handling clear cancellation:', error);
			}
		}

		if (interaction.customId.startsWith('banflux_confirm_') || interaction.customId.startsWith('banflux_cancel_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const authorId = parts[2];
				const nonce = parts[3];

				if (interaction.user.id !== authorId) {
					await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 });
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const map = interaction.client.banfluxConfirmations;
				if (!map) {
					await interaction.followUp({ content: '❌ Confirmation expired or not found.', flags: 64 }).catch(() => {});
					return;
				}

				const confirmKey = `banflux_confirm_${authorId}_${nonce}`;
				const cancelKey = `banflux_cancel_${authorId}_${nonce}`;

				if (interaction.customId.startsWith('banflux_cancel_')) {
					const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
					const EMOJIS = (await import('../utils/emojis.js')).default;
					const cancelContainer = new ContainerBuilder();
					cancelContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Cancelled`));
					cancelContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					cancelContainer.addTextDisplayComponents(td => td.setContent('Ban flux operation cancelled.'));
					await interaction.message.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					map.delete(confirmKey);
					map.delete(cancelKey);
					return;
				}

				const data = map.get(confirmKey);
				if (!data) {
					await interaction.followUp({ content: '❌ Confirmation expired or not found.', flags: 64 }).catch(() => {});
					return;
				}

				const guild = interaction.guild;
				const botMember = guild.members.me || guild.members.cache.get(interaction.client.user.id);
				const executor = guild.members.cache.get(data.executorId) || interaction.member;
				const executorHighest = executor?.roles?.highest?.position ?? 0;
				const botHighest = botMember?.roles?.highest?.position ?? 0;

				let attempted = 0;
				let succeeded = 0;
				let failed = 0;

				for (const id of data.eligibleIds) {
					const target = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
					if (!target) continue;
					if (target.id === data.executorId) continue;
					if (target.id === interaction.client.user.id) continue;
					if (target.user.bot) continue;
					const targetHighest = target.roles.highest?.position ?? 0;
					if (executorHighest <= targetHighest) { failed++; attempted++; continue; }
					if (botHighest <= targetHighest) { failed++; attempted++; continue; }
					attempted++;
					try {
						await target.ban({ deleteMessageSeconds: 0, reason: data.reason });
						succeeded++;
					} catch (err) {
						failed++;
					}
				}

				const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;
				const resultContainer = new ContainerBuilder();
				resultContainer.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || ':white_check_mark:'} Ban Flux Result`));
				resultContainer.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
				resultContainer.addTextDisplayComponents(td => td.setContent(`**Requested:** ${data.count}\n**Attempted:** ${attempted}\n**Succeeded:** ${succeeded}\n**Failed:** ${failed}`));
				await interaction.message.edit({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				map.delete(confirmKey);
				map.delete(cancelKey);
				return;
			} catch (error) {
				console.error('Error handling banflux confirmation:', error);
				await interaction.followUp({ content: '❌ An error occurred while handling banflux confirmation.', flags: 64 }).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('slowmode_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const authorId = parts[2];
				const channelId = parts[3];
				if (interaction.user.id !== authorId) {
					await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 });
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const guild = interaction.guild;
				const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
				if (!channel) {
					await interaction.followUp({ content: '❌ Channel not found.', flags: 64 }).catch(() => {});
					return;
				}

				if (action === 'disable') {
					await channel.setRateLimitPerUser(0).catch(() => {});
					const guildData = await interaction.client.db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };
					if (guildData.moderation && guildData.moderation.slowmode && guildData.moderation.slowmode[channelId]) {
						delete guildData.moderation.slowmode[channelId];
						await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: guildData }, { upsert: true });
					}
					const { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } = await import('discord.js');
					const EMOJIS = (await import('../utils/emojis.js')).default;
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success} Disabled`));
					container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent('Disabled slowmode.'));
					await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

				if (action === 'refresh' || action === 'view') {
					const cmd = interaction.client.prefixCommands?.get('slowmode');
					if (cmd) {
						const wrapper = {
							guildId: interaction.guildId,
							author: interaction.user,
							guild: interaction.guild,
							member: interaction.member,
							channel: channel,
							reply: async (options) => {
								if (action === 'view') {

									try {
										await interaction.followUp(options).catch(() => {});
									} catch (e) {

										await interaction.message.edit(options).catch(() => {});
									}
								} else {
									await interaction.message.edit(options).catch(() => {});
								}
							}
						};
						await cmd.execute(wrapper, [], interaction.client);
					}
					return;
				}

				if (action === 'extend') {
					const extra = parseInt(parts[4]) || 30;
					const ms = extra * 1000;
					const { extendSlowmode } = await import('../utils/slowmodeManager.js');
					const rec = await extendSlowmode(interaction.client, interaction.guildId, channelId, ms);
					const { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } = await import('discord.js');
					const EMOJIS = (await import('../utils/emojis.js')).default;
					if (!rec) {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.slowmode} No Active Slowmode`));
						container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
						container.addTextDisplayComponents(td => td.setContent('No active slowmode to extend.'));
						const dismiss = new ButtonBuilder()
							.setCustomId(`slowmode_dismiss_${authorId}`)
							.setLabel('Dismiss')
							.setEmoji(EMOJIS.disable || EMOJIS.slowmode)
							.setStyle(ButtonStyle.Secondary);
						container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
						container.addActionRowComponents(row => row.setComponents(dismiss));
						await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
						return;
					}

					const { formatDuration } = await import('../utils/timeParser.js');
					const intervalMs = (rec.interval || 0) * 1000;
					let body;
					if (rec.expiresAt) {
						const remainingMs = new Date(rec.expiresAt).getTime() - Date.now();
						body = `Extended slowmode by ${extra}s. New remaining: ${formatDuration(remainingMs)}. Interval: ${formatDuration(intervalMs)}.`;
					} else {
						body = `Extended slowmode interval by ${extra}s. New interval: ${formatDuration(intervalMs)}.`;
					}
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.slowmode} Extended`));
					container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(body));
					const view = new ButtonBuilder()
						.setCustomId(`slowmode_view_${authorId}_${channelId}`)
						.setLabel('View Status')
						.setEmoji(EMOJIS.statuss || EMOJIS.slowmode)
						.setStyle(ButtonStyle.Success);
					container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
					container.addActionRowComponents(row => row.setComponents(view));
					await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
					return;
				}

			} catch (error) {
				console.error('Error handling slowmode button interaction:', error);
				try { await interaction.followUp({ content: '❌ An error occurred.', flags: 64 }); } catch {};
			}
			return;
		}
		if (interaction.customId.startsWith('snapshot_')) {
			try {
				const parts = interaction.customId.split('_');
				const action = parts[1];
				const commandAuthorId = parts[2];
				const roleId = parts[3];
				const format = parts[4];
				const currentPageNum = parseInt(parts[5]) || 0;

				if (interaction.user.id !== commandAuthorId) {
					await interaction.reply({
						content: '❌ You cannot use this button.',
						flags: 64
					});
					return;
				}

				await interaction.deferUpdate().catch(() => {});

				const cacheKey = `${interaction.guildId}_${roleId}_${commandAuthorId}_${format}`;
				const cache = interaction.client._snapshotCache?.get(cacheKey);
				if (!cache) {
					await interaction.followUp({
						content: '❌ Snapshot expired or not found. Please run the command again.',
						flags: 64
					});
					return;
				}

				const memberIds = cache.memberIds;
				const roleName = cache.roleName;

				const role = interaction.guild.roles.cache.get(roleId);
				if (!role) {
					await interaction.followUp({
						content: '❌ Role not found.',
						flags: 64
					});
					return;
				}

				const ITEMS_PER_PAGE_JSON = 3;
				const ITEMS_PER_PAGE_OTHER = 10;
				const isJson = format === 'json';
				const totalPages = isJson
					? Math.ceil(memberIds.length / ITEMS_PER_PAGE_JSON)
					: Math.ceil(memberIds.length / ITEMS_PER_PAGE_OTHER);
				let newPage = currentPageNum;
				if (action === 'prev') {
					newPage = Math.max(0, currentPageNum - 1);
				} else if (action === 'next') {
					newPage = Math.min(currentPageNum + 1, totalPages - 1);
				}

				let startIdx, endIdx, pageIds, pageMembers;
				if (isJson) {
					startIdx = newPage * ITEMS_PER_PAGE_JSON;
					endIdx = startIdx + ITEMS_PER_PAGE_JSON;
				} else {
					startIdx = newPage * ITEMS_PER_PAGE_OTHER;
					endIdx = startIdx + ITEMS_PER_PAGE_OTHER;
				}
				pageIds = memberIds.slice(startIdx, endIdx);
				pageMembers = pageIds.map(id => interaction.guild.members.cache.get(id)).filter(Boolean);

				const formatters = {
					text: (members) => members.map(m => `${m.user.username}#${m.user.discriminator}`).join('\n'),
					ids: (members) => members.map(m => m.user.id).join('\n'),
					mentions: (members) => members.map(m => `<@${m.user.id}>`).join('\n'),
					csv: (members) => 'id,username\n' + members.map(m => `${m.user.id},${m.user.username}`).join('\n'),
					json: (members) => JSON.stringify(members.map(m => ({
						id: m.user.id,
						username: m.user.username,
						discriminator: m.user.discriminator,
						avatar: m.user.avatar
					})), null, 2)
				};

				if (action === 'export') {

					const allMembers = memberIds.map(id => interaction.guild.members.cache.get(id)).filter(Boolean);
					const output = formatters[format](allMembers);
					const fileExtension = format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'txt';
					const fileName = `${roleName.replace(/\s+/g, '_')}_snapshot.${fileExtension}`;
					const { AttachmentBuilder } = await import('discord.js');
					const attachment = new AttachmentBuilder(Buffer.from(output), { name: fileName });

					await interaction.followUp({
						files: [attachment],
						ephemeral: true
					});
					return;
				}

				let pageContent;
				if (isJson) {
					pageContent = JSON.stringify(pageMembers.map(m => ({
						id: m.user.id,
						username: m.user.username,
						discriminator: m.user.discriminator,
						avatar: m.user.avatar
					})), null, 2);
				} else {
					switch (format) {
						case 'text':
							pageContent = pageMembers.map(m => `${m.user.username}#${m.user.discriminator}`).join('\n');
							break;
						case 'ids':
							pageContent = pageMembers.map(m => m.user.id).join('\n');
							break;
						case 'mentions':
							pageContent = pageMembers.map(m => `<@${m.user.id}>`).join('\n');
							break;
						case 'csv':
							pageContent = 'id,username\n' + pageMembers.map(m => `${m.user.id},${m.user.username}`).join('\n');
							break;
						default:
							pageContent = '(No data)';
					}

					if (pageContent) {
						const lines = pageContent.split('\n');
						if (format === 'csv' && lines.length > 11) {
							pageContent = lines.slice(0, 11).join('\n');
						} else if (lines.length > 10) {
							pageContent = lines.slice(0, 10).join('\n');
						}
					}
				}
				if (!pageContent) pageContent = '(No data)';

				const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
				const EMOJIS = (await import('../utils/emojis.js')).default;

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.success} ${roleName} - ${format.toUpperCase()}`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`\`\`\`\n${pageContent}\n\`\`\``)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**Page:** ${newPage + 1}/${totalPages} | **Total:** ${memberIds.length} member${memberIds.length !== 1 ? 's' : ''}`)
				);

				if (totalPages > 1) {
					container.addActionRowComponents((row) => {
						const prevBtn = new ButtonBuilder()
							.setCustomId(`snapshot_prev_${commandAuthorId}_${roleId}_${format}_${newPage}`)
							.setEmoji(EMOJIS.pageprevious)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(newPage === 0);

						const nextBtn = new ButtonBuilder()
							.setCustomId(`snapshot_next_${commandAuthorId}_${roleId}_${format}_${newPage}`)
							.setEmoji(EMOJIS.pagenext)
							.setStyle(ButtonStyle.Primary)
							.setDisabled(newPage >= totalPages - 1);

						const exportBtn = new ButtonBuilder()
							.setCustomId(`snapshot_export_${commandAuthorId}_${roleId}_${format}`)
							.setLabel('📥 Export')
							.setStyle(ButtonStyle.Secondary);

						row.setComponents(prevBtn, nextBtn, exportBtn);
						return row;
					});
				} else {
					container.addActionRowComponents((row) => {
						const exportBtn = new ButtonBuilder()
							.setCustomId(`snapshot_export_${commandAuthorId}_${roleId}_${format}`)
							.setLabel('📥 Export')
							.setStyle(ButtonStyle.Secondary);

						row.setComponents(exportBtn);
						return row;
					});
				}

				await interaction.editReply({
					components: [container],
					flags: MessageFlags.IsComponentsV2
				});

			} catch (error) {
				console.error('Error handling snapshot pagination:', error);
				await interaction.followUp({
					content: '❌ An error occurred while navigating the snapshot.',
					flags: 64
				}).catch(() => {});
			}
		}

		if (interaction.customId.startsWith('welcomelist_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts[2];
			const currentPage = parseInt(parts[3]);

			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 }).catch(() => {});
				return;
			}

			const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;
			const { parseFields, parseButtons } = await import('../commands/prefix/Welcome/welcome.js');

			const db = interaction.client.db;
			let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

			if (!guildData.welcome || !guildData.welcome.channels || guildData.welcome.channels.length === 0) {
				await interaction.reply({ content: '❌ No welcome channels configured.', flags: 64 }).catch(() => {});
				return;
			}

			const config = guildData.welcome;
			const PER_PAGE = 3;
			const totalPages = Math.ceil(config.channels.length / PER_PAGE);

			let newPage = currentPage;
			if (action === 'prev') newPage = Math.max(0, currentPage - 1);
			else if (action === 'next') newPage = Math.min(currentPage + 1, totalPages - 1);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Welcome Channels (${config.channels.length})`));

			const start = newPage * PER_PAGE;
			const end = Math.min(start + PER_PAGE, config.channels.length);
			const pageChannels = config.channels.slice(start, end);

			for (const ch of pageChannels) {
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
				container.addTextDisplayComponents(td => td.setContent(`**Page ${newPage + 1}/${totalPages}**`));
				container.addActionRowComponents(row => row.addComponents(
					new ButtonBuilder()
						.setCustomId(`welcomelist_prev_${authorId}_${newPage}`)
						.setEmoji(EMOJIS.pageprevious)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(newPage === 0),
					new ButtonBuilder()
						.setCustomId(`welcomelist_next_${authorId}_${newPage}`)
						.setEmoji(EMOJIS.pagenext)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(newPage >= totalPages - 1)
				));
			}

			await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			return;
		}

		if (interaction.customId.startsWith('goodbyelist_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts[2];
			const currentPage = parseInt(parts[3]);

			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 }).catch(() => {});
				return;
			}

			const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;
			const { parseFields, parseButtons } = await import('../commands/prefix/Welcome/goodbye.js');

			const db = interaction.client.db;
			let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

			if (!guildData.goodbye || !guildData.goodbye.channels || guildData.goodbye.channels.length === 0) {
				await interaction.reply({ content: '❌ No goodbye channels configured.', flags: 64 }).catch(() => {});
				return;
			}

			const config = guildData.goodbye;
			const PER_PAGE = 3;
			const totalPages = Math.ceil(config.channels.length / PER_PAGE);

			let newPage = currentPage;
			if (action === 'prev') newPage = Math.max(0, currentPage - 1);
			else if (action === 'next') newPage = Math.min(currentPage + 1, totalPages - 1);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.settings || '⚙️'} Goodbye Channels (${config.channels.length})`));
			container.addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`**System Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}`));

			const start = newPage * PER_PAGE;
			const end = Math.min(start + PER_PAGE, config.channels.length);
			const pageChannels = config.channels.slice(start, end);

			for (const ch of pageChannels) {
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
				container.addTextDisplayComponents(td => td.setContent(`**Page ${newPage + 1}/${totalPages}**`));
				container.addActionRowComponents(row => row.addComponents(
					new ButtonBuilder()
						.setCustomId(`goodbyelist_prev_${authorId}_${newPage}`)
						.setEmoji(EMOJIS.pageprevious)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(newPage === 0),
					new ButtonBuilder()
						.setCustomId(`goodbyelist_next_${authorId}_${newPage}`)
						.setEmoji(EMOJIS.pagenext)
						.setStyle(ButtonStyle.Primary)
						.setDisabled(newPage >= totalPages - 1)
				));
			}

			await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			return;
		}

		if (interaction.customId.startsWith('welcome_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts.slice(-1)[0];

			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 }).catch(() => {});
				return;
			}

			const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;
			const { buildWelcomeEmbed, buildWelcomeButtons, replacePlaceholders, parseFields, parseButtons } = await import('../commands/prefix/Welcome/welcome.js');

			if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '❌ You need **Administrator** or **Manage Server** permission.', flags: 64 }).catch(() => {});
				return;
			}

			const db = interaction.client.db;
			let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

			if (!guildData.welcome || !guildData.welcome.channels) {
				guildData.welcome = { enabled: false, channels: [] };
			}
			const config = guildData.welcome;

			const rebuildContainer = () => {
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

			if (action === 'toggle') {
				config.enabled = !config.enabled;
				if (config.enabled && config.channels.length === 0) {
					await interaction.reply({ content: '❌ Add a welcome channel first with `.welcome add #channel`', flags: 64 }).catch(() => {});
					return;
				}
				await db.updateOne({ guildId: interaction.guildId }, { $set: { welcome: config } }, { upsert: true });
				await interaction.update({ components: [rebuildContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				return;
			}

			if (action === 'addchannel') {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`welcome_addch_modal_${authorId}`)
					.setTitle('Add Welcome Channel');

				const input = new TextInputBuilder()
					.setCustomId('channel')
					.setLabel('Channel name or ID')
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('general or 123456789012345678')
					.setRequired(true)
					.setMaxLength(50);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'removechannel') {
				if (config.channels.length === 0) {
					await interaction.reply({ content: '❌ No channels configured to remove.', flags: 64 }).catch(() => {});
					return;
				}

				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`welcome_rmch_modal_${authorId}`)
					.setTitle('Remove Welcome Channel');

				const channelNames = config.channels.map(c => {
					const ch = interaction.guild.channels.cache.get(c.channelId);
					return ch ? ch.name : c.channelId;
				}).join(', ');
				const input = new TextInputBuilder()
					.setCustomId('channel')
					.setLabel(`Channels: ${channelNames.slice(0, 40)}`)
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('general or channel ID')
					.setRequired(true)
					.setMaxLength(50);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'test' && parts[2] === 'ch') {
				const channelId = parts[3];
				const channelConfig = config.channels.find(c => c.channelId === channelId);
				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}
				const channel = interaction.guild.channels.cache.get(channelId);
				if (!channel) {
					await interaction.reply({ content: '❌ The configured welcome channel no longer exists.', flags: 64 }).catch(() => {});
					return;
				}

				try {
					const embed = buildWelcomeEmbed(channelConfig, interaction.member);
					const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
					const buttonRow = buildWelcomeButtons(channelConfig, interaction.member);

					if (!content && !embed) {
						await interaction.reply({ content: '❌ No content or embed configured. Add some content first.', flags: 64 }).catch(() => {});
						return;
					}

					const messagePayload = { allowedMentions: { parse: ['users'] } };
					if (content) messagePayload.content = content;
					if (embed) messagePayload.embeds = [embed];
					if (buttonRow) messagePayload.components = [buttonRow];

					const sent = await channel.send(messagePayload);

					if (channelConfig.selfDestruct) {
						setTimeout(() => sent.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
					}

					await interaction.reply({ content: `✅ Test welcome message sent to <#${channel.id}>`, flags: 64 }).catch(() => {});
				} catch (err) {
					await interaction.reply({ content: '❌ Failed to send test message. Check bot permissions.', flags: 64 }).catch(() => {});
				}
				return;
			}

			if (action === 'test') {
				if (config.channels.length === 0) {
					await interaction.reply({ content: '❌ Add a welcome channel first with `.welcome add #channel`', flags: 64 }).catch(() => {});
					return;
				}

				let successCount = 0;
				let failCount = 0;

				for (const channelConfig of config.channels) {
					const channel = interaction.guild.channels.cache.get(channelConfig.channelId);
					if (!channel) {
						failCount++;
						continue;
					}

					try {
						const embed = buildWelcomeEmbed(channelConfig, interaction.member);
						const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
						const buttonRow = buildWelcomeButtons(channelConfig, interaction.member);

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
						failCount++;
					}
				}

				if (successCount === 0) {
					await interaction.reply({ content: '❌ Failed to send test messages. Check bot permissions.', flags: 64 }).catch(() => {});
				} else {
					let response = `✅ Sent ${successCount} test message${successCount !== 1 ? 's' : ''}.`;
					if (failCount > 0) response += ` (${failCount} failed)`;
					await interaction.reply({ content: response, flags: 64 }).catch(() => {});
				}
				return;
			}

			if (action === 'cfg') {
				const option = parts[2];
				const channelId = parts[3];
				const channelConfig = config.channels.find(c => c.channelId === channelId);

				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}

				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`welcome_modal_${option}_${channelId}_${authorId}`)
					.setTitle(`Edit ${option.charAt(0).toUpperCase() + option.slice(1)}`);

				let input;
				switch (option) {
					case 'content':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Content (text above embed)')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Welcome {user}!')
							.setValue(channelConfig.content || '')
							.setRequired(false)
							.setMaxLength(2000);
						break;
					case 'title':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Title')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('Welcome to {server}!')
							.setValue(channelConfig.title || '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'description':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Description')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Hey {user}, welcome! You are member #{memberCount}')
							.setValue(channelConfig.description || '')
							.setRequired(false)
							.setMaxLength(4000);
						break;
					case 'color':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Color (hex)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('#5865F2')
							.setValue(channelConfig.color ? `#${channelConfig.color.toString(16).padStart(6, '0').toUpperCase()}` : '')
							.setRequired(false)
							.setMaxLength(7);
						break;
					case 'author':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Author name && icon URL (optional)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('{user.name} && {user.avatar}')
							.setValue(channelConfig.author ? (channelConfig.authorIcon ? `${channelConfig.author} && ${channelConfig.authorIcon}` : channelConfig.author) : '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'footer':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Footer text && icon URL (optional)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('Member #{memberCount} && {guild.icon}')
							.setValue(channelConfig.footer ? (channelConfig.footerIcon ? `${channelConfig.footer} && ${channelConfig.footerIcon}` : channelConfig.footer) : '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'thumbnail':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Thumbnail URL')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('{user.avatar} or https://...')
							.setValue(channelConfig.thumbnail || '')
							.setRequired(false)
							.setMaxLength(500);
						break;
					case 'image':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Image URL')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('https://...')
							.setValue(channelConfig.image || '')
							.setRequired(false)
							.setMaxLength(500);
						break;
					case 'selfdestruct':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Self-destruct seconds (6-60, empty to disable)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('30')
							.setValue(channelConfig.selfDestruct ? channelConfig.selfDestruct.toString() : '')
							.setRequired(false)
							.setMaxLength(2);
						break;
					case 'fields':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Fields: name && value && inline ;; ...')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Field 1 && Value 1 && true ;; Field 2 && Value 2 && false')
							.setValue(channelConfig.fields || '')
							.setRequired(false)
							.setMaxLength(2000);
						break;
					case 'buttons':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Buttons: label && url ;; ...')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Join Discord && https://discord.gg/... ;; Website && https://...')
							.setValue(channelConfig.buttons || '')
							.setRequired(false)
							.setMaxLength(1000);
						break;
					default:
						await interaction.reply({ content: '❌ Unknown option.', flags: 64 }).catch(() => {});
						return;
				}

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'testch') {
				const channelId = parts[2];
				const channelConfig = config.channels.find(c => c.channelId === channelId);
				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}
				const channel = interaction.guild.channels.cache.get(channelId);
				if (!channel) {
					await interaction.reply({ content: '❌ The configured welcome channel no longer exists.', flags: 64 }).catch(() => {});
					return;
				}

				try {
					const embed = buildWelcomeEmbed(channelConfig, interaction.member);
					const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
					const buttonRow = buildWelcomeButtons(channelConfig, interaction.member);

					if (!content && !embed) {
						await interaction.reply({ content: '❌ No content or embed configured. Add some content first.', flags: 64 }).catch(() => {});
						return;
					}

					const messagePayload = { allowedMentions: { parse: ['users'] } };
					if (content) messagePayload.content = content;
					if (embed) messagePayload.embeds = [embed];
					if (buttonRow) messagePayload.components = [buttonRow];

					const sent = await channel.send(messagePayload);

					if (channelConfig.selfDestruct) {
						setTimeout(() => sent.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
					}

					await interaction.reply({ content: `✅ Test welcome message sent to <#${channel.id}>`, flags: 64 }).catch(() => {});
				} catch (err) {
					await interaction.reply({ content: '❌ Failed to send test message. Check bot permissions.', flags: 64 }).catch(() => {});
				}
				return;
			}

			await interaction.reply({
				content: `ℹ️ Use \`welcome config #channel\` to configure a specific channel with buttons.\n\nOr use \`welcome list\` to see all configured channels.`,
				flags: 64
			}).catch(() => {});
			return;
		}

		if (interaction.customId.startsWith('goodbye_')) {
			const parts = interaction.customId.split('_');
			const action = parts[1];
			const authorId = parts.slice(-1)[0];

			if (interaction.user.id !== authorId) {
				await interaction.reply({ content: '❌ You cannot use this button.', flags: 64 }).catch(() => {});
				return;
			}

			const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = await import('discord.js');
			const EMOJIS = (await import('../utils/emojis.js')).default;
			const { buildGoodbyeEmbed, buildGoodbyeButtons, replacePlaceholders, parseFields, parseButtons } = await import('../commands/prefix/Welcome/goodbye.js');

			if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '❌ You need **Administrator** or **Manage Server** permission.', flags: 64 }).catch(() => {});
				return;
			}

			const db = interaction.client.db;
			let guildData = await db.findOne({ guildId: interaction.guildId }) || { guildId: interaction.guildId };

			if (!guildData.goodbye || !guildData.goodbye.channels) {
				guildData.goodbye = { enabled: false, channels: [] };
			}
			const config = guildData.goodbye;

			const rebuildContainer = () => {
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

			if (action === 'toggle') {
				config.enabled = !config.enabled;
				if (config.enabled && config.channels.length === 0) {
					await interaction.reply({ content: '❌ Add a goodbye channel first with `.goodbye add #channel`', flags: 64 }).catch(() => {});
					return;
				}
				await db.updateOne({ guildId: interaction.guildId }, { $set: { goodbye: config } }, { upsert: true });
				await interaction.update({ components: [rebuildContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
				return;
			}

			if (action === 'addchannel') {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`goodbye_addch_modal_${authorId}`)
					.setTitle('Add Goodbye Channel');

				const input = new TextInputBuilder()
					.setCustomId('channel')
					.setLabel('Channel name or ID')
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('goodbye or 123456789012345678')
					.setRequired(true)
					.setMaxLength(50);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'removechannel') {
				if (config.channels.length === 0) {
					await interaction.reply({ content: '❌ No channels configured to remove.', flags: 64 }).catch(() => {});
					return;
				}

				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`goodbye_rmch_modal_${authorId}`)
					.setTitle('Remove Goodbye Channel');

				const channelNames = config.channels.map(c => {
					const ch = interaction.guild.channels.cache.get(c.channelId);
					return ch ? ch.name : c.channelId;
				}).join(', ');
				const input = new TextInputBuilder()
					.setCustomId('channel')
					.setLabel(`Channels: ${channelNames.slice(0, 40)}`)
					.setStyle(TextInputStyle.Short)
					.setPlaceholder('general or channel ID')
					.setRequired(true)
					.setMaxLength(50);

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'test' && parts[2] === 'ch') {
				const channelId = parts[3];
				const channelConfig = config.channels.find(c => c.channelId === channelId);
				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}
				const channel = interaction.guild.channels.cache.get(channelId);
				if (!channel) {
					await interaction.reply({ content: '❌ The configured goodbye channel no longer exists.', flags: 64 }).catch(() => {});
					return;
				}

				try {
					const embed = buildGoodbyeEmbed(channelConfig, interaction.member);
					const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
					const buttonRow = buildGoodbyeButtons(channelConfig, interaction.member);

					if (!content && !embed) {
						await interaction.reply({ content: '❌ No content or embed configured. Add some content first.', flags: 64 }).catch(() => {});
						return;
					}

					const messagePayload = { allowedMentions: { parse: ['users'] } };
					if (content) messagePayload.content = content;
					if (embed) messagePayload.embeds = [embed];
					if (buttonRow) messagePayload.components = [buttonRow];

					const sent = await channel.send(messagePayload);

					if (channelConfig.selfDestruct) {
						setTimeout(() => sent.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
					}

					await interaction.reply({ content: `✅ Test goodbye message sent to <#${channel.id}>`, flags: 64 }).catch(() => {});
				} catch (err) {
					await interaction.reply({ content: '❌ Failed to send test message. Check bot permissions.', flags: 64 }).catch(() => {});
				}
				return;
			}

			if (action === 'test') {
				if (config.channels.length === 0) {
					await interaction.reply({ content: '❌ Add a goodbye channel first with `.goodbye add #channel`', flags: 64 }).catch(() => {});
					return;
				}

				let successCount = 0;
				let failCount = 0;

				for (const channelConfig of config.channels) {
					const channel = interaction.guild.channels.cache.get(channelConfig.channelId);
					if (!channel) {
						failCount++;
						continue;
					}

					try {
						const embed = buildGoodbyeEmbed(channelConfig, interaction.member);
						const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
						const buttonRow = buildGoodbyeButtons(channelConfig, interaction.member);

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
						failCount++;
					}
				}

				if (successCount === 0) {
					await interaction.reply({ content: '❌ Failed to send test messages. Check bot permissions.', flags: 64 }).catch(() => {});
				} else {
					let response = `✅ Sent ${successCount} test message${successCount !== 1 ? 's' : ''}.`;
					if (failCount > 0) response += ` (${failCount} failed)`;
					await interaction.reply({ content: response, flags: 64 }).catch(() => {});
				}
				return;
			}

			if (action === 'cfg') {
				const option = parts[2];
				const channelId = parts[3];
				const channelConfig = config.channels.find(c => c.channelId === channelId);

				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}

				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
				const modal = new ModalBuilder()
					.setCustomId(`goodbye_modal_${option}_${channelId}_${authorId}`)
					.setTitle(`Edit ${option.charAt(0).toUpperCase() + option.slice(1)}`);

				let input;
				switch (option) {
					case 'content':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Content (text above embed)')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Goodbye {user}!')
							.setValue(channelConfig.content || '')
							.setRequired(false)
							.setMaxLength(2000);
						break;
					case 'title':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Title')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('Farewell!')
							.setValue(channelConfig.title || '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'description':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Description')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('{user.name} has left the server...')
							.setValue(channelConfig.description || '')
							.setRequired(false)
							.setMaxLength(4000);
						break;
					case 'color':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Color (hex)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('#5865F2')
							.setValue(channelConfig.color ? `#${channelConfig.color.toString(16).padStart(6, '0').toUpperCase()}` : '')
							.setRequired(false)
							.setMaxLength(7);
						break;
					case 'author':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Author name && icon URL (optional)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('{user.name} && {user.avatar}')
							.setValue(channelConfig.author ? (channelConfig.authorIcon ? `${channelConfig.author} && ${channelConfig.authorIcon}` : channelConfig.author) : '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'footer':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Footer text && icon URL (optional)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('Member #{memberCount} && {guild.icon}')
							.setValue(channelConfig.footer ? (channelConfig.footerIcon ? `${channelConfig.footer} && ${channelConfig.footerIcon}` : channelConfig.footer) : '')
							.setRequired(false)
							.setMaxLength(256);
						break;
					case 'thumbnail':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Thumbnail URL')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('{user.avatar} or https://...')
							.setValue(channelConfig.thumbnail || '')
							.setRequired(false)
							.setMaxLength(500);
						break;
					case 'image':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Image URL')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('https://...')
							.setValue(channelConfig.image || '')
							.setRequired(false)
							.setMaxLength(500);
						break;
					case 'selfdestruct':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Self-destruct seconds (6-60, empty to disable)')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('30')
							.setValue(channelConfig.selfDestruct ? channelConfig.selfDestruct.toString() : '')
							.setRequired(false)
							.setMaxLength(2);
						break;
					case 'fields':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Fields: name && value && inline ;; ...')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Field 1 && Value 1 && true ;; Field 2 && Value 2 && false')
							.setValue(channelConfig.fields || '')
							.setRequired(false)
							.setMaxLength(2000);
						break;
					case 'buttons':
						input = new TextInputBuilder()
							.setCustomId('value')
							.setLabel('Buttons: label && url ;; ...')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Join Discord && https://discord.gg/... ;; Website && https://...')
							.setValue(channelConfig.buttons || '')
							.setRequired(false)
							.setMaxLength(1000);
						break;
					default:
						await interaction.reply({ content: '❌ Unknown option.', flags: 64 }).catch(() => {});
						return;
				}

				modal.addComponents(new ActionRowBuilder().addComponents(input));
				await interaction.showModal(modal).catch(() => {});
				return;
			}

			if (action === 'testch') {
				const channelId = parts[2];
				const channelConfig = config.channels.find(c => c.channelId === channelId);
				if (!channelConfig) {
					await interaction.reply({ content: '❌ That channel is no longer configured.', flags: 64 }).catch(() => {});
					return;
				}
				const channel = interaction.guild.channels.cache.get(channelId);
				if (!channel) {
					await interaction.reply({ content: '❌ The configured goodbye channel no longer exists.', flags: 64 }).catch(() => {});
					return;
				}

				try {
					const embed = buildGoodbyeEmbed(channelConfig, interaction.member);
					const content = channelConfig.content ? replacePlaceholders(channelConfig.content, interaction.member) : null;
					const buttonRow = buildGoodbyeButtons(channelConfig, interaction.member);

					if (!content && !embed) {
						await interaction.reply({ content: '❌ No content or embed configured. Add some content first.', flags: 64 }).catch(() => {});
						return;
					}

					const messagePayload = { allowedMentions: { parse: ['users'] } };
					if (content) messagePayload.content = content;
					if (embed) messagePayload.embeds = [embed];
					if (buttonRow) messagePayload.components = [buttonRow];

					const sent = await channel.send(messagePayload);

					if (channelConfig.selfDestruct) {
						setTimeout(() => sent.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
					}

					await interaction.reply({ content: `✅ Test goodbye message sent to <#${channel.id}>`, flags: 64 }).catch(() => {});
				} catch (err) {
					await interaction.reply({ content: '❌ Failed to send test message. Check bot permissions.', flags: 64 }).catch(() => {});
				}
				return;
			}

			await interaction.reply({
				content: `ℹ️ Use \`goodbye config #channel\` to configure a specific channel with buttons.\n\nOr use \`goodbye list\` to see all configured channels.`,
				flags: 64
			}).catch(() => {});
			return;
		}

		if (interaction.customId.startsWith('antinuke_')) {
			try {
				const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = await import('discord.js');

				const customId = interaction.customId;
				const guildId = interaction.guildId;

				const wizardData = discordClient.antinukeWizards?.get(interaction.message.id);
				if (wizardData) {
					const elapsed = Date.now() - wizardData.createdAt;
					if (elapsed > 5 * 60 * 1000) {
						await interaction.reply({
							content: '⏰ This wizard has expired. Please run the command again to create a new one.',
							ephemeral: true
						}).catch(() => {});
						return;
					}

					if (wizardData.authorId !== interaction.user.id) {
						await interaction.reply({
							content: '❌ Only the user who opened this wizard can use these buttons.',
							ephemeral: true
						}).catch(() => {});
						return;
					}
				}

				const guildData = await discordClient.db.findOne({ guildId }) || {};
				const antinuke = guildData.antinuke || { enabled: false, modules: {}, admins: [], whitelist: [] };

				const isGuildOwner = interaction.guild.ownerId === interaction.user.id;
				const isAntinukeAdmin = antinuke.admins?.includes(interaction.user.id);
				const isExtraOwner = antinuke.extraOwners?.includes(interaction.user.id);

				if (!isGuildOwner && !isAntinukeAdmin && !isExtraOwner) {
					await interaction.reply({ content: '❌ Only antinuke admins, extra owners, or the server owner can access this.', ephemeral: true }).catch(() => {});
					return;
				}

		const PRESETS = {
			recommended: {
				ban: { enabled: true, threshold: 3, punishment: 'ban' },
				kick: { enabled: true, threshold: 5, punishment: 'strip' },
				role: { enabled: true, threshold: 3, punishment: 'ban' },
				channel: { enabled: true, threshold: 3, punishment: 'ban' },
				webhook: { enabled: true, threshold: 3, punishment: 'ban' },
				botadd: { enabled: true, threshold: 2, punishment: 'ban' },
				emoji: { enabled: false, threshold: 5, punishment: 'strip' },
				vanity: { enabled: true, threshold: 1, punishment: 'ban' }
			},
			strict: {
				ban: { enabled: true, threshold: 1, punishment: 'ban' },
				kick: { enabled: true, threshold: 2, punishment: 'ban' },
				role: { enabled: true, threshold: 1, punishment: 'ban' },
				channel: { enabled: true, threshold: 1, punishment: 'ban' },
				webhook: { enabled: true, threshold: 1, punishment: 'ban' },
				botadd: { enabled: true, threshold: 1, punishment: 'ban' },
				emoji: { enabled: true, threshold: 2, punishment: 'ban' },
				vanity: { enabled: true, threshold: 1, punishment: 'ban' },
				permissions: { enabled: true, threshold: 1, punishment: 'ban' },
				prune: { enabled: true, threshold: 1, punishment: 'ban' }
			},
			light: {
				ban: { enabled: true, threshold: 5, punishment: 'strip' },
				kick: { enabled: true, threshold: 8, punishment: 'strip' },
				role: { enabled: true, threshold: 5, punishment: 'strip' },
				channel: { enabled: true, threshold: 5, punishment: 'strip' },
				webhook: { enabled: true, threshold: 5, punishment: 'strip' },
				botadd: { enabled: true, threshold: 3, punishment: 'strip' }
			}
		};

		if (customId.startsWith('antinuke_preset_')) {
			const preset = customId.replace('antinuke_preset_', '');

			if (!PRESETS[preset]) {
				await interaction.reply({ content: '❌ Invalid preset.', ephemeral: true }).catch(() => {});
				return;
			}

			await interaction.deferUpdate().catch(() => {});

			const presetModulesFromArray = PRESETS[preset]?.modules;
			const presetModulesFromEnabled = Object.entries(PRESETS[preset])
				.filter(([key, val]) => val && typeof val === 'object' && 'enabled' in val && val.enabled)
				.map(([key]) => key);
			const presetModulesArray = Array.isArray(presetModulesFromArray) ? presetModulesFromArray : presetModulesFromEnabled;

			const presetThreshold = PRESETS[preset]?.threshold ?? 3;
			const presetPunishment = PRESETS[preset]?.punishment ?? 'ban';

			const existingData = await discordClient.db.findOne({ guildId }) || { guildId, antinuke: {} };
			const baseAntinuke = existingData.antinuke || {};

			const moduleData = {};
			for (const moduleName of Object.keys(MODULES)) {
				moduleData[moduleName] = {
					enabled: presetModulesArray.includes(moduleName),
					threshold: presetThreshold,
					punishment: presetPunishment
				};
			}

			const updatedAntinuke = {
				...baseAntinuke,
				enabled: true,
				modules: moduleData,
				defaultThreshold: presetThreshold,
				defaultPunishment: presetPunishment,
				defaultWindow: PRESETS[preset]?.window || baseAntinuke.defaultWindow || 60,
				appliedPreset: preset
			};

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { antinuke: updatedAntinuke } },
				{ upsert: true }
			);

			const freshGuildData = { ...existingData, antinuke: updatedAntinuke };
			await sendAntinukeLog(discordClient, freshGuildData, interaction.guild, {
				eventType: 'configChange',
				executor: { id: interaction.user.id, tag: interaction.user.tag },
				action: `Preset Applied: ${preset.charAt(0).toUpperCase() + preset.slice(1)}`,
				details: `Modules enabled: ${presetModulesArray.join(', ')}`,
				changes: {
					'Threshold': `${presetThreshold}`,
					'Punishment': presetPunishment,
					'Modules': `${presetModulesArray.length} enabled`
				}
			});

			const updatedContainer = buildWizardContainer(freshGuildData, 'global');

			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error updating wizard:', err);
			});

			const { ContainerBuilder, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
			const confirmContainer = new ContainerBuilder();
			confirmContainer.addTextDisplayComponents(td => td.setContent(`# ✅ Antinuke Configured`));
			confirmContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const enabledCount = presetModulesArray.length;
			const moduleList = presetModulesArray.map(name => `• **${name}**`).join('\n');
			confirmContainer.addTextDisplayComponents(td => td.setContent(`**${preset.charAt(0).toUpperCase() + preset.slice(1)}** preset applied!\n\n**Active Modules:** ${enabledCount}/10\n${moduleList}`));

			await interaction.followUp({ components: [confirmContainer], ephemeral: true, flags: MessageFlags.IsComponentsV2 }).catch(err => {
				console.error('[Antinuke Button] Error sending preset confirmation:', err);
			});
			return;
		}

		if (customId === 'antinuke_modules') {
			await interaction.deferUpdate().catch(() => {});
			const moduleOptions = [
				{ label: 'Ban Protection', value: 'ban', emoji: '🔨', description: 'Protect against mass bans' },
				{ label: 'Kick Protection', value: 'kick', emoji: '👢', description: 'Protect against mass kicks' },
				{ label: 'Role Protection', value: 'role', emoji: '🎭', description: 'Protect against role changes' },
				{ label: 'Channel Protection', value: 'channel', emoji: '📁', description: 'Protect against channel changes' },
				{ label: 'Webhook Protection', value: 'webhook', emoji: '🪝', description: 'Protect against webhook spam' },
				{ label: 'Bot Add Protection', value: 'botadd', emoji: '🤖', description: 'Monitor bot additions' },
				{ label: 'Emoji Protection', value: 'emoji', emoji: '😀', description: 'Protect server emojis' },
				{ label: 'Vanity Protection', value: 'vanity', emoji: '✨', description: 'Protect vanity URL' },
				{ label: 'Permission Protection', value: 'permissions', emoji: '🔐', description: 'Monitor dangerous perms' },
				{ label: 'Prune Protection', value: 'prune', emoji: '🧹', description: 'Prevent mass prunes' }
			];

			const currentModules = Object.keys(antinuke.modules || {}).filter(m => antinuke.modules[m]?.enabled);

			const select = new StringSelectMenuBuilder()
				.setCustomId('antinuke_module_select')
				.setPlaceholder('Select modules to enable...')
				.setMinValues(0)
				.setMaxValues(moduleOptions.length)
				.addOptions(moduleOptions.map(opt => ({
					...opt,
					default: currentModules.includes(opt.value)
				})));

			const { ContainerBuilder } = await import('discord.js');
			const moduleContainer = new ContainerBuilder();
			moduleContainer.addTextDisplayComponents(td => td.setContent(`# 🛡️ Module Selection\nSelect which protection modules you want to enable.\n\nCurrently enabled: ${currentModules.length > 0 ? currentModules.join(', ') : 'None'}`));
			const row = new ActionRowBuilder().addComponents(select);
			const backRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			);
			moduleContainer.addActionRowComponents(row);
			moduleContainer.addActionRowComponents(backRow);
			await interaction.editReply({ components: [moduleContainer] }).catch(err => {
				console.error('[Antinuke Button] Error showing modules:', err);
			});
			return;
		}

		if (customId === 'antinuke_module_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const selected = interaction.values;
			const modules = { ...antinuke.modules };

			const enabledModules = [];
			const disabledModules = [];

			for (const key of Object.keys(modules)) {
				const wasEnabled = modules[key].enabled;
				modules[key].enabled = false;
				if (wasEnabled && !selected.includes(key)) {
					disabledModules.push(key);
				}
			}
			for (const mod of selected) {
				if (!modules[mod]) modules[mod] = { enabled: true, threshold: 3, punishment: 'ban' };
				const wasEnabled = modules[mod].enabled;
				modules[mod].enabled = true;
				if (!wasEnabled) {
					enabledModules.push(mod);
				}
			}

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.enabled': selected.length > 0, 'antinuke.modules': modules, 'antinuke.appliedPreset': 'custom' } },
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			if (enabledModules.length > 0 || disabledModules.length > 0) {
				await sendAntinukeLog(discordClient, freshGuildData, interaction.guild, {
					eventType: 'configChange',
					executor: { id: interaction.user.id, tag: interaction.user.tag },
					action: 'Modules Updated',
					details: `Total active modules: ${selected.length}`,
					changes: {
						'Enabled': enabledModules.length > 0 ? enabledModules.join(', ') : 'None',
						'Disabled': disabledModules.length > 0 ? disabledModules.join(', ') : 'None'
					}
				});
			}

			const updatedContainer = buildWizardContainer(freshGuildData);
			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error updating modules:', err);
			});
			return;
		}

		if (customId === 'antinuke_punishment_menu') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || antinuke;

			const punishmentOptions = [
				{ label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban the user' },
				{ label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick the user from server' },
				{ label: 'Strip Roles', value: 'strip', emoji: '🎭', description: 'Remove all dangerous roles' },
				{ label: 'Protocol', value: 'protocol', emoji: '🔒', description: 'Strip roles and apply timeout' },
				{ label: 'Timeout', value: 'timeout', emoji: '⏰', description: 'Timeout for 28 days' }
			];

			let currentPunishment = freshAntinuke.defaultPunishment || 'ban';
			if (currentPunishment === 'quarantine') currentPunishment = 'protocol';
			const punitiveMode = freshAntinuke.punitiveMode || 'global';

			const enabledModules = Object.entries(freshAntinuke.modules || {}).filter(([, m]) => m?.enabled);
			const hasPerModulePunishments = enabledModules.some(([, m]) => m?.punishment && m.punishment !== currentPunishment);

			const isGlobalLocked = punitiveMode === 'per-module';

			const select = new StringSelectMenuBuilder()
				.setCustomId('antinuke_punishment_select')
				.setPlaceholder('Select default punishment...')
				.setDisabled(isGlobalLocked)
				.addOptions(punishmentOptions.map(opt => ({
					...opt,
					default: opt.value === currentPunishment
				})));

			let statusText = `Select the default punishment for antinuke violations.\n\n**Current Default:** ${currentPunishment}`;
			if (isGlobalLocked) {
				statusText = `🔒 **Per-Module Mode Active** - Global punishment is locked.\n\n**Current Default:** ${currentPunishment}\n_Click "Switch to Global Mode" to use global punishment instead._`;
			} else if (hasPerModulePunishments) {
				statusText += `\n⚠️ _Some modules have custom punishments configured_`;
			}

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# ⚡ Punishment Settings`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(statusText));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(select));

			const buttonsRow = new ActionRowBuilder();

			if (isGlobalLocked) {

				buttonsRow.addComponents(
					new ButtonBuilder()
						.setCustomId('antinuke_punishment_per_module')
						.setLabel('Configure Per-Module')
						.setStyle(ButtonStyle.Primary)
						.setEmoji('⚙️'),
					new ButtonBuilder()
						.setCustomId('antinuke_punishment_switch_to_global')
						.setLabel('Switch to Global')
						.setStyle(ButtonStyle.Danger)
						.setEmoji('🔓'),
					new ButtonBuilder()
						.setCustomId('antinuke_setup_back')
						.setLabel('Back')
						.setStyle(ButtonStyle.Secondary)
				);
			} else {
				buttonsRow.addComponents(
					new ButtonBuilder()
						.setCustomId('antinuke_punishment_per_module')
						.setLabel('Per-Module Setup')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId('antinuke_setup_back')
						.setLabel('Back')
						.setStyle(ButtonStyle.Secondary)
				);
			}

			view.addActionRowComponents(buttonsRow);
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing punishment menu:', err));
			return;
		}

		if (customId === 'antinuke_thresholds') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || { enabled: false, modules: {} };

			const buildThresholdView = () => {
				const view = new ContainerBuilder();
				const defaultThreshold = freshAntinuke.defaultThreshold || 3;
				view.addTextDisplayComponents(td => td.setContent(`# 📊 Threshold Settings`));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addTextDisplayComponents(td => td.setContent(`**Default Threshold:** ${defaultThreshold} actions`));
				const defaultSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_threshold_default_select')
					.setPlaceholder('Set default threshold...')
					.addOptions(Array.from({ length: 10 }, (_, i) => {
						const val = (i + 1).toString();
						return { label: `${val} actions`, value: val, default: defaultThreshold === i + 1 };
					}));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(defaultSelect));

				const moduleOptions = Object.entries(MODULES).map(([key, meta]) => {
					const modCfg = freshAntinuke.modules?.[key] || {};
					const threshold = modCfg.threshold ?? defaultThreshold;
					return {
						label: meta.name,
						description: `Current: ${threshold} actions`,
						value: key
					};
				});
				const moduleSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_threshold_module_select')
					.setPlaceholder('Pick a module to edit threshold')
					.addOptions(moduleOptions.slice(0, 25));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));

				const summaryLines = moduleOptions.map(opt => `• ${opt.label}: ${opt.description.split(': ')[1]}`);
				view.addTextDisplayComponents(td => td.setContent(`**Module Thresholds**\n${summaryLines.join('\n')}`));

				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('antinuke_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));
				return view;
			};

			const view = buildThresholdView();
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Thresholds] Render error:', err));
			return;
		}

		if (customId === 'antinuke_threshold_default_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const newThreshold = parseInt(interaction.values[0]);
			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || { enabled: false, modules: {} };
			const oldThreshold = freshAntinuke.defaultThreshold || 3;
			freshAntinuke.defaultThreshold = Math.min(20, Math.max(1, newThreshold));
			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.defaultThreshold': freshAntinuke.defaultThreshold } },
				{ upsert: true }
			);

			await sendAntinukeLog(discordClient, { ...freshGuildData, antinuke: freshAntinuke }, interaction.guild, {
				eventType: 'configChange',
				executor: { id: interaction.user.id, tag: interaction.user.tag },
				action: 'Default Threshold Updated',
				details: `Changed from ${oldThreshold} to ${freshAntinuke.defaultThreshold} actions`,
				changes: {
					'Old Value': `${oldThreshold} actions`,
					'New Value': `${freshAntinuke.defaultThreshold} actions`
				}
			});

			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
			const rebuild = () => {
				const defaultThreshold = freshAntinuke.defaultThreshold || 3;
				const view = new ContainerBuilder();
				view.addTextDisplayComponents(td => td.setContent(`# 📊 Threshold Settings`));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addTextDisplayComponents(td => td.setContent(`**Default Threshold:** ${defaultThreshold} actions`));
				const defaultSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_threshold_default_select')
					.setPlaceholder('Set default threshold...')
					.addOptions(Array.from({ length: 10 }, (_, i) => {
						const val = (i + 1).toString();
						return { label: `${val} actions`, value: val, default: defaultThreshold === i + 1 };
					}));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(defaultSelect));

				const moduleOptions = Object.entries(MODULES).map(([key, meta]) => {
					const modCfg = freshAntinuke.modules?.[key] || {};
					const threshold = modCfg.threshold ?? defaultThreshold;
					return {
						label: meta.name,
						description: `Current: ${threshold} actions`,
						value: key
					};
				});
				const moduleSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_threshold_module_select')
					.setPlaceholder('Pick a module to edit threshold')
					.addOptions(moduleOptions.slice(0, 25));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));

				const summaryLines = moduleOptions.map(opt => `• ${opt.label}: ${opt.description.split(': ')[1]}`);
				view.addTextDisplayComponents(td => td.setContent(`**Module Thresholds**\n${summaryLines.join('\n')}`));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('antinuke_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));
				return view;
			};

			await interaction.editReply({ components: [rebuild()] }).catch(err => console.error('[Antinuke Thresholds] Update default error:', err));
			return;
		}

		if (customId === 'antinuke_threshold_module_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const moduleName = interaction.values[0];
			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || { enabled: false, modules: {} };
			const current = freshAntinuke.modules?.[moduleName]?.threshold || freshAntinuke.defaultThreshold || 3;
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 📊 Set Threshold: ${MODULES[moduleName]?.name || moduleName}`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Current threshold: **${current} actions**`));

			const numberSelect = new StringSelectMenuBuilder()
				.setCustomId(`antinuke_threshold_module_value_${moduleName}`)
				.setPlaceholder('Select new threshold...')
				.addOptions(Array.from({ length: 10 }, (_, i) => {
					const val = (i + 1).toString();
					return { label: `${val} actions`, value: val, default: current === i + 1 };
				}));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(numberSelect));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_thresholds').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Thresholds] Render module error:', err));
			return;
		}

		if (customId.startsWith('antinuke_threshold_module_value_') && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const moduleName = customId.replace('antinuke_threshold_module_value_', '');
			const newThreshold = Math.min(20, Math.max(1, parseInt(interaction.values[0])));
			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || { enabled: false, modules: {} };
			if (!freshAntinuke.modules) freshAntinuke.modules = {};
			if (!freshAntinuke.modules[moduleName]) freshAntinuke.modules[moduleName] = { enabled: false };
			const oldThreshold = freshAntinuke.modules[moduleName].threshold ?? freshAntinuke.defaultThreshold ?? 3;
			freshAntinuke.modules[moduleName].threshold = newThreshold;

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { [`antinuke.modules.${moduleName}.threshold`]: newThreshold } },
				{ upsert: true }
			);

			await sendAntinukeLog(discordClient, { ...freshGuildData, antinuke: freshAntinuke }, interaction.guild, {
				eventType: 'configChange',
				executor: { id: interaction.user.id, tag: interaction.user.tag },
				action: `Module Threshold Updated: ${moduleName}`,
				details: `Changed from ${oldThreshold} to ${newThreshold} actions`,
				changes: {
					'Module': moduleName,
					'Old Value': `${oldThreshold} actions`,
					'New Value': `${newThreshold} actions`
				}
			});

			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
			const defaultThreshold = freshAntinuke.defaultThreshold || 3;
			const moduleOptions = Object.entries(MODULES).map(([key, meta]) => {
				const modCfg = freshAntinuke.modules?.[key] || {};
				const threshold = modCfg.threshold ?? defaultThreshold;
				return {
					label: meta.name,
					description: `Current: ${threshold} actions`,
					value: key
				};
			});
			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 📊 Threshold Settings`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`**Default Threshold:** ${defaultThreshold} actions`));
			const defaultSelect = new StringSelectMenuBuilder()
				.setCustomId('antinuke_threshold_default_select')
				.setPlaceholder('Set default threshold...')
				.addOptions(Array.from({ length: 10 }, (_, i) => {
					const val = (i + 1).toString();
					return { label: `${val} actions`, value: val, default: defaultThreshold === i + 1 };
				}));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(defaultSelect));
			const moduleSelect = new StringSelectMenuBuilder()
				.setCustomId('antinuke_threshold_module_select')
				.setPlaceholder('Pick a module to edit threshold')
				.addOptions(moduleOptions.slice(0, 25));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));
			const summaryLines = moduleOptions.map(opt => `• ${opt.label}: ${opt.description.split(': ')[1]}`);
			view.addTextDisplayComponents(td => td.setContent(`**Module Thresholds**\n${summaryLines.join('\n')}`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_main').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Thresholds] Apply module error:', err));
			return;
		}

		if (customId === 'antinuke_punishment_per_module') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || antinuke;

			const MODULES = {
				ban: { name: 'Anti Ban', description: 'Prevents mass banning', emoji: '🔨' },
				kick: { name: 'Anti Kick', description: 'Prevents mass kicking', emoji: '👢' },
				role: { name: 'Anti Role', description: 'Prevents role changes', emoji: '🎭' },
				channel: { name: 'Anti Channel', description: 'Prevents channel changes', emoji: '📁' },
				webhook: { name: 'Anti Webhook', description: 'Prevents webhooks', emoji: '🪝' },
				emoji: { name: 'Anti Emoji', description: 'Prevents emoji deletion', emoji: '😀' },
				botadd: { name: 'Anti Bot', description: 'Prevents bot additions', emoji: '🤖' },
				vanity: { name: 'Anti Vanity', description: 'Prevents vanity changes', emoji: '🔗' },
				prune: { name: 'Anti Prune', description: 'Prevents member pruning', emoji: '✂️' },
				permissions: { name: 'Anti Permissions', description: 'Monitors permissions', emoji: '⚠️' }
			};

			const enabledModules = Object.entries(freshAntinuke.modules || {}).filter(([, m]) => m?.enabled).map(([name]) => name);

			if (enabledModules.length === 0) {
				const view = new ContainerBuilder();
				view.addTextDisplayComponents(td => td.setContent(`# ⚡ Per-Module Punishment`));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addTextDisplayComponents(td => td.setContent(`No modules are enabled. Enable modules first in the main settings.`));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('antinuke_punishment_menu').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));
				await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing per-module:', err));
				return;
			}

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# ⚡ Per-Module Punishment`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Set punishment for each enabled module:`));

			for (const moduleName of enabledModules) {
				const moduleInfo = MODULES[moduleName];
				let currentPunishment = freshAntinuke.modules[moduleName]?.punishment || 'ban';
				if (currentPunishment === 'quarantine') currentPunishment = 'protocol';

				view.addTextDisplayComponents(td => td.setContent(`${moduleInfo.emoji} **${moduleInfo.name}**\n_${moduleInfo.description}_`));

				const select = new StringSelectMenuBuilder()
					.setCustomId(`antinuke_module_punishment_${moduleName}`)
					.setPlaceholder(`Select punishment...`)
					.addOptions([
						{ label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban violators' },
						{ label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick violators from server' },
						{ label: 'Strip Roles', value: 'strip', emoji: '🎭', description: 'Remove all dangerous roles' },
						{ label: 'Protocol', value: 'protocol', emoji: '🔒', description: 'Strip roles and apply timeout' },
						{ label: 'Timeout', value: 'timeout', emoji: '⏰', description: 'Timeout for 28 days' }
					].map(opt => ({ ...opt, default: opt.value === currentPunishment })));

				view.addActionRowComponents(new ActionRowBuilder().addComponents(select));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_punishment_menu').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing per-module:', err));
			return;
		}

		if (customId.startsWith('antinuke_module_punishment_') && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const moduleName = customId.replace('antinuke_module_punishment_', '');
			const selectedPunishment = interaction.values[0];

			const modules = { ...antinuke.modules };
			const oldPunishment = modules[moduleName]?.punishment || antinuke.defaultPunishment || 'ban';
			if (modules[moduleName]) {
				modules[moduleName].punishment = selectedPunishment;
			}

			await discordClient.db.updateOne(
				{ guildId },
				{
					$set: {
						'antinuke.modules': modules,
						'antinuke.appliedPreset': 'custom',
						'antinuke.punitiveMode': 'per-module'
					}
				},
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			await sendAntinukeLog(discordClient, freshGuildData, interaction.guild, {
				eventType: 'configChange',
				executor: { id: interaction.user.id, tag: interaction.user.tag },
				action: `Module Punishment Updated: ${moduleName}`,
				details: `Changed from ${oldPunishment} to ${selectedPunishment} (Per-Module Mode)`,
				changes: {
					'Module': moduleName,
					'Old Value': oldPunishment,
					'New Value': selectedPunishment,
					'Mode': 'Per-Module'
				}
			});

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const MODULES = {
				ban: { name: 'Anti Ban', description: 'Prevents mass banning', emoji: '🔨' },
				kick: { name: 'Anti Kick', description: 'Prevents mass kicking', emoji: '👢' },
				role: { name: 'Anti Role', description: 'Prevents role changes', emoji: '🎭' },
				channel: { name: 'Anti Channel', description: 'Prevents channel changes', emoji: '📁' },
				webhook: { name: 'Anti Webhook', description: 'Prevents webhooks', emoji: '🪝' },
				emoji: { name: 'Anti Emoji', description: 'Prevents emoji deletion', emoji: '😀' },
				botadd: { name: 'Anti Bot', description: 'Prevents bot additions', emoji: '🤖' },
				vanity: { name: 'Anti Vanity', description: 'Prevents vanity changes', emoji: '🔗' },
				prune: { name: 'Anti Prune', description: 'Prevents member pruning', emoji: '✂️' },
				permissions: { name: 'Anti Permissions', description: 'Monitors permissions', emoji: '⚠️' }
			};

			const enabledModules = Object.entries(freshAntinuke.modules || {}).filter(([, m]) => m?.enabled).map(([name]) => name);

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# ⚡ Per-Module Punishment`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Set punishment for each enabled module:`));

			for (const mod of enabledModules) {
				const moduleInfo = MODULES[mod];
				let currentPunishment = freshAntinuke.modules[mod]?.punishment || 'ban';
				if (currentPunishment === 'quarantine') currentPunishment = 'protocol';

				view.addTextDisplayComponents(td => td.setContent(`${moduleInfo.emoji} **${moduleInfo.name}**\n_${moduleInfo.description}_`));

				const select = new StringSelectMenuBuilder()
					.setCustomId(`antinuke_module_punishment_${mod}`)
					.setPlaceholder(`Select punishment...`)
					.addOptions([
						{ label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban violators' },
						{ label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick violators from server' },
						{ label: 'Strip Roles', value: 'strip', emoji: '🎭', description: 'Remove all dangerous roles' },
						{ label: 'Protocol', value: 'protocol', emoji: '🔒', description: 'Strip roles and apply timeout' },
						{ label: 'Timeout', value: 'timeout', emoji: '⏰', description: 'Timeout for 28 days' }
					].map(opt => ({ ...opt, default: opt.value === currentPunishment })));

				view.addActionRowComponents(new ActionRowBuilder().addComponents(select));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_punishment_menu').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating per-module:', err));
			return;
		}

		if (customId === 'antinuke_punishment_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const selected = interaction.values[0];

			const beforeData = await discordClient.db.findOne({ guildId }) || {};
			const oldPunishment = beforeData.antinuke?.defaultPunishment || 'ban';

			await discordClient.db.updateOne(
				{ guildId },
				{
					$set: {
						'antinuke.defaultPunishment': selected,
						'antinuke.appliedPreset': 'custom',
						'antinuke.punitiveMode': 'global'
					}
				},
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			await sendAntinukeLog(discordClient, freshGuildData, interaction.guild, {
				eventType: 'configChange',
				executor: { id: interaction.user.id, tag: interaction.user.tag },
				action: 'Default Punishment Updated',
				details: `Changed from ${oldPunishment} to ${selected} (Global Mode)`,
				changes: {
					'Old Value': oldPunishment,
					'New Value': selected,
					'Mode': 'Global'
				}
			});

			const updatedContainer = buildWizardContainer(freshGuildData);
			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error updating punishment:', err);
			});
			return;
		}

		if (customId === 'antinuke_punishment_switch_to_global') {
			await interaction.deferUpdate().catch(() => {});

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.punitiveMode': 'global' } },
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			const freshAntinuke = freshGuildData.antinuke || {};
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const punishmentOptions = [
				{ label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban the user' },
				{ label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick the user from server' },
				{ label: 'Strip Roles', value: 'strip', emoji: '🎭', description: 'Remove all dangerous roles' },
				{ label: 'Protocol', value: 'protocol', emoji: '🔒', description: 'Strip roles and apply timeout' },
				{ label: 'Timeout', value: 'timeout', emoji: '⏰', description: 'Timeout for 28 days' }
			];

			const currentPunishment = freshAntinuke.defaultPunishment || 'ban';

			const select = new StringSelectMenuBuilder()
				.setCustomId('antinuke_punishment_select')
				.setPlaceholder('Select default punishment...')
				.addOptions(punishmentOptions.map(opt => ({
					...opt,
					default: opt.value === currentPunishment
				})));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# ⚡ Punishment Settings`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`🔓 Switched to **Global Mode**\n\nSelect the default punishment for antinuke violations.\n\n**Current Default:** ${currentPunishment}`));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(select));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('antinuke_punishment_per_module')
					.setLabel('Per-Module Setup')
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId('antinuke_setup_back')
					.setLabel('Back')
					.setStyle(ButtonStyle.Secondary)
			));
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error switching to global:', err));
			return;
		}

		if (customId === 'antinuke_punishment_switch_to_per_module') {
			await interaction.deferUpdate().catch(() => {});

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.punitiveMode': 'per-module' } },
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || {};
			const freshAntinuke = freshGuildData.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');

			const MODULES = {
				ban: { name: 'Anti Ban', description: 'Prevents mass banning', emoji: '🔨' },
				kick: { name: 'Anti Kick', description: 'Prevents mass kicking', emoji: '👢' },
				role: { name: 'Anti Role', description: 'Prevents role changes', emoji: '🎭' },
				channel: { name: 'Anti Channel', description: 'Prevents channel changes', emoji: '📁' },
				webhook: { name: 'Anti Webhook', description: 'Prevents webhooks', emoji: '🪝' },
				emoji: { name: 'Anti Emoji', description: 'Prevents emoji deletion', emoji: '😀' },
				botadd: { name: 'Anti Bot', description: 'Prevents bot additions', emoji: '🤖' },
				vanity: { name: 'Anti Vanity', description: 'Prevents vanity changes', emoji: '🔗' },
				prune: { name: 'Anti Prune', description: 'Prevents member pruning', emoji: '✂️' },
				permissions: { name: 'Anti Permissions', description: 'Monitors permissions', emoji: '⚠️' }
			};

			const enabledModules = Object.entries(freshAntinuke.modules || {}).filter(([, m]) => m?.enabled).map(([name]) => name);

			if (enabledModules.length === 0) {
				const view = new ContainerBuilder();
				view.addTextDisplayComponents(td => td.setContent(`# ⚡ Per-Module Punishment`));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				view.addTextDisplayComponents(td => td.setContent(`No modules are enabled. Enable modules first in the main settings.`));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('antinuke_punishment_menu').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));
				await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing per-module:', err));
				return;
			}

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# ⚡ Per-Module Punishment`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`🔓 Switched to **Per-Module Mode**\n\nSet punishment for each enabled module:`));

			for (const moduleName of enabledModules) {
				const moduleInfo = MODULES[moduleName];
				const currentPunishment = freshAntinuke.modules[moduleName]?.punishment || 'ban';

				view.addTextDisplayComponents(td => td.setContent(`${moduleInfo.emoji} **${moduleInfo.name}**\n_${moduleInfo.description}_`));

				const select = new StringSelectMenuBuilder()
					.setCustomId(`antinuke_module_punishment_${moduleName}`)
					.setPlaceholder(`Select punishment...`)
					.addOptions([
						{ label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban violators' },
						{ label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick violators from server' },
						{ label: 'Strip Roles', value: 'strip', emoji: '🎭', description: 'Remove all dangerous roles' },
						{ label: 'Protocol', value: 'protocol', emoji: '🔒', description: 'Strip roles and apply timeout' },
						{ label: 'Timeout', value: 'timeout', emoji: '⏰', description: 'Timeout for 28 days' }
					].map(opt => ({ ...opt, default: opt.value === currentPunishment })));

				view.addActionRowComponents(new ActionRowBuilder().addComponents(select));
				view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_punishment_menu').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error switching to per-module:', err));
			return;
		}

		if (customId === 'antinuke_whitelist_view') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
			const whitelist = Array.isArray(antinuke.whitelist) ? antinuke.whitelist : [];

			const container = new ContainerBuilder();
			container.addTextDisplayComponents(td => td.setContent(`# 📜 Whitelist`));
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(`**${whitelist.length}** users whitelisted`));
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const userSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_whitelist_add')
				.setPlaceholder('Add users to whitelist...')
				.setMinValues(0)
				.setMaxValues(10);
			container.addActionRowComponents(row => row.addComponents(userSelect));

			if (whitelist.length > 0) {
				const removeSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_whitelist_remove')
					.setPlaceholder('Select users to remove...')
					.setMinValues(0)
					.setMaxValues(Math.min(25, whitelist.length));
				const guild = discordClient.guilds.cache.get(guildId);
				if (guild) {
					const options = [];
					for (const userId of whitelist) {
						try {
							const member = await guild.members.fetch(userId).catch(() => null);
							const username = member?.user?.username || `User (${userId})`;
							options.push({
								label: username,
								value: userId,
								description: `${username} • ID: ${userId.slice(-6)}`
							});
						} catch (err) {
							options.push({
								label: 'Unknown User',
								value: userId,
								description: `ID: ${userId}`
							});
						}
					}
					removeSelect.addOptions(options);
				}
				container.addActionRowComponents(row => row.addComponents(removeSelect));
			}

			container.addActionRowComponents(row => row.addComponents(
				new ButtonBuilder().setCustomId('antinuke_whitelist_clear').setLabel('Clear All').setStyle(ButtonStyle.Danger),
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('[Antinuke Button] Error showing whitelist:', err));
			return;
		}

		if (customId === 'antinuke_whitelist_add' && interaction.isUserSelectMenu()) {
			try {
				await interaction.deferUpdate();
				const selectedUsers = interaction.values;
				const currentWhitelist = Array.isArray(antinuke.whitelist) ? antinuke.whitelist : [];
				const newWhitelist = [...new Set([...currentWhitelist, ...selectedUsers])];

				await discordClient.db.updateOne(
					{ guildId },
					{ $set: { 'antinuke.whitelist': newWhitelist } },
					{ upsert: true }
				);

				const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
				const freshWhitelist = Array.isArray(freshAntinuke.whitelist) ? freshAntinuke.whitelist : [];

				const { ContainerBuilder, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# 📜 Whitelist`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**${freshWhitelist.length}** users whitelisted`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const userSelect = new UserSelectMenuBuilder()
					.setCustomId('antinuke_whitelist_add')
					.setPlaceholder('Add users to whitelist...')
					.setMinValues(0)
					.setMaxValues(10);
				container.addActionRowComponents(row => row.addComponents(userSelect));

				if (freshWhitelist.length > 0) {
					const removeSelect = new StringSelectMenuBuilder()
						.setCustomId('antinuke_whitelist_remove')
						.setPlaceholder('Select users to remove...')
						.setMinValues(0)
						.setMaxValues(Math.min(25, freshWhitelist.length));

					const guild = discordClient.guilds.cache.get(guildId);
					if (guild) {
						const options = [];
						for (const userId of freshWhitelist) {
							try {
								const member = await guild.members.fetch(userId).catch(() => null);
								const username = member?.user?.username || `User (${userId})`;
								options.push({
									label: username,
									value: userId,
									description: `${username} • ID: ${userId.slice(-6)}`
								});
							} catch (err) {
								options.push({
									label: `Unknown User`,
									value: userId,
									description: `ID: ${userId}`
								});
							}
						}
						removeSelect.addOptions(options);
					}
					container.addActionRowComponents(row => row.addComponents(removeSelect));
				}

				container.addActionRowComponents(row => row.addComponents(
					new ButtonBuilder().setCustomId('antinuke_whitelist_clear').setLabel('Clear All').setStyle(ButtonStyle.Danger),
					new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));

				await interaction.message.delete().catch(() => {});
				const sentMessage = await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

				await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Antinuke Button] Error updating whitelist:', err);
			}
			return;
		}

		if (customId === 'antinuke_whitelist_remove' && interaction.isStringSelectMenu()) {
			try {
				await interaction.deferUpdate();
				const usersToRemove = interaction.values;
				const currentWhitelist = Array.isArray(antinuke.whitelist) ? antinuke.whitelist : [];
				const newWhitelist = currentWhitelist.filter(id => !usersToRemove.includes(id));

				await discordClient.db.updateOne(
					{ guildId },
					{ $set: { 'antinuke.whitelist': newWhitelist } },
					{ upsert: true }
				);

				const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
				const freshWhitelist = Array.isArray(freshAntinuke.whitelist) ? freshAntinuke.whitelist : [];

				const { ContainerBuilder, SeparatorSpacingSize, MessageFlags } = await import('discord.js');
				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# 📜 Whitelist`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**${freshWhitelist.length}** users whitelisted`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const userSelect = new UserSelectMenuBuilder()
					.setCustomId('antinuke_whitelist_add')
					.setPlaceholder('Add users to whitelist...')
					.setMinValues(0)
					.setMaxValues(10);
				container.addActionRowComponents(row => row.addComponents(userSelect));

				if (freshWhitelist.length > 0) {
					const removeSelect = new StringSelectMenuBuilder()
						.setCustomId('antinuke_whitelist_remove')
						.setPlaceholder('Select users to remove...')
						.setMinValues(0)
						.setMaxValues(Math.min(25, freshWhitelist.length));

					const guild = discordClient.guilds.cache.get(guildId);
					if (guild) {
						const options = [];
						for (const userId of freshWhitelist) {
							try {
								const member = await guild.members.fetch(userId).catch(() => null);
								const username = member?.user?.username || `User (${userId})`;
								options.push({
									label: username,
									value: userId,
									description: `${username} • ID: ${userId.slice(-6)}`
								});
							} catch (err) {
								options.push({
									label: `Unknown User`,
									value: userId,
									description: `ID: ${userId}`
								});
							}
						}
						removeSelect.addOptions(options);
					}
					container.addActionRowComponents(row => row.addComponents(removeSelect));
				}

				container.addActionRowComponents(row => row.addComponents(
					new ButtonBuilder().setCustomId('antinuke_whitelist_clear').setLabel('Clear All').setStyle(ButtonStyle.Danger),
					new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
				));

				await interaction.message.delete().catch(() => {});
				const sentMessage = await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

				await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Antinuke Button] Error updating whitelist:', err);
			}
			return;
		}

		if (customId.startsWith('antinuke_whitelist_remove_')) {
			await interaction.deferUpdate().catch(() => {});
			const userToRemove = customId.replace('antinuke_whitelist_remove_', '');
			const currentWhitelist = Array.isArray(antinuke.whitelist) ? antinuke.whitelist : [];
			const newWhitelist = currentWhitelist.filter(id => id !== userToRemove);

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.whitelist': newWhitelist } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder } = await import('discord.js');
			const freshWhitelist = Array.isArray(freshAntinuke.whitelist) ? freshAntinuke.whitelist : [];

			const userSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_whitelist_add')
				.setPlaceholder('Add users to whitelist...')
				.setMinValues(0)
				.setMaxValues(10);

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 📜 Whitelist Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Whitelisted users are **immune to antinuke actions**.\n\n**Total:** ${freshWhitelist.length} users`));

			view.addActionRowComponents(new ActionRowBuilder().addComponents(userSelect));

			if (freshWhitelist.length > 0) {
				view.addTextDisplayComponents(td => td.setContent(`\n**Current Whitelist:**`));
				const buttonRows = [];
				for (let i = 0; i < freshWhitelist.length; i += 5) {
					const chunk = freshWhitelist.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_whitelist_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					buttonRows.push(row);
				}
				for (const row of buttonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_whitelist_clear').setLabel('Clear All').setStyle(ButtonStyle.Danger),
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating whitelist:', err));
			return;
		}

		if (customId === 'antinuke_whitelist_clear') {
			await interaction.deferUpdate().catch(() => {});
			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.whitelist': [] } },
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			const updatedContainer = buildWizardContainer(freshGuildData);
			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error clearing whitelist:', err);
			});
			return;
		}

		if (customId === 'antinuke_admins_view') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(antinuke.admins) ? antinuke.admins : [];
			const extraOwners = Array.isArray(antinuke.extraOwners) ? antinuke.extraOwners : [];

			const adminUsers = await Promise.all(admins.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const ownerUsers = await Promise.all(extraOwners.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			const adminList = adminUsers.length > 0
				? adminUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No admins configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users\n${adminList}`));

			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('➕ Add admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_admin_remove_select')
					.setPlaceholder('➖ Remove admins...')
					.setMinValues(1)
					.setMaxValues(Math.min(admins.length, 25))
					.addOptions(adminUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(adminRemoveSelect));
			}

			const ownerList = ownerUsers.length > 0
				? ownerUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No extra owners configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Full Bypass) - ${extraOwners.length} users\n${ownerList}`));

			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('➕ Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_owner_remove_select')
					.setPlaceholder('➖ Remove extra owners...')
					.setMinValues(1)
					.setMaxValues(Math.min(extraOwners.length, 25))
					.addOptions(ownerUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerRemoveSelect));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing admins:', err));
			return;
		}

		if (customId === 'antinuke_admin_add' && interaction.isUserSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const selectedUsers = interaction.values;
			if (selectedUsers.length === 0) return;

			const currentAdmins = Array.isArray(antinuke.admins) ? antinuke.admins : [];
			const newAdmins = [...new Set([...currentAdmins, ...selectedUsers])];

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.admins': newAdmins } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || {};
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const adminUsers = await Promise.all(admins.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));
			const ownerUsers = await Promise.all(extraOwners.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			const adminList = adminUsers.length > 0
				? adminUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No admins configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users\n${adminList}`));

			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('➕ Add admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_admin_remove_select')
					.setPlaceholder('➖ Remove admins...')
					.setMinValues(1)
					.setMaxValues(Math.min(admins.length, 25))
					.addOptions(adminUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(adminRemoveSelect));
			}

			const ownerList = ownerUsers.length > 0
				? ownerUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No extra owners configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Full Bypass) - ${extraOwners.length} users\n${ownerList}`));

			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('➕ Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_owner_remove_select')
					.setPlaceholder('➖ Remove extra owners...')
					.setMinValues(1)
					.setMaxValues(Math.min(extraOwners.length, 25))
					.addOptions(ownerUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerRemoveSelect));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.message.delete().catch(() => {});
			const { MessageFlags } = await import('discord.js');
			await interaction.channel.send({ components: [view], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('[Antinuke Button] Error refreshing admins:', err));
			return;
		}

		if (customId === 'antinuke_admin_remove_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});

			const guildData = await discordClient.db.findOne({ guildId });
			const protocolUsers = guildData?.antinuke?.protocol || [];
			const usersToRemove = interaction.values;

			const executor = interaction.user;
			const guild = interaction.guild;

			let isImmune = false;
			if (guild.ownerId === executor.id) isImmune = true;
			else if (executor.id === discordClient.user.id) isImmune = true;
			else if (discordClient.config?.owners?.includes(executor.id)) isImmune = true;
			else if (guildData?.antinuke?.extraOwners?.includes(executor.id)) isImmune = true;
			else if (guildData?.antinuke?.admins?.some(admin =>
				(typeof admin === 'string' ? false : admin.id === executor.id && admin.immune === true)
			)) isImmune = true;

			if (!isImmune) {
				const protocolViolators = usersToRemove.filter(userId => protocolUsers.some(p => p.id === userId));
				if (protocolViolators.length > 0) {
					try {
						const reason = `[Antinuke Protocol Hold] Attempted to modify protocol users via button`;
						const defaultPunishment = guildData?.antinuke?.defaultPunishment || 'kick';

						const member = await guild.members.fetch(executor.id).catch(() => null);
						if (member && defaultPunishment === 'ban') {
							await guild.members.ban(executor.id, { reason, deleteMessageSeconds: 0 });
						} else if (member && defaultPunishment === 'kick') {
							await member.kick(reason);
						} else if (member && defaultPunishment === 'timeout') {
							await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
						}

						const logChannelId = guildData?.antinuke?.logChannel;
						if (logChannelId) {
							const logChannel = guild.channels.cache.get(logChannelId);
							if (logChannel) {
								const { EmbedBuilder } = await import('discord.js');
								const embed = new EmbedBuilder()
									.setColor(0xFF0000)
									.setTitle('🛡️ Protocol Hold Violation')
									.addFields(
										{ name: 'Executor', value: `${executor.tag || executor.username || executor.id} (${executor.id})`, inline: true },
										{ name: 'Action', value: 'Tried to remove protocol users', inline: true },
										{ name: 'Punishment', value: defaultPunishment, inline: true }
									)
									.setTimestamp();
								await logChannel.send({ embeds: [embed] }).catch(() => {});
							}
						}
					} catch (e) {
						console.error('[Antinuke Protocol Hold] Error punishing executor:', e.message);
					}
					return;
				}
			}

			const currentAdmins = Array.isArray(antinuke.admins) ? antinuke.admins : [];
			const newAdmins = currentAdmins.filter(id => !usersToRemove.includes(id));

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.admins': newAdmins } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || {};
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const adminUsers = await Promise.all(admins.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));
			const ownerUsers = await Promise.all(extraOwners.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			const adminList = adminUsers.length > 0
				? adminUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No admins configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users\n${adminList}`));

			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('➕ Add admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_admin_remove_select')
					.setPlaceholder('➖ Remove admins...')
					.setMinValues(1)
					.setMaxValues(Math.min(admins.length, 25))
					.addOptions(adminUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(adminRemoveSelect));
			}

			const ownerList = ownerUsers.length > 0
				? ownerUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No extra owners configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Full Bypass) - ${extraOwners.length} users\n${ownerList}`));

			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('➕ Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_owner_remove_select')
					.setPlaceholder('➖ Remove extra owners...')
					.setMinValues(1)
					.setMaxValues(Math.min(extraOwners.length, 25))
					.addOptions(ownerUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerRemoveSelect));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.message.delete().catch(() => {});
			const { MessageFlags: MF1 } = await import('discord.js');
			await interaction.channel.send({ components: [view], flags: MF1.IsComponentsV2 }).catch(err => console.error('[Antinuke Button] Error refreshing after admin remove:', err));
			return;
		}

		if (customId === 'antinuke_owner_remove_select' && interaction.isStringSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const usersToRemove = interaction.values;
			const currentOwners = Array.isArray(antinuke.extraOwners) ? antinuke.extraOwners : [];
			const newOwners = currentOwners.filter(id => !usersToRemove.includes(id));

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.extraOwners': newOwners } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || {};
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const adminUsers = await Promise.all(admins.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));
			const ownerUsers = await Promise.all(extraOwners.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			const adminList = adminUsers.length > 0
				? adminUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No admins configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users\n${adminList}`));

			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('➕ Add admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_admin_remove_select')
					.setPlaceholder('➖ Remove admins...')
					.setMinValues(1)
					.setMaxValues(Math.min(admins.length, 25))
					.addOptions(adminUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(adminRemoveSelect));
			}

			const ownerList = ownerUsers.length > 0
				? ownerUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No extra owners configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Full Bypass) - ${extraOwners.length} users\n${ownerList}`));

			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('➕ Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_owner_remove_select')
					.setPlaceholder('➖ Remove extra owners...')
					.setMinValues(1)
					.setMaxValues(Math.min(extraOwners.length, 25))
					.addOptions(ownerUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerRemoveSelect));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.message.delete().catch(() => {});
			const { MessageFlags: MF2 } = await import('discord.js');
			await interaction.channel.send({ components: [view], flags: MF2.IsComponentsV2 }).catch(err => console.error('[Antinuke Button] Error refreshing after owner remove:', err));
			return;
		}

		if (customId.startsWith('antinuke_admin_remove_') && !customId.includes('select')) {
			await interaction.deferUpdate().catch(() => {});
			const userToRemove = customId.replace('antinuke_admin_remove_', '');
			const currentAdmins = Array.isArray(antinuke.admins) ? antinuke.admins : [];
			const newAdmins = currentAdmins.filter(id => id !== userToRemove);

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.admins': newAdmins } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users`));
			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('Add users as admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminButtonRows = [];
				for (let i = 0; i < admins.length; i += 5) {
					const chunk = admins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_admin_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					adminButtonRows.push(row);
				}
				for (const row of adminButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Server Owner Only) - ${extraOwners.length} users`));
			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerButtonRows = [];
				for (let i = 0; i < extraOwners.length; i += 5) {
					const chunk = extraOwners.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_owner_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					ownerButtonRows.push(row);
				}
				for (const row of ownerButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Trusted Admins** (Immune to Antinuke) - ${trustedAdmins.length} users`));
			const trustedSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_trusted_add')
				.setPlaceholder('Add trusted admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(trustedSelect));

			if (trustedAdmins.length > 0) {
				const trustedButtonRows = [];
				for (let i = 0; i < trustedAdmins.length; i += 5) {
					const chunk = trustedAdmins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_trusted_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					trustedButtonRows.push(row);
				}
				for (const row of trustedButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating admins:', err));
			return;
		}

		if (customId === 'antinuke_owner_add' && interaction.isUserSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const selectedUsers = interaction.values;
			if (selectedUsers.length === 0) return;

			const currentOwners = Array.isArray(antinuke.extraOwners) ? antinuke.extraOwners : [];
			const newOwners = [...new Set([...currentOwners, ...selectedUsers])];

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.extraOwners': newOwners } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || {};
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder, StringSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const adminUsers = await Promise.all(admins.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));
			const ownerUsers = await Promise.all(extraOwners.map(async (id) => {
				try {
					const user = await discordClient.users.fetch(id);
					return { id, username: user.username, displayName: user.displayName || user.username };
				} catch { return { id, username: `Unknown (${id.slice(-4)})`, displayName: `Unknown` }; }
			}));

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			const adminList = adminUsers.length > 0
				? adminUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No admins configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users\n${adminList}`));

			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('➕ Add admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_admin_remove_select')
					.setPlaceholder('➖ Remove admins...')
					.setMinValues(1)
					.setMaxValues(Math.min(admins.length, 25))
					.addOptions(adminUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(adminRemoveSelect));
			}

			const ownerList = ownerUsers.length > 0
				? ownerUsers.map((u, i) => `\`${i + 1}.\` ${u.displayName} (${u.id})`).join('\n')
				: '*No extra owners configured*';
			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Full Bypass) - ${extraOwners.length} users\n${ownerList}`));

			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('➕ Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerRemoveSelect = new StringSelectMenuBuilder()
					.setCustomId('antinuke_owner_remove_select')
					.setPlaceholder('➖ Remove extra owners...')
					.setMinValues(1)
					.setMaxValues(Math.min(extraOwners.length, 25))
					.addOptions(ownerUsers.slice(0, 25).map(u => ({
						label: u.displayName.slice(0, 100),
						description: `@${u.username}`.slice(0, 100),
						value: u.id
					})));
				view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerRemoveSelect));
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.message.delete().catch(() => {});
			const { MessageFlags: MF3 } = await import('discord.js');
			await interaction.channel.send({ components: [view], flags: MF3.IsComponentsV2 }).catch(err => console.error('[Antinuke Button] Error refreshing owners:', err));
			return;
		}

		if (customId.startsWith('antinuke_owner_remove_') && !customId.includes('select')) {
			await interaction.deferUpdate().catch(() => {});
			const userToRemove = customId.replace('antinuke_owner_remove_', '');
			const currentOwners = Array.isArray(antinuke.extraOwners) ? antinuke.extraOwners : [];
			const newOwners = currentOwners.filter(id => id !== userToRemove);

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.extraOwners': newOwners } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users`));
			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('Add users as admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminButtonRows = [];
				for (let i = 0; i < admins.length; i += 5) {
					const chunk = admins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_admin_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					adminButtonRows.push(row);
				}
				for (const row of adminButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Server Owner Only) - ${extraOwners.length} users`));
			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerButtonRows = [];
				for (let i = 0; i < extraOwners.length; i += 5) {
					const chunk = extraOwners.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_owner_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					ownerButtonRows.push(row);
				}
				for (const row of ownerButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Trusted Admins** (Immune to Antinuke) - ${trustedAdmins.length} users`));
			const trustedSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_trusted_add')
				.setPlaceholder('Add trusted admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(trustedSelect));

			if (trustedAdmins.length > 0) {
				const trustedButtonRows = [];
				for (let i = 0; i < trustedAdmins.length; i += 5) {
					const chunk = trustedAdmins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_trusted_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					trustedButtonRows.push(row);
				}
				for (const row of trustedButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating owners:', err));
			return;
		}

		if (customId === 'antinuke_trusted_add' && interaction.isUserSelectMenu()) {
			await interaction.deferUpdate().catch(() => {});
			const selectedUsers = interaction.values;
			const currentTrusted = Array.isArray(antinuke.trustedAdmins) ? antinuke.trustedAdmins : [];
			const newTrusted = [...new Set([...currentTrusted, ...selectedUsers])];

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.trustedAdmins': newTrusted } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users`));
			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('Add users as admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminButtonRows = [];
				for (let i = 0; i < admins.length; i += 5) {
					const chunk = admins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_admin_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					adminButtonRows.push(row);
				}
				for (const row of adminButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Server Owner Only) - ${extraOwners.length} users`));
			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerButtonRows = [];
				for (let i = 0; i < extraOwners.length; i += 5) {
					const chunk = extraOwners.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_owner_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					ownerButtonRows.push(row);
				}
				for (const row of ownerButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Trusted Admins** (Immune to Antinuke) - ${trustedAdmins.length} users`));
			const trustedSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_trusted_add')
				.setPlaceholder('Add trusted admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(trustedSelect));

			if (trustedAdmins.length > 0) {
				const trustedButtonRows = [];
				for (let i = 0; i < trustedAdmins.length; i += 5) {
					const chunk = trustedAdmins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_trusted_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					trustedButtonRows.push(row);
				}
				for (const row of trustedButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating trusted:', err));
			return;
		}

		if (customId.startsWith('antinuke_trusted_remove_')) {
			await interaction.deferUpdate().catch(() => {});
			const userToRemove = customId.replace('antinuke_trusted_remove_', '');
			const currentTrusted = Array.isArray(antinuke.trustedAdmins) ? antinuke.trustedAdmins : [];
			const newTrusted = currentTrusted.filter(id => id !== userToRemove);

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.trustedAdmins': newTrusted } },
				{ upsert: true }
			);

			const freshAntinuke = (await discordClient.db.findOne({ guildId }))?.antinuke || antinuke;
			const { ContainerBuilder, SeparatorSpacingSize, UserSelectMenuBuilder } = await import('discord.js');

			const admins = Array.isArray(freshAntinuke.admins) ? freshAntinuke.admins : [];
			const extraOwners = Array.isArray(freshAntinuke.extraOwners) ? freshAntinuke.extraOwners : [];

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 👑 Permission Management`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`Configure antinuke permissions for different user roles.`));

			view.addTextDisplayComponents(td => td.setContent(`\n**Admins** (Configure Antinuke) - ${admins.length} users`));
			const adminSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_admin_add')
				.setPlaceholder('Add users as admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(adminSelect));

			if (admins.length > 0) {
				const adminButtonRows = [];
				for (let i = 0; i < admins.length; i += 5) {
					const chunk = admins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_admin_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					adminButtonRows.push(row);
				}
				for (const row of adminButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Extra Owners** (Server Owner Only) - ${extraOwners.length} users`));
			const ownerSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_owner_add')
				.setPlaceholder('Add extra owners...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(ownerSelect));

			if (extraOwners.length > 0) {
				const ownerButtonRows = [];
				for (let i = 0; i < extraOwners.length; i += 5) {
					const chunk = extraOwners.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_owner_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					ownerButtonRows.push(row);
				}
				for (const row of ownerButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addTextDisplayComponents(td => td.setContent(`\n**Trusted Admins** (Immune to Antinuke) - ${trustedAdmins.length} users`));
			const trustedSelect = new UserSelectMenuBuilder()
				.setCustomId('antinuke_trusted_add')
				.setPlaceholder('Add trusted admins...')
				.setMinValues(0)
				.setMaxValues(10);
			view.addActionRowComponents(new ActionRowBuilder().addComponents(trustedSelect));

			if (trustedAdmins.length > 0) {
				const trustedButtonRows = [];
				for (let i = 0; i < trustedAdmins.length; i += 5) {
					const chunk = trustedAdmins.slice(i, i + 5);
					const row = new ActionRowBuilder();
					for (const userId of chunk) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`antinuke_trusted_remove_${userId}`)
								.setLabel(`Remove ${userId}`)
								.setStyle(ButtonStyle.Danger)
						);
					}
					trustedButtonRows.push(row);
				}
				for (const row of trustedButtonRows) {
					view.addActionRowComponents(row);
				}
			}

			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));

			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error updating trusted:', err));
			return;
		}

		if (customId === 'antinuke_view_config') {
			await interaction.deferUpdate().catch(() => {});
			const { ContainerBuilder, SeparatorSpacingSize } = await import('discord.js');
			const enabledModules = Object.entries(antinuke.modules || {}).filter(([, m]) => m?.enabled).map(([k, v]) => `• **${k}**: threshold ${v.threshold || 3}, punishment ${v.punishment || 'ban'}`).join('\n') || 'None';
			const whitelist = Array.isArray(antinuke.whitelist) ? antinuke.whitelist : [];
			const admins = Array.isArray(antinuke.admins) ? antinuke.admins : [];
			const extraOwners = Array.isArray(antinuke.extraOwners) ? antinuke.extraOwners : [];

			const view = new ContainerBuilder();
			view.addTextDisplayComponents(td => td.setContent(`# 📊 Full Configuration`));
			view.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			view.addTextDisplayComponents(td => td.setContent(`**Status:** ${antinuke.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Default Punishment:** ${antinuke.defaultPunishment || 'ban'}\n**Default Threshold:** ${antinuke.defaultThreshold || 3} actions\n\n**Enabled Modules:**\n${enabledModules}\n\n**Permissions:**\n• Admins: ${admins.length} users\n• Extra Owners: ${extraOwners.length} users\n\n**Other:**\n• Whitelist: ${whitelist.length} users`));
			view.addActionRowComponents(new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId('antinuke_setup_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
			));
			await interaction.editReply({ components: [view] }).catch(err => console.error('[Antinuke Button] Error showing config:', err));
			return;
		}

		if (customId === 'antinuke_toggle_on' || customId === 'antinuke_toggle_off') {
			const enable = customId === 'antinuke_toggle_on';

			await discordClient.db.updateOne(
				{ guildId },
				{ $set: { 'antinuke.enabled': enable } },
				{ upsert: true }
			);

			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			const updatedContainer = buildWizardContainer(freshGuildData);
			await interaction.deferUpdate().catch(() => {});
			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error toggling antinuke:', err);
			});
			return;
		}

		if (customId === 'antinuke_setup_back') {
			await interaction.deferUpdate().catch(() => {});
			const freshGuildData = await discordClient.db.findOne({ guildId }) || { guildId };
			const updatedContainer = buildWizardContainer(freshGuildData);
			await interaction.editReply({ components: [updatedContainer] }).catch(err => {
				console.error('[Antinuke Button] Error going back:', err);
			});
			return;
		}

		if (customId === 'antinuke_configure_thresholds') {
			await interaction.deferUpdate().catch(() => {});
			const modal = new ModalBuilder()
				.setCustomId('antinuke_threshold_modal')
				.setTitle('Configure Thresholds');

			const banInput = new TextInputBuilder()
				.setCustomId('ban_threshold')
				.setLabel('Ban Threshold (1-10)')
				.setStyle(TextInputStyle.Short)
				.setValue(String(antinuke.modules?.ban?.threshold || 3))
				.setRequired(false);

			const kickInput = new TextInputBuilder()
				.setCustomId('kick_threshold')
				.setLabel('Kick Threshold (1-10)')
				.setStyle(TextInputStyle.Short)
				.setValue(String(antinuke.modules?.kick?.threshold || 5))
				.setRequired(false);

			const roleInput = new TextInputBuilder()
				.setCustomId('role_threshold')
				.setLabel('Role Threshold (1-10)')
				.setStyle(TextInputStyle.Short)
				.setValue(String(antinuke.modules?.role?.threshold || 3))
				.setRequired(false);

			const channelInput = new TextInputBuilder()
				.setCustomId('channel_threshold')
				.setLabel('Channel Threshold (1-10)')
				.setStyle(TextInputStyle.Short)
				.setValue(String(antinuke.modules?.channel?.threshold || 3))
				.setRequired(false);

			modal.addComponents(
				new ActionRowBuilder().addComponents(banInput),
				new ActionRowBuilder().addComponents(kickInput),
				new ActionRowBuilder().addComponents(roleInput),
				new ActionRowBuilder().addComponents(channelInput)
			);

			await interaction.showModal(modal).catch(err => {
				console.error('[Antinuke Button] Error showing modal:', err);
			});
			return;
		}
	} catch (error) {
		console.error('[Antinuke Button Handler] Error:', error);
		try {
			await interaction.reply({ content: '❌ An error occurred: ' + error.message, ephemeral: true }).catch(() => {});
		} catch (e) {
			console.error('[Antinuke Button Handler] Could not send error message:', e);
		}
			}
		}

		if (interaction.customId.startsWith('automod_')) {
			try {
				const { ContainerBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder, ChannelType } = await import('discord.js');
				const { MODULES, PUNISHMENTS, PRESETS, getDefaultConfig, buildWizardContainer, buildModulesPage, buildPunishmentsPage, buildIgnorePage, buildModuleIgnorePage, buildWordsPage, buildStrikesPage } = await import('../commands/prefix/Automod/automod.js');

				const customId = interaction.customId;
				const guildId = interaction.guildId;

				if (!interaction.member.permissions.has(0x20n)) {
					await interaction.reply({ content: '❌ You need **Manage Server** permission.', ephemeral: true }).catch(() => {});
					return;
				}

				const guildData = await discordClient.db.findOne({ guildId }) || {};
				let config = guildData.automod || getDefaultConfig();

				const saveConfig = async () => {
					await discordClient.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });
				};

				if (customId === 'automod_toggle_on' || customId === 'automod_toggle_off') {
					await interaction.deferUpdate().catch(() => {});
					config.enabled = customId === 'automod_toggle_on';
					await saveConfig();
					await interaction.editReply({ components: [buildWizardContainer(config)] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_preset_')) {
					await interaction.deferUpdate().catch(() => {});
					const presetName = customId.replace('automod_preset_', '');
					const preset = PRESETS[presetName];
					if (!preset) return;

					for (const modKey of Object.keys(MODULES)) {
						if (!config.modules[modKey]) {
							config.modules[modKey] = { enabled: false, punishments: [MODULES[modKey].defaultPunishment], strikes: MODULES[modKey].strikes || 0, threshold: 1, ignore: { channels: [], roles: [] } };
						}
						config.modules[modKey].enabled = preset.modules.includes(modKey);
					}
					config.enabled = true;
					config.activePreset = presetName;
					await saveConfig();
					await interaction.editReply({ components: [buildWizardContainer(config)] }).catch(() => {});
					await interaction.followUp({ content: `✅ **${preset.name}** preset applied! ${preset.modules.length} modules enabled.`, ephemeral: true }).catch(() => {});
					return;
				}

				if (customId === 'automod_back_main') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildWizardContainer(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_page_modules') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildModulesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_module_toggle' && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const selected = interaction.values;
					for (const modKey of selected) {
						if (!config.modules[modKey]) {
							config.modules[modKey] = { enabled: false, punishments: [MODULES[modKey].defaultPunishment], strikes: MODULES[modKey].strikes || 0, threshold: 1, ignore: { channels: [], roles: [] } };
						}
						config.modules[modKey].enabled = !config.modules[modKey].enabled;
					}
					config.activePreset = null;
					await saveConfig();
					await interaction.editReply({ components: [buildModulesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_modules_all_on') {
					await interaction.deferUpdate().catch(() => {});
					for (const modKey of Object.keys(MODULES)) {
						if (!config.modules[modKey]) {
							config.modules[modKey] = { enabled: false, punishments: [MODULES[modKey].defaultPunishment], strikes: MODULES[modKey].strikes || 0, threshold: 1, ignore: { channels: [], roles: [] } };
						}
						config.modules[modKey].enabled = true;
					}
					config.activePreset = null;
					await saveConfig();
					await interaction.editReply({ components: [buildModulesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_modules_all_off') {
					await interaction.deferUpdate().catch(() => {});
					for (const modKey of Object.keys(MODULES)) {
						if (config.modules[modKey]) config.modules[modKey].enabled = false;
					}
					config.activePreset = null;
					await saveConfig();
					await interaction.editReply({ components: [buildModulesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_page_punishments') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildPunishmentsPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_punishment_select_module' && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = interaction.values[0];
					await interaction.editReply({ components: [buildPunishmentsPage(config, moduleName)] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_punishment_set_') && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = customId.replace('automod_punishment_set_', '');
					const punishments = interaction.values;
					if (!config.modules[moduleName]) {
						config.modules[moduleName] = { enabled: false, punishments: [], strikes: 0, threshold: 1, ignore: { channels: [], roles: [] } };
					}
					config.modules[moduleName].punishments = punishments;
					config.activePreset = null;
					await saveConfig();
					await interaction.editReply({ components: [buildPunishmentsPage(config, moduleName)] }).catch(() => {});
					await interaction.followUp({ content: `✅ **${MODULES[moduleName].name}** punishments set to: ${punishments.join(' + ')}`, ephemeral: true }).catch(() => {});
					return;
				}

				if (customId === 'automod_page_ignore') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildIgnorePage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_ignore_type' && interaction.isStringSelectMenu()) {
					const action = interaction.values[0];

					if (action === 'add_channel') {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`📝 **ADD IGNORED CHANNEL**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a channel to ignore globally`));
						const channelSelect = new ChannelSelectMenuBuilder()
							.setCustomId('automod_ignore_add_channel')
							.setPlaceholder('Select channel...')
							.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
						container.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(
							new ButtonBuilder().setCustomId('automod_page_ignore').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
						));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'add_role') {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`🎭 **ADD IGNORED ROLE**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a role to ignore globally`));
						const roleSelect = new RoleSelectMenuBuilder()
							.setCustomId('automod_ignore_add_role')
							.setPlaceholder('Select role...');
						container.addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(
							new ButtonBuilder().setCustomId('automod_page_ignore').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
						));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'add_user') {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`👤 **ADD IGNORED USER**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a user to ignore globally`));
						const userSelect = new UserSelectMenuBuilder()
							.setCustomId('automod_ignore_add_user')
							.setPlaceholder('Select user...');
						container.addActionRowComponents(new ActionRowBuilder().addComponents(userSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(
							new ButtonBuilder().setCustomId('automod_page_ignore').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
						));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'per_module') {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`📦 **PER-MODULE IGNORE**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a module to configure its ignore rules`));
						const moduleSelect = new StringSelectMenuBuilder()
							.setCustomId('automod_ignore_per_module_select')
							.setPlaceholder('Select module...')
							.addOptions(Object.entries(MODULES).map(([key, mod]) => ({ label: mod.name, value: key, emoji: mod.emoji })));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(
							new ButtonBuilder().setCustomId('automod_page_ignore').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
						));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'clear_all') {
						await interaction.deferUpdate().catch(() => {});
						config.ignore = { channels: [], roles: [], users: [] };
						for (const modKey of Object.keys(config.modules)) {
							if (config.modules[modKey].ignore) {
								config.modules[modKey].ignore = { channels: [], roles: [] };
							}
						}
						await saveConfig();
						await interaction.editReply({ components: [buildIgnorePage(config)] }).catch(() => {});
						await interaction.followUp({ content: '✅ All ignore rules cleared.', ephemeral: true }).catch(() => {});
						return;
					}
				}

				if (customId === 'automod_ignore_per_module_select' && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					try {
						const moduleName = interaction.values[0];
						await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(e => {
                            console.error('[Automod Module Ignore] Edit Reply Failed:', e);
                            throw e;
                        });
					} catch (error) {
						console.error('[Automod Module Ignore] Error:', error);
						await interaction.followUp({ content: '❌ Failed to load module ignore page. Please check bot logs.', ephemeral: true }).catch(() => {});
					}
					return;
				}

				if (customId.startsWith('automod_ignore_module_') && interaction.isStringSelectMenu()) {
					const moduleName = customId.replace('automod_ignore_module_', '');
					const action = interaction.values[0];

					if (action === 'add_channel') {
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`📝 **ADD IGNORED CHANNEL** (${MODULES[moduleName].name})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a channel to ignore for this module`));
						const channelSelect = new ChannelSelectMenuBuilder()
							.setCustomId(`automod_ignore_add_channel_${moduleName}`)
							.setPlaceholder('Select channel...')
							.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
						container.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(
							new ButtonBuilder().setCustomId('automod_ignore_per_module_select').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)

						));

						const backButton = new ButtonBuilder()
							.setCustomId(`automod_view_module_ignore_${moduleName}`)
							.setLabel('Back')
							.setEmoji('◀️')
							.setStyle(ButtonStyle.Secondary);

						container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`📝 **ADD IGNORED CHANNEL** (${MODULES[moduleName].name})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a channel to ignore for this module`));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(backButton));

						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'add_role') {
						const backButton = new ButtonBuilder()
							.setCustomId(`automod_view_module_ignore_${moduleName}`)
							.setLabel('Back')
							.setEmoji('◀️')
							.setStyle(ButtonStyle.Secondary);
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`🎭 **ADD IGNORED ROLE** (${MODULES[moduleName].name})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a role to ignore for this module`));
						const roleSelect = new RoleSelectMenuBuilder()
							.setCustomId(`automod_ignore_add_role_${moduleName}`)
							.setPlaceholder('Select role...');
						container.addActionRowComponents(new ActionRowBuilder().addComponents(roleSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(backButton));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'add_user') {
						const backButton = new ButtonBuilder()
							.setCustomId(`automod_view_module_ignore_${moduleName}`)
							.setLabel('Back')
							.setEmoji('◀️')
							.setStyle(ButtonStyle.Secondary);
						const container = new ContainerBuilder();
						container.addTextDisplayComponents(td => td.setContent(`👤 **ADD IGNORED USER** (${MODULES[moduleName].name})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect a user to ignore for this module`));
						const userSelect = new UserSelectMenuBuilder()
							.setCustomId(`automod_ignore_add_user_${moduleName}`)
							.setPlaceholder('Select user...');
						container.addActionRowComponents(new ActionRowBuilder().addComponents(userSelect));
						container.addActionRowComponents(new ActionRowBuilder().addComponents(backButton));
						await interaction.update({ components: [container] }).catch(() => {});
						return;
					}

					if (action === 'clear') {
						await interaction.deferUpdate().catch(() => {});
						if (config.modules[moduleName]) {
							config.modules[moduleName].ignore = { channels: [], roles: [], users: [] };
							await saveConfig();
						}
						await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(() => {});
						await interaction.followUp({ content: `✅ All ignore rules cleared for **${MODULES[moduleName].name}**.`, ephemeral: true }).catch(() => {});
						return;
					}
				}

				if (customId.startsWith('automod_view_module_ignore_')) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = customId.replace('automod_view_module_ignore_', '');
					await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_ignore_add_channel_') && interaction.isChannelSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = customId.replace('automod_ignore_add_channel_', '');
					const channelId = interaction.values[0];
					if (!config.modules[moduleName]) {
						config.modules[moduleName] = { enabled: false, punishments: [], strikes: 0, threshold: 1, ignore: { channels: [], roles: [] } };
					}
					if (!config.modules[moduleName].ignore) config.modules[moduleName].ignore = { channels: [], roles: [] };
					if (!config.modules[moduleName].ignore.channels.includes(channelId)) {
						config.modules[moduleName].ignore.channels.push(channelId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_ignore_add_role_') && interaction.isRoleSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = customId.replace('automod_ignore_add_role_', '');
					const roleId = interaction.values[0];
					if (!config.modules[moduleName]) {
						config.modules[moduleName] = { enabled: false, punishments: [], strikes: 0, threshold: 1, ignore: { channels: [], roles: [] } };
					}
					if (!config.modules[moduleName].ignore) config.modules[moduleName].ignore = { channels: [], roles: [] };
					if (!config.modules[moduleName].ignore.roles.includes(roleId)) {
						config.modules[moduleName].ignore.roles.push(roleId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_ignore_add_user_') && interaction.isUserSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const moduleName = customId.replace('automod_ignore_add_user_', '');
					const userId = interaction.values[0];
					if (!config.modules[moduleName]) {
						config.modules[moduleName] = { enabled: false, punishments: [], strikes: 0, threshold: 1, ignore: { channels: [], roles: [] } };
					}
					if (!config.modules[moduleName].ignore) config.modules[moduleName].ignore = { channels: [], roles: [] };

					if (!config.modules[moduleName].ignore.users) config.modules[moduleName].ignore.users = [];

					if (!config.modules[moduleName].ignore.users.includes(userId)) {
						config.modules[moduleName].ignore.users.push(userId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildModuleIgnorePage(config, moduleName)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_ignore_add_channel' && interaction.isChannelSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const channelId = interaction.values[0];
					if (!config.ignore) config.ignore = { channels: [], roles: [], users: [] };
					if (!config.ignore.channels.includes(channelId)) {
						config.ignore.channels.push(channelId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildIgnorePage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_ignore_add_role' && interaction.isRoleSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const roleId = interaction.values[0];
					if (!config.ignore) config.ignore = { channels: [], roles: [], users: [] };
					if (!config.ignore.roles.includes(roleId)) {
						config.ignore.roles.push(roleId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildIgnorePage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_ignore_add_user' && interaction.isUserSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const userId = interaction.values[0];
					if (!config.ignore) config.ignore = { channels: [], roles: [], users: [] };
					if (!config.ignore.users.includes(userId)) {
						config.ignore.users.push(userId);
						await saveConfig();
					}
					await interaction.editReply({ components: [buildIgnorePage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_page_words') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildWordsPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_words_add') {
					const modal = new ModalBuilder()
						.setCustomId('automod_words_add_modal')
						.setTitle('Add Bad Words');
					const input = new TextInputBuilder()
						.setCustomId('word')
						.setLabel('Words (comma separated)')
						.setStyle(TextInputStyle.Paragraph)
						.setPlaceholder('badword1, badword2, another phrase...')
						.setRequired(true)
						.setMaxLength(1000);
					modal.addComponents(new ActionRowBuilder().addComponents(input));
					await interaction.showModal(modal).catch(() => {});
					return;
				}

				if (customId === 'automod_words_bulk_remove') {
					const modal = new ModalBuilder()
						.setCustomId('automod_words_bulk_remove_modal')
						.setTitle('Bulk Remove Bad Words');
					const input = new TextInputBuilder()
						.setCustomId('words')
						.setLabel('Words to remove (comma separated)')
						.setStyle(TextInputStyle.Paragraph)
						.setPlaceholder('badword1, badword2...')
						.setRequired(true)
						.setMaxLength(1000);
					modal.addComponents(new ActionRowBuilder().addComponents(input));
					await interaction.showModal(modal).catch(() => {});
					return;
				}

				if (customId === 'automod_words_remove') {
					const words = config.modules?.badwords?.words || [];
					if (words.length === 0) {
						await interaction.reply({ content: '❌ No words to remove.', ephemeral: true }).catch(() => {});
						return;
					}
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`➖ **REMOVE BAD WORD**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect words to remove`));
					const wordSelect = new StringSelectMenuBuilder()
						.setCustomId('automod_words_remove_select')
						.setPlaceholder('Select words to remove...')
						.setMinValues(1)
						.setMaxValues(Math.min(words.length, 25))
						.addOptions(words.slice(0, 25).map((w, i) => ({ label: w.length > 25 ? w.substring(0, 22) + '...' : w, value: String(i) })));
					container.addActionRowComponents(new ActionRowBuilder().addComponents(wordSelect));
					container.addActionRowComponents(new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('automod_page_words').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
					));
					await interaction.update({ components: [container] }).catch(() => {});
					return;
				}

				if (customId === 'automod_words_remove_select' && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const indices = interaction.values.map(v => parseInt(v)).sort((a, b) => b - a);
					if (!config.modules.badwords) config.modules.badwords = { enabled: false, punishments: ['delete'], words: [], ignore: { channels: [], roles: [] } };
					for (const idx of indices) {
						config.modules.badwords.words.splice(idx, 1);
					}
					await saveConfig();
					await interaction.editReply({ components: [buildWordsPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_words_clear') {
					await interaction.deferUpdate().catch(() => {});
					if (!config.modules.badwords) config.modules.badwords = { enabled: false, punishments: ['delete'], words: [], ignore: { channels: [], roles: [] } };
					config.modules.badwords.words = [];
					await saveConfig();
					await interaction.editReply({ components: [buildWordsPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_page_strikes') {
					await interaction.deferUpdate().catch(() => {});
					await interaction.editReply({ components: [buildStrikesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_strike_threshold' && interaction.isStringSelectMenu()) {
					const value = interaction.values[0];
					if (value === 'expiry') {
						const modal = new ModalBuilder()
							.setCustomId('automod_strike_expiry_modal')
							.setTitle('Set Strike Expiry');
						const input = new TextInputBuilder()
							.setCustomId('hours')
							.setLabel('Expiry time in hours')
							.setStyle(TextInputStyle.Short)
							.setPlaceholder('24')
							.setRequired(true)
							.setMaxLength(4);
						modal.addComponents(new ActionRowBuilder().addComponents(input));
						await interaction.showModal(modal).catch(() => {});
						return;
					}
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`⚠️ **SET ACTION FOR ${value} STRIKES**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect action when user reaches ${value} strikes`));
					const actionSelect = new StringSelectMenuBuilder()
						.setCustomId(`automod_strike_action_${value}`)
						.setPlaceholder('Select action...')
						.addOptions([
							{ label: 'Mute 10 minutes', value: 'mute:10m' },
							{ label: 'Mute 1 hour', value: 'mute:1h' },
							{ label: 'Mute 24 hours', value: 'mute:24h' },
							{ label: 'Kick', value: 'kick' },
							{ label: 'Ban', value: 'ban' },
							{ label: 'Remove this threshold', value: 'remove' }
						]);
					container.addActionRowComponents(new ActionRowBuilder().addComponents(actionSelect));
					container.addActionRowComponents(new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('automod_page_strikes').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
					));
					await interaction.update({ components: [container] }).catch(() => {});
					return;
				}

				if (customId.startsWith('automod_strike_action_') && interaction.isStringSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					const threshold = customId.replace('automod_strike_action_', '');
					const action = interaction.values[0];
					if (!config.strikeActions) config.strikeActions = {};
					if (action === 'remove') {
						delete config.strikeActions[threshold];
					} else if (action.startsWith('mute:')) {
						config.strikeActions[threshold] = { action: 'mute', duration: action.split(':')[1] };
					} else {
						config.strikeActions[threshold] = { action };
					}
					await saveConfig();
					await interaction.editReply({ components: [buildStrikesPage(config)] }).catch(() => {});
					return;
				}

				if (customId === 'automod_strikes_toggle') {
					await interaction.deferUpdate().catch(() => {});
					config.strikesEnabled = config.strikesEnabled === false ? true : false;
					await saveConfig();
					await interaction.editReply({ components: [buildStrikesPage(config)] }).catch(() => {});
					await interaction.followUp({ content: `✅ Strike system ${config.strikesEnabled ? 'enabled' : 'disabled'}.`, ephemeral: true }).catch(() => {});
					return;
				}

				if (customId === 'automod_logchannel') {
					const container = new ContainerBuilder();
					container.addTextDisplayComponents(td => td.setContent(`📋 **SET LOG CHANNEL**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelect where automod violations are logged`));
					const channelSelect = new ChannelSelectMenuBuilder()
						.setCustomId('automod_logchannel_select')
						.setPlaceholder('Select log channel...')
						.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
					container.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));
					container.addActionRowComponents(new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('automod_back_main').setLabel('Back').setEmoji('◀️').setStyle(ButtonStyle.Secondary)
					));
					await interaction.update({ components: [container] }).catch(() => {});
					return;
				}

				if (customId === 'automod_logchannel_select' && interaction.isChannelSelectMenu()) {
					await interaction.deferUpdate().catch(() => {});
					config.logChannel = interaction.values[0];
					await saveConfig();
					await interaction.editReply({ components: [buildWizardContainer(config)] }).catch(() => {});
					return;
				}

			} catch (error) {
				console.error('[Automod Button Handler] Error:', error);
				try {
					await interaction.reply({ content: '❌ An error occurred: ' + error.message, ephemeral: true }).catch(() => {});
				} catch (e) {}
			}
		}

		if (interaction.customId.startsWith('avatar_server_')) {
			try {
				const userId = interaction.customId.replace('avatar_server_', '');
				const member = interaction.guild?.members.cache.get(userId);

				if (!member || !member.avatar) {
					await interaction.reply({ content: '❌ This user no longer has a server avatar.', ephemeral: true });
					return;
				}

				const serverAvatarUrl = member.displayAvatarURL({ size: 4096, extension: 'png' });

				const { ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# **${member.user.tag ?? member.user.username}'s Server Avatar**`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const gallery = new MediaGalleryBuilder().addItems(item =>
					item.setURL(serverAvatarUrl).setDescription('Server avatar')
				);
				container.addMediaGalleryComponents(() => gallery);

				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setLabel('JPG')
							.setStyle(ButtonStyle.Link)
							.setURL(member.displayAvatarURL({ size: 4096, extension: 'jpg' })),
						new ButtonBuilder()
							.setLabel('PNG')
							.setStyle(ButtonStyle.Link)
							.setURL(member.displayAvatarURL({ size: 4096, extension: 'png' })),
						new ButtonBuilder()
							.setLabel('WebP')
							.setStyle(ButtonStyle.Link)
							.setURL(member.displayAvatarURL({ size: 4096, extension: 'webp' }))
					);
					return row;
				});

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setCustomId(`avatar_global_${userId}`)
							.setLabel('Global Avatar')
							.setStyle(ButtonStyle.Secondary)
							.setEmoji('🌐')
					);
					return row;
				});

				await interaction.update({
					components: [container],
					flags: MessageFlags.IsComponentsV2
				});
				return;
			} catch (error) {
				console.error('[Avatar Server Button] Error:', error);
				await interaction.reply({ content: '❌ Failed to load server avatar.', ephemeral: true }).catch(() => {});
				return;
			}
		}

		if (interaction.customId.startsWith('avatar_global_')) {
			try {
				const userId = interaction.customId.replace('avatar_global_', '');
				const user = await client.users.fetch(userId, { force: true });
				const member = interaction.guild?.members.cache.get(userId);
				const hasServerAvatar = member?.avatar ? true : false;

				if (!user) {
					await interaction.reply({ content: '❌ User not found.', ephemeral: true });
					return;
				}

				const avatarUrl = user.displayAvatarURL({ size: 4096, extension: 'png' });

				const { ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# **${user.tag ?? user.username}'s Avatar**`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const gallery = new MediaGalleryBuilder().addItems(item =>
					item.setURL(avatarUrl).setDescription('Global avatar')
				);
				container.addMediaGalleryComponents(() => gallery);

				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setLabel('JPG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ size: 4096, extension: 'jpg' })),
						new ButtonBuilder()
							.setLabel('PNG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ size: 4096, extension: 'png' })),
						new ButtonBuilder()
							.setLabel('WebP')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ size: 4096, extension: 'webp' }))
					);
					return row;
				});

				if (hasServerAvatar) {
					container.addActionRowComponents(row => {
						row.setComponents(
							new ButtonBuilder()
								.setCustomId(`avatar_server_${userId}`)
								.setLabel('Server Avatar')
								.setStyle(ButtonStyle.Primary)
								.setEmoji('🖼️')
						);
						return row;
					});
				}

				await interaction.update({
					components: [container],
					flags: MessageFlags.IsComponentsV2
				});
				return;
			} catch (error) {
				console.error('[Avatar Global Button] Error:', error);
				await interaction.reply({ content: '❌ Failed to load global avatar.', ephemeral: true }).catch(() => {});
				return;
			}
		}

		if (interaction.customId.startsWith('banner_server_')) {
			try {
				const userId = interaction.customId.replace('banner_server_', '');
				const member = interaction.guild?.members.cache.get(userId);

				if (!member || !member.banner) {
					await interaction.reply({ content: '❌ This user no longer has a server banner.', ephemeral: true });
					return;
				}

				const serverBannerUrl = member.bannerURL({ size: 4096, extension: 'png' });

				const { ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# **${member.user.tag ?? member.user.username}'s Server Banner**`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const gallery = new MediaGalleryBuilder().addItems(item =>
					item.setURL(serverBannerUrl).setDescription('Server banner')
				);
				container.addMediaGalleryComponents(() => gallery);

				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setLabel('JPG')
							.setStyle(ButtonStyle.Link)
							.setURL(member.bannerURL({ size: 4096, extension: 'jpg' })),
						new ButtonBuilder()
							.setLabel('PNG')
							.setStyle(ButtonStyle.Link)
							.setURL(member.bannerURL({ size: 4096, extension: 'png' })),
						new ButtonBuilder()
							.setLabel('WebP')
							.setStyle(ButtonStyle.Link)
							.setURL(member.bannerURL({ size: 4096, extension: 'webp' }))
					);
					return row;
				});

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setCustomId(`banner_global_${userId}`)
							.setLabel('Global Banner')
							.setStyle(ButtonStyle.Secondary)
							.setEmoji('🌐')
					);
					return row;
				});

				await interaction.update({
					components: [container],
					flags: MessageFlags.IsComponentsV2
				});
				return;
			} catch (error) {
				console.error('[Banner Server Button] Error:', error);
				await interaction.reply({ content: '❌ Failed to load server banner.', ephemeral: true }).catch(() => {});
				return;
			}
		}

		if (interaction.customId.startsWith('banner_global_')) {
			try {
				const userId = interaction.customId.replace('banner_global_', '');
				const user = await client.users.fetch(userId, { force: true });
				const member = interaction.guild?.members.cache.get(userId);
				const hasServerBanner = member?.banner ? true : false;

				if (!user || !user.banner) {
					await interaction.reply({ content: '❌ User no longer has a banner.', ephemeral: true });
					return;
				}

				const bannerUrl = user.bannerURL({ size: 4096, extension: 'png' });

				const { ContainerBuilder, SeparatorSpacingSize, MediaGalleryBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# **${user.tag ?? user.username}'s Banner**`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const gallery = new MediaGalleryBuilder().addItems(item =>
					item.setURL(bannerUrl).setDescription('Global banner')
				);
				container.addMediaGalleryComponents(() => gallery);

				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				container.addActionRowComponents(row => {
					row.setComponents(
						new ButtonBuilder()
							.setLabel('JPG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.bannerURL({ size: 4096, extension: 'jpg' })),
						new ButtonBuilder()
							.setLabel('PNG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.bannerURL({ size: 4096, extension: 'png' })),
						new ButtonBuilder()
							.setLabel('WebP')
							.setStyle(ButtonStyle.Link)
							.setURL(user.bannerURL({ size: 4096, extension: 'webp' }))
					);
					return row;
				});

				if (hasServerBanner) {
					container.addActionRowComponents(row => {
						row.setComponents(
							new ButtonBuilder()
								.setCustomId(`banner_server_${userId}`)
								.setLabel('Server Banner')
								.setStyle(ButtonStyle.Primary)
								.setEmoji('🖼️')
						);
						return row;
					});
				}

				await interaction.update({
					components: [container],
					flags: MessageFlags.IsComponentsV2
				});
				return;
			} catch (error) {
				console.error('[Banner Global Button] Error:', error);
				await interaction.reply({ content: '❌ Failed to load global banner.', ephemeral: true }).catch(() => {});
				return;
			}
		}

		const rebuildBirthdayWizard = (config) => {
			const statusEmoji = config.enabled ? (EMOJIS.success || '✅') : (EMOJIS.error || '❌');
			const statusText = config.enabled ? 'Enabled' : 'Disabled';
			const cmdChannel = config.commandChannel ? `<#${config.commandChannel}>` : '`Not Set`';
			const wishChannel = config.wishChannel ? `<#${config.wishChannel}>` : '`Not Set`';
			const tz = config.timezone || 'GMT';
			const bdayRole = config.birthdayRole ? `<@&${config.birthdayRole}>` : '`Not Set`';

			const container = new ContainerBuilder();
			container.addTextDisplayComponents(td => td.setContent(`# 🎂 Birthday System Setup`));
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			container.addTextDisplayComponents(td => td.setContent(
				`**Status:** ${statusEmoji} ${statusText}\n` +
				`**Command Channel:** ${cmdChannel}\n` +
				`**Wish Channel:** ${wishChannel}\n` +
				`**Birthday Role:** ${bdayRole} (24h)\n` +
				`**Timezone:** \`${tz}\``
			));

			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

			const toggleBtn = new ButtonBuilder()
				.setCustomId('birthday_toggle')
				.setLabel(config.enabled ? 'Disable' : 'Enable')
				.setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success);
			const cmdChBtn = new ButtonBuilder().setCustomId('birthday_cmd_channel').setLabel('Command Channel').setStyle(ButtonStyle.Secondary);
			const wishChBtn = new ButtonBuilder().setCustomId('birthday_wish_channel').setLabel('Wish Channel').setStyle(ButtonStyle.Secondary);
			container.addActionRowComponents(row => row.addComponents(toggleBtn, cmdChBtn, wishChBtn));

			const tzBtn = new ButtonBuilder().setCustomId('birthday_timezone').setLabel('Timezone').setStyle(ButtonStyle.Secondary);
			const roleBtn = new ButtonBuilder().setCustomId('birthday_role').setLabel('Birthday Role').setStyle(ButtonStyle.Secondary);
			const customizeBtn = new ButtonBuilder().setCustomId('birthday_customize').setLabel('Customize').setStyle(ButtonStyle.Primary);
			const previewBtn = new ButtonBuilder().setCustomId('birthday_preview').setLabel('Preview').setStyle(ButtonStyle.Success);
			container.addActionRowComponents(row => row.addComponents(tzBtn, roleBtn, customizeBtn, previewBtn));

			return container;
		};

		if (interaction.customId === 'birthday_toggle') {
			try {
				await interaction.deferUpdate();
				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || { enabled: false, commandChannel: null, wishChannel: null, timezone: 'GMT', wishMessage: { content: 'Happy Birthday {user}! ❤️' } };

				config.enabled = !config.enabled;
				await client.db.updateOne({ guildId }, { $set: { birthday_config: config } }, { upsert: true });

				const container = rebuildBirthdayWizard(config);
				await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
			} catch (err) {
				console.error('[Birthday Toggle]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_cmd_channel') {
			try {
				const { ChannelSelectMenuBuilder } = await import('discord.js');
				const menu = new ChannelSelectMenuBuilder()
					.setCustomId('birthday_cmd_channel_select')
					.setPlaceholder('Select command channel')
					.setChannelTypes(ChannelType.GuildText);
				const row = new ActionRowBuilder().addComponents(menu);
				await interaction.reply({ content: 'Select the channel where `.birthday` commands will work:', components: [row], ephemeral: true });
			} catch (err) {
				console.error('[Birthday Cmd Channel]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_cmd_channel_select') {
			try {
				const channelId = interaction.values[0];
				await client.db.updateOne({ guildId }, { $set: { 'birthday_config.commandChannel': channelId } }, { upsert: true });
				await interaction.update({ content: `✅ Command channel set to <#${channelId}>`, components: [] });

				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const container = rebuildBirthdayWizard(config);
				await interaction.message?.reference?.messageId && interaction.channel.messages.edit(interaction.message.reference.messageId, { components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Birthday Cmd Select]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_wish_channel') {
			try {
				const { ChannelSelectMenuBuilder } = await import('discord.js');
				const menu = new ChannelSelectMenuBuilder()
					.setCustomId('birthday_wish_channel_select')
					.setPlaceholder('Select wish channel')
					.setChannelTypes(ChannelType.GuildText);
				const row = new ActionRowBuilder().addComponents(menu);
				await interaction.reply({ content: 'Select the channel where birthday wishes will be sent:', components: [row], ephemeral: true });
			} catch (err) {
				console.error('[Birthday Wish Channel]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_wish_channel_select') {
			try {
				const channelId = interaction.values[0];
				await client.db.updateOne({ guildId }, { $set: { 'birthday_config.wishChannel': channelId } }, { upsert: true });
				await interaction.update({ content: `✅ Wish channel set to <#${channelId}>`, components: [] });

				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const container = rebuildBirthdayWizard(config);
				await interaction.message?.reference?.messageId && interaction.channel.messages.edit(interaction.message.reference.messageId, { components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Birthday Wish Select]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_timezone') {
			try {
				const TIMEZONES = [
					{ label: 'UTC', value: 'UTC' },
					{ label: 'India (IST)', value: 'Asia/Kolkata' },
					{ label: 'US Eastern', value: 'America/New_York' },
					{ label: 'US Pacific', value: 'America/Los_Angeles' },
					{ label: 'UK (GMT/BST)', value: 'Europe/London' },
					{ label: 'Central Europe', value: 'Europe/Berlin' },
					{ label: 'Japan (JST)', value: 'Asia/Tokyo' },
					{ label: 'Australia Eastern', value: 'Australia/Sydney' },
					{ label: 'Dubai (GST)', value: 'Asia/Dubai' },
					{ label: 'Singapore (SGT)', value: 'Asia/Singapore' }
				];
				const menu = new StringSelectMenuBuilder()
					.setCustomId('birthday_timezone_select')
					.setPlaceholder('Select timezone')
					.addOptions(TIMEZONES);
				const row = new ActionRowBuilder().addComponents(menu);
				await interaction.reply({ content: 'Select your server\'s timezone for midnight birthday wishes:', components: [row], ephemeral: true });
			} catch (err) {
				console.error('[Birthday Timezone]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_timezone_select') {
			try {
				const tz = interaction.values[0];
				await client.db.updateOne({ guildId }, { $set: { 'birthday_config.timezone': tz } }, { upsert: true });
				await interaction.update({ content: `✅ Timezone set to \`${tz}\``, components: [] });

				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const container = rebuildBirthdayWizard(config);
				await interaction.message?.reference?.messageId && interaction.channel.messages.edit(interaction.message.reference.messageId, { components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Birthday TZ Select]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_role') {
			try {
				const { RoleSelectMenuBuilder } = await import('discord.js');
				const menu = new RoleSelectMenuBuilder()
					.setCustomId('birthday_role_select')
					.setPlaceholder('Select birthday role (given for 24h)');
				const row = new ActionRowBuilder().addComponents(menu);
				await interaction.reply({ content: 'Select the role to give on birthdays (automatically removed after 24 hours):', components: [row], ephemeral: true });
			} catch (err) {
				console.error('[Birthday Role]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_role_select') {
			try {
				const roleId = interaction.values[0];
				await client.db.updateOne({ guildId }, { $set: { 'birthday_config.birthdayRole': roleId } }, { upsert: true });
				await interaction.update({ content: `✅ Birthday role set to <@&${roleId}>. It will be given for 24 hours.`, components: [] });

				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const container = rebuildBirthdayWizard(config);
				await interaction.message?.reference?.messageId && interaction.channel.messages.edit(interaction.message.reference.messageId, { components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
			} catch (err) {
				console.error('[Birthday Role Select]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_customize') {
			try {
				const menu = new StringSelectMenuBuilder()
					.setCustomId('birthday_customize_menu')
					.setPlaceholder('What would you like to customize?')
					.addOptions([
						{ label: '📝 Message Content', value: 'message', description: 'Content, title, description, footer' },
						{ label: '🎨 Appearance', value: 'appearance', description: 'Thumbnail, image, accent color' }
					]);
				const row = new ActionRowBuilder().addComponents(menu);
				await interaction.reply({ content: '**Select what to customize:**', components: [row], ephemeral: true });
			} catch (err) {
				console.error('[Birthday Customize]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_customize_menu') {
			try {
				const choice = interaction.values[0];
				const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const msg = config.wishMessage || {};

				if (choice === 'message') {
					const modal = new ModalBuilder()
						.setCustomId('birthday_wish_modal')
						.setTitle('Message Content');

					const contentInput = new TextInputBuilder()
						.setCustomId('content')
						.setLabel('Content (text outside component)')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.content || 'Happy Birthday {user}! ❤️')
						.setPlaceholder('{user} {username} {servername} {timestamp}')
						.setRequired(false);

					const titleInput = new TextInputBuilder()
						.setCustomId('title')
						.setLabel('Title')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.title || '🎂 Happy Birthday!')
						.setRequired(false);

					const descInput = new TextInputBuilder()
						.setCustomId('description')
						.setLabel('Description')
						.setStyle(TextInputStyle.Paragraph)
						.setValue(msg.description || '')
						.setPlaceholder('{user} {username} {timestamp}')
						.setRequired(false);

					const footerInput = new TextInputBuilder()
						.setCustomId('footer')
						.setLabel('Footer')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.footer || '')
						.setPlaceholder('{servername} | {timestamp}')
						.setRequired(false);

					modal.addComponents(
						new ActionRowBuilder().addComponents(contentInput),
						new ActionRowBuilder().addComponents(titleInput),
						new ActionRowBuilder().addComponents(descInput),
						new ActionRowBuilder().addComponents(footerInput)
					);

					await interaction.showModal(modal);
				} else if (choice === 'appearance') {
					const modal = new ModalBuilder()
						.setCustomId('birthday_appearance_modal')
						.setTitle('Appearance Settings');

					const thumbInput = new TextInputBuilder()
						.setCustomId('thumbnail')
						.setLabel('Thumbnail ("avatar" or URL)')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.thumbnail || 'avatar')
						.setRequired(false);

					const imageInput = new TextInputBuilder()
						.setCustomId('image')
						.setLabel('Large Image (URL or leave empty)')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.image || '')
						.setPlaceholder('https://example.com/celebration.gif')
						.setRequired(false);

					const colorInput = new TextInputBuilder()
						.setCustomId('accentColor')
						.setLabel('Accent Color (hex like #FFD700 or "none")')
						.setStyle(TextInputStyle.Short)
						.setValue(msg.accentColor || '')
						.setPlaceholder('#FFD700 for gold, #FF69B4 for pink')
						.setRequired(false);

					modal.addComponents(
						new ActionRowBuilder().addComponents(thumbInput),
						new ActionRowBuilder().addComponents(imageInput),
						new ActionRowBuilder().addComponents(colorInput)
					);

					await interaction.showModal(modal);
				}
			} catch (err) {
				console.error('[Birthday Customize Menu]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_advanced') {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const msg = config.wishMessage || {};

				const modal = new ModalBuilder()
					.setCustomId('birthday_advanced_modal')
					.setTitle('Image & Color Settings');

				const imageInput = new TextInputBuilder()
					.setCustomId('image')
					.setLabel('Celebration Image (URL)')
					.setStyle(TextInputStyle.Short)
					.setValue(msg.image || '')
					.setPlaceholder('https://example.com/birthday.gif or leave empty')
					.setRequired(false);

				const colorInput = new TextInputBuilder()
					.setCustomId('accentColor')
					.setLabel('Accent Color (hex like #FFD700 or "none")')
					.setStyle(TextInputStyle.Short)
					.setValue(msg.accentColor || '')
					.setPlaceholder('#FFD700 for gold, #FF69B4 for pink, or "none"')
					.setRequired(false);

				modal.addComponents(
					new ActionRowBuilder().addComponents(imageInput),
					new ActionRowBuilder().addComponents(colorInput)
				);

				await interaction.showModal(modal);
			} catch (err) {
				console.error('[Birthday Advanced]', err);
			}
			return;
		}

		if (interaction.customId === 'birthday_preview') {
		try {
				const guildData = await client.db.findOne({ guildId }) || {};
				const config = guildData.birthday_config || {};
				const msg = config.wishMessage || { content: 'Happy Birthday {user}! ❤️', title: '🎂 Happy Birthday!' };

				const context = {
					userMention: `<@${interaction.user.id}>`,
					username: interaction.user.username,
					avatar: interaction.user.displayAvatarURL({ size: 512 }),
					serverName: interaction.guild.name,
					serverAvatar: interaction.guild.iconURL({ size: 512 }) || ''
				};

				const replaceVars = (text) => {
					if (!text) return text;
					return text
						.replace(/{user}/g, context.userMention)
						.replace(/{username}/g, context.username)
						.replace(/{avatar}/g, context.avatar)
						.replace(/{servername}/g, context.serverName)
						.replace(/{serveravatar}/g, context.serverAvatar)
						.replace(/{timestamp}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`);
				};

				const { TextDisplayBuilder, MediaGalleryBuilder } = await import('discord.js');

				const components = [];

				const contentText = replaceVars(msg.content);
				if (contentText) {
					components.push(new TextDisplayBuilder().setContent(contentText));
				}

				const container = new ContainerBuilder();

				if (msg.accentColor && msg.accentColor !== 'none') {
					const colorInt = parseInt(msg.accentColor.replace('#', ''), 16);
					if (!isNaN(colorInt)) {
						container.setAccentColor(colorInt);
					}
				}

				let thumbUrl = null;
				if (msg.thumbnail) {
					thumbUrl = msg.thumbnail === 'avatar' ? context.avatar : replaceVars(msg.thumbnail);
				}

				if (msg.title) {
					container.addTextDisplayComponents(td => td.setContent(`**${replaceVars(msg.title)}**`));
				}

				if (msg.title && (msg.description || thumbUrl)) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				}

				if (msg.description || thumbUrl) {
					container.addSectionComponents(section => {
						const descText = msg.description ? replaceVars(msg.description) : '\u200b';
						section.addTextDisplayComponents(td => td.setContent(descText));
						if (thumbUrl) {
							section.setThumbnailAccessory(thumb => thumb.setURL(thumbUrl));
						}
						return section;
					});
				}

				if (msg.image && (msg.description || thumbUrl)) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				}

				if (msg.image) {
					const gallery = new MediaGalleryBuilder().addItems(item =>
						item.setURL(replaceVars(msg.image))
					);
					container.addMediaGalleryComponents(gallery);
				}

				if (msg.footer) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					container.addTextDisplayComponents(td => td.setContent(`-# ${replaceVars(msg.footer)}`));
				}

				components.push(container);

				await interaction.reply({
					components,
					flags: MessageFlags.IsComponentsV2,
					ephemeral: true
				});
			} catch (err) {
				console.error('[Birthday Preview]', err);
				await interaction.reply({ content: '❌ Failed to generate preview.', ephemeral: true }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('birthday_upcoming_')) {
			try {
				const page = parseInt(interaction.customId.split('_')[2], 10);
				if (isNaN(page)) return;

				await interaction.deferUpdate();
				const guildData = await client.db.findOne({ guildId }) || {};
				const birthdays = guildData.birthdays || {};

				const now = new Date();
				const upcoming = [];
				for (const [userId, bday] of Object.entries(birthdays)) {
					const thisYear = now.getFullYear();
					const bdayDate = new Date(thisYear, bday.month - 1, bday.day);
					if (bdayDate < now) bdayDate.setFullYear(thisYear + 1);
					const daysUntil = Math.ceil((bdayDate - now) / (1000 * 60 * 60 * 24));
					if (daysUntil <= 30) {
						upcoming.push({ userId, day: bday.day, month: bday.month, daysUntil });
					}
				}
				upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

				const perPage = 10;
				const totalPages = Math.ceil(upcoming.length / perPage);
				const safePage = Math.max(1, Math.min(page, totalPages));
				const start = (safePage - 1) * perPage;
				const pageItems = upcoming.slice(start, start + perPage);

				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				const list = pageItems.map((item, i) => {
					const num = start + i + 1;
					const daysText = item.daysUntil === 0 ? '**Today!**' : item.daysUntil === 1 ? 'Tomorrow' : `in ${item.daysUntil} days`;
					return `${num}. <@${item.userId}> - ${item.day} ${monthNames[item.month - 1]} (${daysText})`;
				}).join('\n');

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`🎂 **Upcoming Birthdays** (Page ${safePage}/${totalPages})`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(list || 'No birthdays found.'));

				const prevBtn = new ButtonBuilder()
					.setCustomId(`birthday_upcoming_${safePage - 1}`)
					.setLabel('◀ Prev')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(safePage <= 1);
				const nextBtn = new ButtonBuilder()
					.setCustomId(`birthday_upcoming_${safePage + 1}`)
					.setLabel('Next ▶')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(safePage >= totalPages);
				const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

				await interaction.editReply({ components: [container, row], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
			} catch (err) {
				console.error('[Birthday Pagination]', err);
			}
			return;
		}

		if (interaction.customId.startsWith('afk_mentions_') && interaction.customId !== 'afk_mentions_page') {
			try {
				const page = parseInt(interaction.customId.split('_')[2], 10);
				if (isNaN(page)) return;

				await interaction.deferUpdate();
				const userId = interaction.user.id;
				const guildData = await client.db.findOne({ guildId }) || {};
				const afkUsers = guildData.afkUsers || {};

				const myAfk = afkUsers[userId];
				const currentMentions = myAfk?.mentions || [];

				const storedData = guildData.afkMentionsHistory?.[userId];
				let storedMentions = [];
				if (storedData) {
					const thirtyMinutes = 30 * 60 * 1000;
					if (Date.now() - (storedData.storedAt || 0) < thirtyMinutes) {
						storedMentions = storedData.mentions || [];
					}
				}

				const allMentions = [...currentMentions, ...storedMentions].sort((a, b) => b.timestamp - a.timestamp);

				const { ButtonBuilder: BB, ButtonStyle: BS } = await import('discord.js');
				const perPage = 5;
				const totalPages = Math.ceil(allMentions.length / perPage) || 1;
				const safePage = Math.max(1, Math.min(page, totalPages));
				const start = (safePage - 1) * perPage;
				const pageItems = allMentions.slice(start, start + perPage);

				const formatDuration = (ms) => {
					const seconds = Math.floor(ms / 1000);
					const minutes = Math.floor(seconds / 60);
					const hours = Math.floor(minutes / 60);
					const days = Math.floor(hours / 24);
					if (days > 0) return `${days}d ${hours % 24}h`;
					if (hours > 0) return `${hours}h ${minutes % 60}m`;
					if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
					return `${seconds}s`;
				};

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.afk || '💤'} AFK Mentions`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				pageItems.forEach((m, i) => {
					const time = formatDuration(Date.now() - m.timestamp);
					let content = `${start + i + 1}. <@${m.userId}> in <#${m.channelId}> (${time} ago)`;
					if (m.messageUrl) {
						content += `\n-# [Go to Message](${m.messageUrl})`;
					}
					container.addTextDisplayComponents(td => td.setContent(content));
					if (i < pageItems.length - 1) {
						container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(false));
					}
				});

				if (totalPages > 1) {
					container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
					const prevBtn = new BB().setCustomId(`afk_mentions_${safePage - 1}`).setLabel('◀ Prev').setStyle(BS.Secondary).setDisabled(safePage <= 1);
					const pageBtn = new BB().setCustomId('afk_mentions_page').setLabel(`${safePage}/${totalPages}`).setStyle(BS.Secondary).setDisabled(true);
					const nextBtn = new BB().setCustomId(`afk_mentions_${safePage + 1}`).setLabel('Next ▶').setStyle(BS.Secondary).setDisabled(safePage >= totalPages);
					container.addActionRowComponents(row => row.addComponents(prevBtn, pageBtn, nextBtn));
				}

				await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
			} catch (err) {
				console.error('[AFK Mentions Pagination]', err);
			}
			return;
		}

		if (interaction.customId.startsWith('embed_title_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_title_modal').setTitle('Set Embed Title');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title (max 256 chars)').setStyle(TextInputStyle.Short).setValue(session.title || '').setRequired(false).setMaxLength(256))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Title]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_desc_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_desc_modal').setTitle('Set Embed Description');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description (max 4096 chars)').setStyle(TextInputStyle.Paragraph).setValue(session.description || '').setRequired(false).setMaxLength(4000))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Desc]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_color_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_color_modal').setTitle('Set Embed Color');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (hex like #5865F2)').setStyle(TextInputStyle.Short).setValue(session.color ? `#${session.color.toString(16).padStart(6, '0')}` : '').setRequired(false).setPlaceholder('#5865F2'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Color]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_url_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_url_modal').setTitle('Set Embed URL');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('url').setLabel('URL (title becomes clickable)').setStyle(TextInputStyle.Short).setValue(session.url || '').setRequired(false).setPlaceholder('https://example.com'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed URL]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_author_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_author_modal').setTitle('Set Embed Author');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Author Name').setStyle(TextInputStyle.Short).setValue(session.author?.name || '').setRequired(false)),
					new AR().addComponents(new TextInputBuilder().setCustomId('icon').setLabel('Author Icon URL').setStyle(TextInputStyle.Short).setValue(session.author?.iconURL || '').setRequired(false).setPlaceholder('https://... or {user.avatar}')),
					new AR().addComponents(new TextInputBuilder().setCustomId('url').setLabel('Author URL (optional)').setStyle(TextInputStyle.Short).setValue(session.author?.url || '').setRequired(false))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Author]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_footer_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_footer_modal').setTitle('Set Embed Footer');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('text').setLabel('Footer Text').setStyle(TextInputStyle.Short).setValue(session.footer?.text || '').setRequired(false)),
					new AR().addComponents(new TextInputBuilder().setCustomId('icon').setLabel('Footer Icon URL').setStyle(TextInputStyle.Short).setValue(session.footer?.iconURL || '').setRequired(false).setPlaceholder('https://... or {guild.icon}'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Footer]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_thumb_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_thumb_modal').setTitle('Set Thumbnail');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('Thumbnail URL').setStyle(TextInputStyle.Short).setValue(session.thumbnail || '').setRequired(false).setPlaceholder('https://... or {user.avatar}'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Thumb]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_image_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const { embedSessions } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				const modal = new ModalBuilder().setCustomId('embed_image_modal').setTitle('Set Image');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Image URL').setStyle(TextInputStyle.Short).setValue(session.image || '').setRequired(false).setPlaceholder('https://...'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Image]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_field_')) {
			try {
				const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR } = await import('discord.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const modal = new ModalBuilder().setCustomId('embed_field_modal').setTitle('Add Field');
				modal.addComponents(
					new AR().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Field Name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)),
					new AR().addComponents(new TextInputBuilder().setCustomId('value').setLabel('Field Value').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1024)),
					new AR().addComponents(new TextInputBuilder().setCustomId('inline').setLabel('Inline? (yes/no)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('no'))
				);
				await interaction.showModal(modal);
			} catch (err) { console.error('[Embed Field]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_timestamp_')) {
			try {
				const { embedSessions, buildEmbedBuilderUI } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId) || {};
				session.timestamp = !session.timestamp;
				embedSessions.set(userId, session);

				const container = buildEmbedBuilderUI(userId, session);
				await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
			} catch (err) { console.error('[Embed Timestamp]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_preview_')) {
			try {
				const { embedSessions, buildEmbed, replaceVariables } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId);
				if (!session || (!session.title && !session.description && !session.image && !session.thumbnail)) {
					return interaction.reply({ content: '❌ Your embed needs at least a title, description, or image.', flags: 64 });
				}

				const context = { user: interaction.user, guild: interaction.guild, channel: interaction.channel };
				const processedSession = { ...session };
				if (processedSession.title) processedSession.title = replaceVariables(processedSession.title, context);
				if (processedSession.description) processedSession.description = replaceVariables(processedSession.description, context);
				if (processedSession.thumbnail) processedSession.thumbnail = replaceVariables(processedSession.thumbnail, context);
				if (processedSession.image) processedSession.image = replaceVariables(processedSession.image, context);
				if (processedSession.author?.name) processedSession.author.name = replaceVariables(processedSession.author.name, context);
				if (processedSession.author?.iconURL) processedSession.author.iconURL = replaceVariables(processedSession.author.iconURL, context);
				if (processedSession.footer?.text) processedSession.footer.text = replaceVariables(processedSession.footer.text, context);
				if (processedSession.footer?.iconURL) processedSession.footer.iconURL = replaceVariables(processedSession.footer.iconURL, context);

				const embed = buildEmbed(processedSession);
				await interaction.reply({ content: '**Preview:**', embeds: [embed], flags: 64 });
			} catch (err) {
				console.error('[Embed Preview]', err);
				await interaction.reply({ content: '❌ Error: ' + err.message, flags: 64 }).catch(() => {});
			}
			return;
		}

		if (interaction.customId.startsWith('embed_code_')) {
			try {
				const { embedSessions, generateEmbedCode } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const session = embedSessions.get(userId);
				if (!session || (!session.title && !session.description && !session.image)) {
					return interaction.reply({ content: '❌ Your embed is empty.', flags: 64 });
				}

				const code = generateEmbedCode(session);
				await interaction.reply({ content: `**Your embed code:**\n\`\`\`\n${code}\n\`\`\`\n\n**Usage:** \`.embed #channel ${code}\``, flags: 64 });
			} catch (err) { console.error('[Embed Code]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_send_')) {
			try {
				const { ChannelSelectMenuBuilder } = await import('discord.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents(td => td.setContent('**Select a channel to send your embed:**'));

				const { ActionRowBuilder } = await import('discord.js');
				const row = new ActionRowBuilder().addComponents(
					new ChannelSelectMenuBuilder()
						.setCustomId(`embed_sendto_${userId}`)
						.setPlaceholder('Select a channel')
						.setChannelTypes([0])
				);

				await interaction.reply({ content: '**Select a channel:**', components: [row], flags: 64 });
			} catch (err) { console.error('[Embed Send]', err); }
			return;
		}

		if (interaction.customId.startsWith('embed_sendto_')) {
			try {
				const { embedSessions, buildEmbed, replaceVariables } = await import('../commands/prefix/miscellaneous/embed.js');
				const userId = interaction.customId.split('_')[2];
				if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your session.', flags: 64 });

				const channelId = interaction.values[0];
				const channel = interaction.guild.channels.cache.get(channelId);
				if (!channel) return interaction.reply({ content: '❌ Channel not found.', flags: 64 });

				const session = embedSessions.get(userId);
				if (!session || (!session.title && !session.description && !session.image)) {
					return interaction.reply({ content: '❌ Your embed is empty.', flags: 64 });
				}

				const context = { user: interaction.user, guild: interaction.guild, channel };
				const processedSession = { ...session };
				if (processedSession.title) processedSession.title = replaceVariables(processedSession.title, context);
				if (processedSession.description) processedSession.description = replaceVariables(processedSession.description, context);
				if (processedSession.thumbnail) processedSession.thumbnail = replaceVariables(processedSession.thumbnail, context);
				if (processedSession.image) processedSession.image = replaceVariables(processedSession.image, context);
				if (processedSession.author?.name) processedSession.author.name = replaceVariables(processedSession.author.name, context);
				if (processedSession.author?.iconURL) processedSession.author.iconURL = replaceVariables(processedSession.author.iconURL, context);
				if (processedSession.footer?.text) processedSession.footer.text = replaceVariables(processedSession.footer.text, context);
				if (processedSession.footer?.iconURL) processedSession.footer.iconURL = replaceVariables(processedSession.footer.iconURL, context);

				const embed = buildEmbed(processedSession);
				await channel.send({ embeds: [embed] });
				await interaction.update({ content: `✅ Embed sent to ${channel}!`, components: [] });
			} catch (err) {
				console.error('[Embed SendTo]', err);
				await interaction.reply({ content: '❌ Failed to send: ' + err.message, flags: 64 }).catch(() => {});
			}
			return;
		}
	});

        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.customId.startsWith('comp_')) {
                try {
				    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: AR, ContainerBuilder } = await import('discord.js');
                    const { componentSessions, buildComponentBuilderUI } = await import('../commands/prefix/miscellaneous/component.js');

                    const userId = interaction.user.id;

                    const parts = interaction.customId.split('_');
                    const ownerId = parts[parts.length - 1];

                    if (ownerId && ownerId.match(/^\d+$/) && ownerId !== userId) {
                        return interaction.reply({ content: '❌ You cannot control this builder.', flags: MessageFlags.Ephemeral });
                    }

                    if (!componentSessions.has(userId)) {
                        componentSessions.set(userId, { rows: [], selectedRow: 0 });
                    }
                    const session = componentSessions.get(userId);
                    let updateUI = false;

                    if (interaction.customId.startsWith('comp_add_row_')) {
                        if (session.rows.length < 5) {
                            session.rows.push(new AR());
                            session.selectedRow = session.rows.length - 1;
                            updateUI = true;
                        }
                    }
                    else if (interaction.customId.startsWith('comp_del_row_')) {
                        if (session.rows.length > 0) {
                            session.rows.splice(session.selectedRow, 1);
                            if (session.selectedRow >= session.rows.length) {
                                session.selectedRow = Math.max(0, session.rows.length - 1);
                            }
                            updateUI = true;
                        }
                    }
                    else if (interaction.customId.startsWith('comp_prev_row_')) {
                        if (session.selectedRow > 0) {
                            session.selectedRow--;
                            updateUI = true;
                        }
                    }
                    else if (interaction.customId.startsWith('comp_next_row_')) {
                        if (session.selectedRow < session.rows.length - 1) {
                            session.selectedRow++;
                            updateUI = true;
                        }
                    }

                    else if (interaction.customId.startsWith('comp_add_btn_')) {
                        const modal = new ModalBuilder()
                            .setCustomId(`comp_modal_btn_${userId}`)
                            .setTitle('Add Button');

                        modal.addComponents(
                            new AR().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label').setStyle(TextInputStyle.Short).setRequired(true)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Style (primary, secondary, success, danger, link)').setStyle(TextInputStyle.Short).setRequired(true)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('id_url').setLabel('Custom ID or URL').setStyle(TextInputStyle.Short).setRequired(true)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji (Optional)').setStyle(TextInputStyle.Short).setRequired(false))
                        );

                        return interaction.showModal(modal);
                    }

                    else if (interaction.customId.startsWith('comp_add_select_')) {
                        const modal = new ModalBuilder()
                            .setCustomId(`comp_modal_select_${userId}`)
                            .setTitle('Add Select Menu');

                        modal.addComponents(
                            new AR().addComponents(new TextInputBuilder().setCustomId('id').setLabel('Custom ID').setStyle(TextInputStyle.Short).setRequired(true)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('placeholder').setLabel('Placeholder (Optional)').setStyle(TextInputStyle.Short).setRequired(false)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('range').setLabel('Min-Max (e.g. 1-1)').setHeader('Min-Max').setStyle(TextInputStyle.Short).setValue('1-1').setRequired(true)),
                            new AR().addComponents(new TextInputBuilder().setCustomId('options').setLabel('Options (Label|Value|Desc|Emoji)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Option 1|val1\nOption 2|val2|Description').setRequired(true))
                        );

                        return interaction.showModal(modal);
                    }

                    else if (interaction.customId.startsWith('comp_preview_')) {
                        const rows = session.rows || [];
                        if (rows.length === 0) {
                            return interaction.reply({ content: '❌ No components to preview.', flags: MessageFlags.Ephemeral });
                        }

                        return interaction.reply({ content: 'Preview:', components: rows, flags: MessageFlags.Ephemeral });
                    }

                    else if (interaction.customId.startsWith('comp_help_')) {
                        const helpText = `**Component Builder Help**\n` +
                        `- You can add up to 5 rows.\n` +
                        `- Each row can have up to 5 buttons OR 1 Select Menu.\n` +
                        `- Use **Get Code** to get the shorthand code.\n` +
                        `- Use \`.component <#channel> {code}\` to send!`;
                        const container = new ContainerBuilder();
                        container.addTextDisplayComponents(td => td.setContent(helpText));
                        return interaction.reply({ components: [container], flags: MessageFlags.Ephemeral });
                    }

                    else if (interaction.customId.startsWith('comp_get_code_')) {

                        let code = '';
                        session.rows.forEach((row, i) => {
                            if (i > 0) code += '$r';
                            row.components.forEach((comp, j) => {
                                if (j > 0 && comp.data.type === 2) code += '$v';

                                if (comp.data.type === 2) {

                                    let style = 'secondary';
                                    if (comp.data.style === 1) style = 'primary';
                                    if (comp.data.style === 3) style = 'success';
                                    if (comp.data.style === 4) style = 'danger';
                                    if (comp.data.style === 5) style = 'link';

                                    const id = style === 'link' ? comp.data.url : comp.data.custom_id;
                                    code += `{button: ${comp.data.label || 'Button'} && ${style} && ${id}${comp.data.emoji ? ` && ${comp.data.emoji.name || comp.data.emoji}` : ''}}`;
                                }
                                else if (comp.data.type === 3) {

                                    code += `{select: ${comp.data.custom_id} && ${comp.data.placeholder || ''} && ${comp.data.min_values} && ${comp.data.max_values}}`;
                                    if (comp.options) {
                                        comp.options.forEach(opt => {
                                            code += `$o{${opt.data.label} && ${opt.data.value}${opt.data.description ? ` && ${opt.data.description}` : ''}${opt.data.emoji ? ` && ${opt.data.emoji.name || opt.data.emoji}` : ''}}`;
                                        });
                                    }
                                }
                            });
                        });

                        const container = new ContainerBuilder();
                        container.addTextDisplayComponents(td => td.setContent(`**Component Code:**\n\`\`\`\n${code}\n\`\`\``));
                        return interaction.reply({ components: [container], flags: MessageFlags.Ephemeral });
                    }

                    if (updateUI) {
                        const container = buildComponentBuilderUI(userId, session);
                        await interaction.update({ components: [container] });
                    }

                } catch (error) {
                    console.error('Component Builder Error:', error);
                    try {
                        await interaction.reply({ content: '❌ An error occurred.', flags: MessageFlags.Ephemeral });
                    } catch {}
                }
            }
        });

}
