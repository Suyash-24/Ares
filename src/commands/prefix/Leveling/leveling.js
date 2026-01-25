import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ChannelSelectMenuBuilder,
	RoleSelectMenuBuilder,
	UserSelectMenuBuilder,
	MessageFlags,
	PermissionFlagsBits,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	MediaGalleryBuilder,
	TextDisplayBuilder
} from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot } from '../../../utils/leveling.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'leveling';
const aliases = ['levels', 'level-config', 'lvl'];

const formatNumber = (num) => {
	if (typeof num !== 'number' || Number.isNaN(num)) return '0';
	return num.toFixed(2).replace(/\.00$/, '');
};

export const buildDashboard = (leveling, authorId) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.tada || '🎉'} Leveling`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`**Status:** ${leveling.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
		`**Announce:** ${leveling.announce?.mode || 'context'}${leveling.announce?.mode === 'channel' && leveling.announce?.channelId ? ` → <#${leveling.announce.channelId}>` : ''}`
	));

	const toggleRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`leveling_toggle:${authorId}`)
			.setLabel(leveling.enabled ? 'Disable' : 'Enable')
			.setStyle(leveling.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
	);

	const announceRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_announce_mode:${authorId}`)
			.setPlaceholder('Announcement destination')
			.setMinValues(1)
			.setMaxValues(1)
			.setOptions([
				{ label: 'Context channel', value: 'context', default: (leveling.announce?.mode || 'context') === 'context' },
				{ label: 'Specific channel', value: 'channel', default: leveling.announce?.mode === 'channel' },
				{ label: 'Direct message', value: 'dm', default: leveling.announce?.mode === 'dm' },
				{ label: 'Disabled', value: 'none', default: leveling.announce?.mode === 'none' }
			])
	);

	const channelRow = new ActionRowBuilder().addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId(`leveling_channel_select:${authorId}`)
			.setPlaceholder('Choose announce channel (if channel mode)')
			.setMinValues(0)
			.setMaxValues(1)
			.addChannelTypes(0, 5)
	);

	const navRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_nav_settings:${authorId}`).setLabel('⚙️ XP Settings').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_message:${authorId}`).setLabel('📝 Level Up Message').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_rewards:${authorId}`).setLabel('🎁 Rewards').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_ignores:${authorId}`).setLabel('🚫 No XP').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_cleanup:${authorId}`).setLabel('🧹 Auto Cleanup').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(toggleRow);
	container.addActionRowComponents(announceRow);
	container.addActionRowComponents(channelRow);
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addActionRowComponents(navRow);

	return container;
};

export const buildSettings = (leveling, authorId) => {
	const container = new ContainerBuilder();
	const xp = leveling.xp || {};

	container.addTextDisplayComponents(td => td.setContent(`# ⚙️ XP Settings`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const textXp = xp.text || { enabled: true, minXp: 15, maxXp: 25 };
	const voiceXp = xp.voice || { enabled: true, minXp: 10, maxXp: 20 };

	container.addTextDisplayComponents(td => td.setContent(
		`**Text XP:** ${textXp.enabled !== false ? `${textXp.minXp}-${textXp.maxXp} per message` : 'Disabled'}\n` +
		`**Voice XP:** ${voiceXp.enabled !== false ? `${voiceXp.minXp}-${voiceXp.maxXp} per minute` : 'Disabled'}\n` +
		`**Cooldown:** ${((xp.cooldownMs || 60000) / 1000)}s between messages\n` +
		`**Multiplier:** x${formatNumber(xp.multiplier || 1)}`
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const multiplierRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_mult_down:${authorId}`).setLabel('−0.5x').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_mult_up:${authorId}`).setLabel('+0.5x').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_mult_double:${authorId}`).setLabel('2x Event').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId(`leveling_mult_reset:${authorId}`).setLabel('Reset (1x)').setStyle(ButtonStyle.Danger)
	);

	const cooldownRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_cooldown_select:${authorId}`)
			.setPlaceholder('Set message cooldown')
			.setMinValues(1)
			.setMaxValues(1)
			.setOptions([
				{ label: 'No cooldown', value: '0', default: (xp.cooldownMs || 60000) === 0 },
				{ label: '1 second', value: '1000', default: (xp.cooldownMs || 60000) === 1000 },
				{ label: '5 seconds', value: '5000', default: (xp.cooldownMs || 60000) === 5000 },
				{ label: '10 seconds', value: '10000', default: (xp.cooldownMs || 60000) === 10000 },
				{ label: '15 seconds', value: '15000', default: (xp.cooldownMs || 60000) === 15000 },
				{ label: '30 seconds', value: '30000', default: (xp.cooldownMs || 60000) === 30000 },
				{ label: '1 minute (default)', value: '60000', default: (xp.cooldownMs || 60000) === 60000 },
				{ label: '2 minutes', value: '120000', default: (xp.cooldownMs || 60000) === 120000 },
				{ label: '5 minutes', value: '300000', default: (xp.cooldownMs || 60000) === 300000 }
			])
	);

	const textXpRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_textxp_select:${authorId}`)
			.setPlaceholder('Set text XP range')
			.setMinValues(1)
			.setMaxValues(1)
			.setOptions([
				{ label: '1-5 XP (extremely slow)', value: '1:5', default: textXp.minXp === 1 && textXp.maxXp === 5 },
				{ label: '5-10 XP (very slow)', value: '5:10', default: textXp.minXp === 5 && textXp.maxXp === 10 },
				{ label: '10-15 XP (slow)', value: '10:15', default: textXp.minXp === 10 && textXp.maxXp === 15 },
				{ label: '15-25 XP (default)', value: '15:25', default: textXp.minXp === 15 && textXp.maxXp === 25 },
				{ label: '20-30 XP (fast)', value: '20:30', default: textXp.minXp === 20 && textXp.maxXp === 30 },
				{ label: '25-40 XP (very fast)', value: '25:40', default: textXp.minXp === 25 && textXp.maxXp === 40 },
				{ label: '30-50 XP (extremely fast)', value: '30:50', default: textXp.minXp === 30 && textXp.maxXp === 50 }
			])
	);

	const voiceXpRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_voicexp_select:${authorId}`)
			.setPlaceholder('Set voice XP range')
			.setMinValues(1)
			.setMaxValues(1)
			.setOptions([
				{ label: '1-5 XP/min (extremely slow)', value: '1:5', default: voiceXp.minXp === 1 && voiceXp.maxXp === 5 },
				{ label: '5-10 XP/min (very slow)', value: '5:10', default: voiceXp.minXp === 5 && voiceXp.maxXp === 10 },
				{ label: '10-20 XP/min (default)', value: '10:20', default: voiceXp.minXp === 10 && voiceXp.maxXp === 20 },
				{ label: '15-30 XP/min (fast)', value: '15:30', default: voiceXp.minXp === 15 && voiceXp.maxXp === 30 },
				{ label: '20-40 XP/min (very fast)', value: '20:40', default: voiceXp.minXp === 20 && voiceXp.maxXp === 40 },
				{ label: '25-50 XP/min (extremely fast)', value: '25:50', default: voiceXp.minXp === 25 && voiceXp.maxXp === 50 }
			])
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const toggleRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`leveling_textxp_toggle:${authorId}`)
			.setLabel(textXp.enabled !== false ? '💬 Text XP: ON' : '💬 Text XP: OFF')
			.setStyle(textXp.enabled !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`leveling_voicexp_toggle:${authorId}`)
			.setLabel(voiceXp.enabled !== false ? '🔊 Voice XP: ON' : '🔇 Voice XP: OFF')
			.setStyle(voiceXp.enabled !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(multiplierRow);
	container.addActionRowComponents(cooldownRow);
	container.addActionRowComponents(textXpRow);
	container.addActionRowComponents(voiceXpRow);
	container.addActionRowComponents(toggleRow);

	return container;
};

export const buildIgnores = (leveling, authorId) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.no || '🚫'} No XP`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`Channels: ${leveling.ignores?.channels?.length || 0} • Roles: ${leveling.ignores?.roles?.length || 0} • Users: ${leveling.ignores?.users?.length || 0}`
	));

	const channelRow = new ActionRowBuilder().addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId(`leveling_ignore_channels:${authorId}`)
			.setPlaceholder('Toggle ignored channels')
			.setMinValues(0)
			.setMaxValues(25)
			.addChannelTypes(0, 5)
	);

	const roleRow = new ActionRowBuilder().addComponents(
		new RoleSelectMenuBuilder()
			.setCustomId(`leveling_ignore_roles:${authorId}`)
			.setPlaceholder('Toggle ignored roles')
			.setMinValues(0)
			.setMaxValues(25)
	);

	const userRow = new ActionRowBuilder().addComponents(
		new UserSelectMenuBuilder()
			.setCustomId(`leveling_ignore_users:${authorId}`)
			.setPlaceholder('Toggle ignored users')
			.setMinValues(0)
			.setMaxValues(25)
	);

	const backRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(channelRow);
	container.addActionRowComponents(roleRow);
	container.addActionRowComponents(userRow);
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addActionRowComponents(backRow);
	return container;
};

export const buildRewards = (leveling, authorId, guild = null) => {
	const rewards = leveling.rewards?.roles || [];
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.trophy || '🏆'} Role Rewards`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	if (!rewards.length) {
		container.addTextDisplayComponents(td => td.setContent('No rewards yet. Pick a role below to add one.'));
	} else {
		rewards
			.sort((a, b) => (a.level || 0) - (b.level || 0))
			.forEach(reward => {
				const role = guild?.roles?.cache?.get(reward.roleId);
				const roleMention = role ? `<@&${role.id}>` : `Role (${reward.roleId})`;
				container.addTextDisplayComponents(td => td.setContent(`Level ${reward.level} → ${roleMention}`));
			});
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`Stack roles: ${leveling.rewards?.stackRoles ? 'On' : 'Off'} • Sync: ${leveling.rewards?.sync ? 'On' : 'Off'}`));

	const actionsRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_rewards_stack:${authorId}`).setLabel('Toggle Stack').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_rewards_sync:${authorId}`).setLabel('Toggle Sync').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_rewards_syncnow:${authorId}`).setLabel('Sync Now').setStyle(ButtonStyle.Primary)
	);

	const addRow = new ActionRowBuilder().addComponents(
		new RoleSelectMenuBuilder()
			.setCustomId(`leveling_reward_pick:${authorId}`)
			.setPlaceholder('Pick a role to reward')
			.setMinValues(1)
			.setMaxValues(1)
	);

	const removeRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_reward_remove:${authorId}`)
			.setPlaceholder('Remove reward(s)')
			.setMinValues(0)
			.setMaxValues(Math.max(1, rewards.length || 1))
			.setOptions(
				rewards.length
					? rewards.slice(0, 25).map(r => ({ label: `Level ${r.level}`, value: r.roleId }))
					: [{ label: 'No rewards', value: 'none', default: true }]
			)
	);

	const backRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(actionsRow);
	container.addActionRowComponents(addRow);
	container.addActionRowComponents(removeRow);
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addActionRowComponents(backRow);
	return container;
};

export const buildWizard = (leveling, authorId) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.wand || '🪄'} Quick Setup`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addTextDisplayComponents(td => td.setContent(
		`**Current Status:** ${leveling.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
		`**XP Rate:** x${formatNumber(leveling.xp?.multiplier || 1)} • **Cooldown:** ${(leveling.xp?.cooldownMs || 0) / 1000}s\n` +
		`**Cleanup:** Leave: ${leveling.autoCleanup?.leave ? '🟢' : '⚪'} • Kick: ${leveling.autoCleanup?.kick ? '🟢' : '⚪'} • Ban: ${leveling.autoCleanup?.ban ? '🟢' : '⚪'}`
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addTextDisplayComponents(td => td.setContent('**Step 1:** Enable leveling'));
	const toggleRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`leveling_toggle:${authorId}`)
			.setLabel(leveling.enabled ? 'Disable Leveling' : 'Enable Leveling')
			.setStyle(leveling.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
	);

	container.addTextDisplayComponents(td => td.setContent('**Step 2:** Choose where level-up messages appear'));
	const announceRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_announce_mode:${authorId}`)
			.setPlaceholder('Select announcement location')
			.setMinValues(1)
			.setMaxValues(1)
			.setOptions([
				{ label: 'Same channel as message', description: 'Announce in the channel where user sent message', value: 'context', default: (leveling.announce?.mode || 'context') === 'context' },
				{ label: 'Specific channel', description: 'Pick a dedicated channel below', value: 'channel', default: leveling.announce?.mode === 'channel' },
				{ label: 'DM the user', description: 'Send level-up via direct message', value: 'dm', default: leveling.announce?.mode === 'dm' },
				{ label: 'No announcements', description: 'Level up silently', value: 'none', default: leveling.announce?.mode === 'none' }
			])
	);
	const channelRow = new ActionRowBuilder().addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId(`leveling_channel_select:${authorId}`)
			.setPlaceholder('Pick channel (if using specific channel mode)')
			.setMinValues(0)
			.setMaxValues(1)
			.addChannelTypes(0, 5)
	);

	container.addTextDisplayComponents(td => td.setContent('**Step 3:** Adjust XP rate and cooldown'));
	const xpRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_mult_down:${authorId}`).setLabel('−0.1 Rate').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_mult_up:${authorId}`).setLabel('+0.1 Rate').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_cooldown_down:${authorId}`).setLabel('−5s CD').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_cooldown_up:${authorId}`).setLabel('+5s CD').setStyle(ButtonStyle.Secondary)
	);

	container.addTextDisplayComponents(td => td.setContent('**Step 4:** Handle members who leave / are kicked / banned'));
	const cleanupNavRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_nav_cleanup:${authorId}`).setLabel('Open Auto Cleanup').setStyle(ButtonStyle.Secondary)
	);

	const navRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_nav_rewards:${authorId}`).setLabel('⭐ Role Rewards').setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(`leveling_nav_ignores:${authorId}`).setLabel('🚫 No XP').setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(toggleRow);
	container.addActionRowComponents(announceRow);
	container.addActionRowComponents(channelRow);
	container.addActionRowComponents(xpRow);
	container.addActionRowComponents(cleanupNavRow);
	container.addActionRowComponents(navRow);
	return container;
};

export const buildCleanup = (leveling, authorId) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`# 🧹 Auto Cleanup`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`Leave: ${leveling.autoCleanup?.leave ? '🟢' : '⚪'} • Kick: ${leveling.autoCleanup?.kick ? '🟢' : '⚪'} • Ban: ${leveling.autoCleanup?.ban ? '🟢' : '⚪'}`
	));

	const selectRow = new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(`leveling_cleanup_modes:${authorId}`)
			.setPlaceholder('Select events to auto-erase data')
			.setMinValues(0)
			.setMaxValues(3)
			.setOptions([
				{ label: 'Leave', description: 'Erase data when member leaves', value: 'leave', default: !!leveling.autoCleanup?.leave },
				{ label: 'Kick', description: 'Erase data when member is kicked', value: 'kick', default: !!leveling.autoCleanup?.kick },
				{ label: 'Ban', description: 'Erase data when member is banned', value: 'ban', default: !!leveling.autoCleanup?.ban }
			])
	);

	const actionsRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_cleanup_run:${authorId}`).setLabel('Run Cleanup Now').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(selectRow);
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addActionRowComponents(actionsRow);
	return container;
};

export const buildMessageEditor = (leveling, authorId) => {
	const container = new ContainerBuilder();
	const msg = leveling.announce?.message || {};

	container.addTextDisplayComponents(td => td.setContent(`# ✉️ Level-up Message Editor`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	container.addTextDisplayComponents(td => td.setContent(
		`**Available Variables:**\n` +
		`\`{user.mention}\` \`{user.name}\` \`{user.avatar}\` \`{level}\` \`{xp}\`\n` +
		`\`{server}\` \`{server.icon}\` \`{server.members}\` \`{timestamp}\``
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const preview = [];
	if (msg.content) preview.push(`**Content:** ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
	if (msg.title) preview.push(`**Title:** ${msg.title}`);
	if (msg.body) preview.push(`**Body:** ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`);
	if (msg.thumbnail) preview.push(`**Thumbnail:** ✅`);
	if (msg.image) preview.push(`**Image:** ✅`);
	if (msg.footer) preview.push(`**Footer:** ${msg.footer}`);

	container.addTextDisplayComponents(td => td.setContent(
		preview.length ? `**Current Setup:**\n${preview.join('\n')}` : '*No custom message configured. Using default.*'
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

	const row1 = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_msg_content:${authorId}`).setLabel('Content').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_msg_title:${authorId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_msg_body:${authorId}`).setLabel('Body').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_msg_footer:${authorId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary)
	);

	const row2 = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`leveling_msg_thumbnail:${authorId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_msg_image:${authorId}`).setLabel('Image').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(`leveling_msg_preview:${authorId}`).setLabel('👁️ Preview').setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(`leveling_msg_reset:${authorId}`).setLabel('🗑️ Reset').setStyle(ButtonStyle.Danger),
		new ButtonBuilder().setCustomId(`leveling_nav_back:${authorId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
	);

	container.addActionRowComponents(row1);
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addActionRowComponents(row2);
	return container;
};

const requireManageGuild = (member) =>
	member.permissions.has(PermissionFlagsBits.ManageGuild) ||
	member.permissions.has(PermissionFlagsBits.Administrator);

async function handleDashboard(interaction, authorId) {
	if (interaction.user.id !== authorId) {
		await interaction.reply({ content: '❌ This panel is locked to the command invoker.', ephemeral: true });
		return null;
	}
	if (!requireManageGuild(interaction.member)) {
		await interaction.reply({ content: '❌ Manage Server is required.', ephemeral: true });
		return null;
	}
	const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
	return leveling;
}

const SAFE_MENTIONS = { parse: [], users: [], roles: [], repliedUser: false };

const updatePanel = async (interaction, leveling, authorId) => {
	const panel = buildDashboard(leveling, authorId);
	const method = interaction.update ? 'update' : 'editReply';
	await interaction[method]({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
};

const components = [
	{
		customId: /^leveling_toggle:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_toggle:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.enabled = !leveling.enabled;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await updatePanel(interaction, leveling, authorId);
		}
	},
	{
		customId: /^leveling_nav_rewards:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_rewards:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildRewards(leveling, authorId, interaction.guild);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_nav_ignores:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_ignores:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildIgnores(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_nav_cleanup:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_cleanup:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildCleanup(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_cleanup_modes:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_cleanup_modes:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const selected = new Set(interaction.values || []);
			leveling.autoCleanup = {
				leave: selected.has('leave'),
				kick: selected.has('kick'),
				ban: selected.has('ban')
			};
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildCleanup(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_cleanup_run:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_cleanup_run:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const memberIds = Object.keys(leveling.members || {});
			let removed = 0;
			for (const userId of memberIds) {
				const member = await interaction.guild.members.fetch(userId).catch(() => null);
				if (!member) {
					delete leveling.members[userId];
					removed++;
				}
			}
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildCleanup(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
			const reply = removed
				? `${EMOJIS.success || '✅'} Cleaned up **${removed}** absent member(s).`
				: `${EMOJIS.success || '✅'} No absent members found.`;
			await interaction.followUp({ content: reply, ephemeral: true }).catch(() => {});
		}
	},
	{
		customId: /^leveling_nav_back:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_back:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildDashboard(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_announce_mode:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_announce_mode:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const selection = interaction.values?.[0];
			if (!selection) return;
			leveling.announce.mode = selection;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await updatePanel(interaction, leveling, authorId);
		}
	},
	{
		customId: /^leveling_channel_select:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_channel_select:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const channelId = interaction.values?.[0] || null;
			leveling.announce.channelId = channelId;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await updatePanel(interaction, leveling, authorId);
		}
	},
	{
		customId: /^leveling_mult_(up|down):(\d+)$/,
		execute: async (interaction) => {
			const [, direction, authorId] = interaction.customId.match(/^leveling_mult_(up|down):(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const delta = direction === 'up' ? 0.5 : -0.5;
			const current = leveling.xp?.multiplier ?? 1;
			const next = Math.max(0.5, Math.min(5, parseFloat((current + delta).toFixed(2))));
			leveling.xp.multiplier = next;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_mult_double:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_mult_double:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.xp.multiplier = 2;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_mult_reset:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_mult_reset:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.xp.multiplier = 1;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_cooldown_select:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_cooldown_select:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const cooldownMs = parseInt(interaction.values?.[0] || '45000', 10);
			leveling.xp.cooldownMs = cooldownMs;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_basexp_select:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_basexp_select:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const baseXp = parseInt(interaction.values?.[0] || '15', 10);
			leveling.xp.base = baseXp;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_textxp_select:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_textxp_select:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const [minXp, maxXp] = (interaction.values?.[0] || '15:25').split(':').map(n => parseInt(n, 10));
			if (!leveling.xp.text) leveling.xp.text = { enabled: true, minXp: 15, maxXp: 25 };
			leveling.xp.text.minXp = minXp;
			leveling.xp.text.maxXp = maxXp;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_voicexp_select:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_voicexp_select:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const [minXp, maxXp] = (interaction.values?.[0] || '10:20').split(':').map(n => parseInt(n, 10));
			if (!leveling.xp.voice) leveling.xp.voice = { enabled: true, minXp: 10, maxXp: 20 };
			leveling.xp.voice.minXp = minXp;
			leveling.xp.voice.maxXp = maxXp;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_textxp_toggle:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_textxp_toggle:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			if (!leveling.xp.text) leveling.xp.text = { enabled: true, minXp: 15, maxXp: 25 };
			leveling.xp.text.enabled = !leveling.xp.text.enabled;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_voicexp_toggle:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_voicexp_toggle:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			if (!leveling.xp.voice) leveling.xp.voice = { enabled: true, minXp: 10, maxXp: 20 };
			leveling.xp.voice.enabled = !leveling.xp.voice.enabled;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_nav_settings:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_settings:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildSettings(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_ignore_channels:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_ignore_channels:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const values = interaction.values || [];
			leveling.ignores.channels = Array.from(new Set(values));
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildIgnores(leveling, authorId)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_ignore_roles:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_ignore_roles:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const values = interaction.values || [];
			leveling.ignores.roles = Array.from(new Set(values));
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildIgnores(leveling, authorId)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_ignore_users:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_ignore_users:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const values = interaction.values || [];
			leveling.ignores.users = Array.from(new Set(values));
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildIgnores(leveling, authorId)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_rewards_stack:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_rewards_stack:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.rewards.stackRoles = !leveling.rewards.stackRoles;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildRewards(leveling, authorId, interaction.guild)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_rewards_sync:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_rewards_sync:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.rewards.sync = !leveling.rewards.sync;
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildRewards(leveling, authorId, interaction.guild)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_rewards_syncnow:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_rewards_syncnow:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;

			try {
				const members = await interaction.guild.members.fetch();
				for (const member of members.values()) {
					const state = getMemberSnapshot(leveling, member.id);
					await import('../../../utils/leveling.js').then(mod => mod.applyRewards?.(interaction.client, interaction.guildId, leveling, state, member)).catch(() => {});
				}
				await interaction.followUp({ content: '✅ Sync attempted for cached members.', ephemeral: true }).catch(() => {});
			} catch (err) {
				console.error('[Leveling] Reward sync failed:', err);
				await interaction.followUp({ content: '⚠️ Sync failed. Try again later.', ephemeral: true }).catch(() => {});
			}
			await interaction.update({ components: [buildRewards(leveling, authorId, interaction.guild)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_reward_pick:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_reward_pick:(\d+)$/) || [];
			if (interaction.user.id !== authorId) return interaction.reply({ content: '❌ Locked to the invoker.', ephemeral: true });
			const roleId = interaction.values?.[0];
			if (!roleId) return;
			const modal = new ModalBuilder()
				.setCustomId(`leveling_reward_modal:${authorId}:${roleId}`)
				.setTitle('Set required level');
			const input = new TextInputBuilder()
				.setCustomId('level')
				.setLabel('Level number (>=1)')
				.setStyle(TextInputStyle.Short)
				.setMinLength(1)
				.setMaxLength(5)
				.setRequired(true);
			modal.addComponents(new ActionRowBuilder().addComponents(input));
			await interaction.showModal(modal);
		}
	},
	{
		customId: /^leveling_reward_remove:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_reward_remove:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const values = interaction.values || [];
			if (!values.length || (values.length === 1 && values[0] === 'none')) {
				await interaction.reply({ content: 'Nothing to remove.', ephemeral: true }).catch(() => {});
				return;
			}
			leveling.rewards.roles = (leveling.rewards.roles || []).filter(r => !values.includes(r.roleId));
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildRewards(leveling, authorId, interaction.guild)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},
	{
		customId: /^leveling_template_edit:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_template_edit:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;

			const modal = new ModalBuilder()
				.setCustomId(`leveling_template_modal:${authorId}`)
				.setTitle('Level-up template');

			const input = new TextInputBuilder()
				.setCustomId('template')
				.setLabel('Use tokens: {user.mention}, {level}')
				.setStyle(TextInputStyle.Paragraph)
				.setMaxLength(500)
				.setRequired(true)
				.setValue(leveling.announce?.template || '{user.mention} reached level {level}!');

			modal.addComponents(new ActionRowBuilder().addComponents(input));
			await interaction.showModal(modal);
		}
	},
	{
		customId: /^leveling_template_reset:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_template_reset:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.announce.template = '{user.mention} just reached level {level}! 🎉';
			leveling.announce.message = {};
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await updatePanel(interaction, leveling, authorId);
		}
	},

	{
		customId: /^leveling_nav_message:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_nav_message:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			const panel = buildMessageEditor(leveling, authorId);
			await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	},

	{
		customId: /^leveling_msg_(content|title|body|footer|thumbnail|image):(\d+)$/,
		execute: async (interaction) => {
			const [, field, authorId] = interaction.customId.match(/^leveling_msg_(content|title|body|footer|thumbnail|image):(\d+)$/) || [];
			if (interaction.user.id !== authorId) return interaction.reply({ content: '❌ Locked to the invoker.', ephemeral: true });

			const leveling = await ensureLevelingConfig(interaction.client.db, interaction.guildId);
			const msg = leveling.announce?.message || {};

			const fieldConfig = {
				content: { label: 'Content (plain text)', placeholder: '{user.mention} leveled up!', max: 2000, style: TextInputStyle.Paragraph, current: msg.content },
				title: { label: 'Title', placeholder: '🎉 Level Up!', max: 256, style: TextInputStyle.Short, current: msg.title },
				body: { label: 'Body Text', placeholder: 'Congrats {user.mention}! You reached level {level}!', max: 2000, style: TextInputStyle.Paragraph, current: msg.body },
				footer: { label: 'Footer', placeholder: '{server} • {timestamp}', max: 256, style: TextInputStyle.Short, current: msg.footer },
				thumbnail: { label: 'Thumbnail URL', placeholder: '{user.avatar} or {server.icon} or https://...', max: 500, style: TextInputStyle.Short, current: msg.thumbnail },
				image: { label: 'Image URL', placeholder: '{user.banner} or https://...', max: 500, style: TextInputStyle.Short, current: msg.image }
			};

			const cfg = fieldConfig[field];
			const modal = new ModalBuilder()
				.setCustomId(`leveling_msg_modal:${field}:${authorId}`)
				.setTitle(`Edit ${cfg.label}`);

			const input = new TextInputBuilder()
				.setCustomId('value')
				.setLabel(cfg.label)
				.setPlaceholder(cfg.placeholder)
				.setStyle(cfg.style)
				.setMaxLength(cfg.max)
				.setRequired(false);

			if (cfg.current) input.setValue(cfg.current);

			modal.addComponents(new ActionRowBuilder().addComponents(input));
			await interaction.showModal(modal);
		}
	},

	{
		customId: /^leveling_msg_preview:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_msg_preview:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;

			const msg = leveling.announce?.message || {};

			const replaceVars = (str) => {
				if (!str) return str;
				return str
					.replace(/{user\.mention}/g, interaction.user.toString())
					.replace(/{user\.name}/g, interaction.user.username)
					.replace(/{user\.avatar}/g, interaction.user.displayAvatarURL({ size: 512 }))
					.replace(/{level}/g, '5')
					.replace(/{xp}/g, '1250')
					.replace(/{server}/g, interaction.guild.name)
					.replace(/{server\.icon}/g, interaction.guild.iconURL({ size: 512 }) || '')
					.replace(/{server\.members}/g, interaction.guild.memberCount.toString())
					.replace(/{timestamp}/g, new Date().toLocaleString());
			};

			const replaceVarsNoPing = (str) => {
				if (!str) return str;
				return str
					.replace(/{user\.mention}/g, interaction.user.toString())
					.replace(/{user\.name}/g, interaction.user.username)
					.replace(/{user\.avatar}/g, interaction.user.displayAvatarURL({ size: 512 }))
					.replace(/{level}/g, '5')
					.replace(/{xp}/g, '1250')
					.replace(/{server}/g, interaction.guild.name)
					.replace(/{server\.icon}/g, interaction.guild.iconURL({ size: 512 }) || '')
					.replace(/{server\.members}/g, interaction.guild.memberCount.toString())
					.replace(/{timestamp}/g, new Date().toLocaleString());
			};

			const hasCustom = msg.content || msg.title || msg.body || msg.thumbnail || msg.footer || msg.image;

			if (!hasCustom) {

				const previewContainer = new ContainerBuilder();
				previewContainer.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Level Up!`));
				previewContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				previewContainer.addTextDisplayComponents(td => td.setContent(`${interaction.user} just reached level 5! 🎉`));
				previewContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				previewContainer.addTextDisplayComponents(td => td.setContent(`-# This is the default message. Edit fields to customize.`));
				await interaction.reply({ components: [previewContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, allowedMentions: { parse: ['users'] } });
				return;
			}

			const previewContainer = new ContainerBuilder();
			let hasContainerContent = false;

			if (msg.title) {
				previewContainer.addTextDisplayComponents(td => td.setContent(`**${replaceVarsNoPing(msg.title)}**`));
				previewContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				hasContainerContent = true;
			}

			if (msg.body || msg.thumbnail) {
				const thumbUrl = msg.thumbnail ? (replaceVars(msg.thumbnail) || '').trim() : null;
				const validThumb = thumbUrl && thumbUrl.startsWith('http');

				if (validThumb) {

					previewContainer.addSectionComponents(section => {
						const bodyText = msg.body ? replaceVarsNoPing(msg.body) : '\u200b';
						section.addTextDisplayComponents(td => td.setContent(bodyText));
						section.setThumbnailAccessory(thumb => thumb.setURL(thumbUrl));
						return section;
					});
				} else if (msg.body) {

					previewContainer.addTextDisplayComponents(td => td.setContent(replaceVarsNoPing(msg.body)));
				}
				hasContainerContent = true;
			} else if (msg.body) {
				previewContainer.addTextDisplayComponents(td => td.setContent(replaceVarsNoPing(msg.body)));
				hasContainerContent = true;
			}

			if (msg.image) {
				const imgUrl = (replaceVars(msg.image) || '').trim();
				if (imgUrl && imgUrl.startsWith('http')) {
					const gallery = new MediaGalleryBuilder().addItems(item => item.setURL(imgUrl));
					previewContainer.addMediaGalleryComponents(gallery);
					hasContainerContent = true;
				}
			}

			if (msg.footer) {
				previewContainer.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				previewContainer.addTextDisplayComponents(td => td.setContent(`-# ${replaceVarsNoPing(msg.footer)}`));
				hasContainerContent = true;
			}

			const reply = { flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, allowedMentions: { parse: ['users'] } };
			const components = [];

			if (msg.content) {
				components.push(new TextDisplayBuilder().setContent(replaceVars(msg.content)));
			}
			if (hasContainerContent) {
				components.push(previewContainer);
			}

			reply.components = components;
			await interaction.reply(reply);
		}
	},

	{
		customId: /^leveling_msg_reset:(\d+)$/,
		execute: async (interaction) => {
			const [, authorId] = interaction.customId.match(/^leveling_msg_reset:(\d+)$/) || [];
			const leveling = await handleDashboard(interaction, authorId);
			if (!leveling) return;
			leveling.announce.message = {};
			leveling.announce.template = '{user.mention} just reached level {level}! 🎉';
			await interaction.client.db.updateOne({ guildId: interaction.guildId }, { $set: { leveling } });
			await interaction.update({ components: [buildMessageEditor(leveling, authorId)], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
		}
	}
];

async function execute(message, args, client) {
	if (!requireManageGuild(message.member)) {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Manage Server required.`));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}

	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	const panel = buildDashboard(leveling, message.author.id);
	await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
}

export default {
	name,
	category: 'Leveling',
	aliases,
	execute,
	components
};
