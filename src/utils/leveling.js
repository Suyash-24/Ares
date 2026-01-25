import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ChannelType, MediaGalleryBuilder, TextDisplayBuilder } from 'discord.js';
import EMOJIS from './emojis.js';

export const DEFAULT_LEVELING = {
	enabled: false,
	ignores: {
		channels: [],
		roles: [],
		users: []
	},
	announce: {
		mode: 'context',
		channelId: null,
		template: '{user.mention} just reached level {level}! 🎉',
		includeMention: true
	},
	xp: {
		text: {
			enabled: true,
			minXp: 15,
			maxXp: 25
		},
		voice: {
			enabled: true,
			minXp: 10,
			maxXp: 20
		},
		multiplier: 1,
		cooldownMs: 60_000,
		countCommands: false
	},
	rewards: {
		stackRoles: true,
		sync: true,
		roles: []
	},
	leaderboardTitle: 'Leaderboard',
	autoCleanup: {
		leave: false,
		kick: false,
		ban: false
	},
	members: {}
};

const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_LEVELING));

const renderTemplate = (template, ctx) => {
	if (!template || typeof template !== 'string' || template.length > 2000) {
		return `${ctx.userMention} reached level ${ctx.level}!`;
	}
	let output = template;
	const replacements = {
		'{user}': ctx.userMention,
		'{user.name}': ctx.userName,
		'{user.tag}': ctx.userTag,
		'{user.id}': ctx.userId,
		'{user.mention}': ctx.userMention,
		'{level}': String(ctx.level),
		'{xp}': String(ctx.xp),
		'{totalXp}': String(ctx.totalXp),
		'{nextLevelXp}': String(ctx.nextLevelXp)
	};

	for (const [token, value] of Object.entries(replacements)) {
		output = output.split(token).join(value);
	}

	return output.replace(/\\n/g, '\n');
};

const voiceSessions = new Map();

export const applyRewards = async (client, guildId, leveling, memberState, member) => {
	try {
		if (!leveling.rewards?.roles?.length) return;
		const rewards = [...leveling.rewards.roles].sort((a, b) => (a.level || 0) - (b.level || 0));
		const eligible = rewards.filter(r => memberState.level >= (r.level || 0));
		if (!eligible.length) return;

		let guildMember = member;
		if (!guildMember) {
			const guild = await client.guilds.fetch(guildId).catch(() => null);
			if (!guild) return;
			guildMember = await guild.members.fetch(memberState.userId || member?.id || '').catch(() => null);
		}
		if (!guildMember) return;

		const rewardRoleIds = eligible.map(r => r.roleId).filter(Boolean);
		const toAdd = leveling.rewards.stackRoles ? rewardRoleIds : [rewardRoleIds[rewardRoleIds.length - 1]];
		const allRewardRoleIds = rewards.map(r => r.roleId).filter(Boolean);

		await guildMember.roles.add(toAdd).catch(() => {});

		if (!leveling.rewards.stackRoles) {
			const toRemove = allRewardRoleIds.filter(rid => !toAdd.includes(rid));
			if (toRemove.length) await guildMember.roles.remove(toRemove).catch(() => {});
		}

		memberState.rewardsGranted = Array.from(new Set([...(memberState.rewardsGranted || []), ...toAdd]));
	} catch (err) {
		console.error('[Leveling] applyRewards failed:', err);
	}
};

const ensureMember = (leveling, userId) => {
	if (!leveling.members[userId]) {
		leveling.members[userId] = {
			xp: 0,
			level: 0,
			totalXp: 0,
			lastMessageAt: 0,
			lastVoiceAt: 0,
			rewardsGranted: [],
			userId,
			muteAnnouncements: false
		};
	}
	return leveling.members[userId];
};

export const getMemberSnapshot = (leveling, userId) => ensureMember(leveling, userId);

export const getLeaderboard = (leveling, limit = 50) => {
	const entries = Object.entries(leveling.members || {});
	const sorted = entries
		.map(([userId, data]) => ({ userId, ...data }))
		.sort((a, b) => {
			if ((b.totalXp || 0) !== (a.totalXp || 0)) return (b.totalXp || 0) - (a.totalXp || 0);
			return (b.level || 0) - (a.level || 0);
		})
		.slice(0, limit);
	return sorted;
};

export const getRankPosition = (leveling, userId) => {
	const entries = Object.entries(leveling.members || {});
	const sorted = entries
		.map(([uid, data]) => ({ userId: uid, ...data }))
		.sort((a, b) => {
			if ((b.totalXp || 0) !== (a.totalXp || 0)) return (b.totalXp || 0) - (a.totalXp || 0);
			return (b.level || 0) - (a.level || 0);
		});
	const idx = sorted.findIndex(e => e.userId === userId);
	return { position: idx === -1 ? null : idx + 1, total: sorted.length };
};

export const xpToNextLevel = (level, config) => {

	const base = 5 * level * level + 50 * level + 100;
	return Math.floor(base);
};

const addXp = (config, memberState, amount) => {
	let gained = Math.max(0, Math.floor(amount));
	if (gained === 0) return { leveledUp: false, levelsGained: 0 };

	gained = Math.floor(gained * (config.xp.multiplier || 1));

	memberState.xp += gained;
	memberState.totalXp += gained;

	let leveledUp = false;
	let levelsGained = 0;

	while (true) {
		const needed = xpToNextLevel(memberState.level, config);
		if (memberState.xp < needed) break;
		memberState.xp -= needed;
		memberState.level += 1;
		levelsGained += 1;
		leveledUp = true;
	}

	return { leveledUp, levelsGained, gained };
};

const shouldIgnoreMessage = (message, config) => {
	if (config.ignores.users?.includes(message.author.id)) return true;
	if (config.ignores.channels?.includes(message.channelId)) return true;
	if (config.ignores.roles?.length) {
		const hasIgnoredRole = message.member?.roles?.cache?.some(r => config.ignores.roles.includes(r.id));
		if (hasIgnoredRole) return true;
	}
	return false;
};

const computeMessageXp = (message, config) => {
	const textXp = config.xp.text || { enabled: true, minXp: 15, maxXp: 25 };
	if (textXp.enabled === false) return 0;

	const randomXp = Math.floor(Math.random() * (textXp.maxXp - textXp.minXp + 1)) + textXp.minXp;
	return randomXp;
};

const computeVoiceXp = (minutes, config) => {
	const voiceXp = config.xp.voice || { enabled: true, minXp: 10, maxXp: 20 };
	if (voiceXp.enabled === false) return 0;

	const randomXpPerMin = Math.floor(Math.random() * (voiceXp.maxXp - voiceXp.minXp + 1)) + voiceXp.minXp;
	return minutes * randomXpPerMin;
};

const buildAnnouncementContainer = (text) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Level Up!`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(text));
	return container;
};

const buildRichAnnouncement = (leveling, ctx) => {
	const msg = leveling.announce?.message || {};
	const hasCustom = msg.content || msg.title || msg.body || msg.thumbnail || msg.footer;

	const replaceVars = (str) => {
		if (!str) return str;
		return str
			.replace(/{user\.mention}/g, ctx.userMention)
			.replace(/{user\.name}/g, ctx.userName)
			.replace(/{user\.avatar}/g, ctx.userAvatar || '')
			.replace(/{level}/g, String(ctx.level))
			.replace(/{xp}/g, String(ctx.xp))
			.replace(/{server}/g, ctx.serverName || '')
			.replace(/{server\.icon}/g, ctx.serverIcon || '')
			.replace(/{server\.members}/g, String(ctx.serverMembers || 0))
			.replace(/{timestamp}/g, new Date().toLocaleString());
	};

	const replaceVarsNoPing = (str) => {
		if (!str) return str;
		return str
			.replace(/{user\.mention}/g, ctx.userMention)
			.replace(/{user\.name}/g, ctx.userName)
			.replace(/{user\.avatar}/g, ctx.userAvatar || '')
			.replace(/{level}/g, String(ctx.level))
			.replace(/{xp}/g, String(ctx.xp))
			.replace(/{server}/g, ctx.serverName || '')
			.replace(/{server\.icon}/g, ctx.serverIcon || '')
			.replace(/{server\.members}/g, String(ctx.serverMembers || 0))
			.replace(/{timestamp}/g, new Date().toLocaleString());
	};

	if (!hasCustom) {
		const text = renderTemplate(leveling.announce?.template, ctx);
		return { components: [buildAnnouncementContainer(text)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: ['users'] } };
	}

	const container = new ContainerBuilder();

	if (msg.title) {
		container.addTextDisplayComponents(td => td.setContent(`**${replaceVarsNoPing(msg.title)}**`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	}

	if (msg.body || msg.thumbnail) {
		const thumbUrl = msg.thumbnail ? (replaceVars(msg.thumbnail) || '').trim() : null;
		container.addSectionComponents(section => {
			const bodyText = msg.body ? replaceVarsNoPing(msg.body) : '\u200b';
			section.addTextDisplayComponents(td => td.setContent(bodyText));
			if (thumbUrl && thumbUrl.startsWith('http')) {
				section.setThumbnailAccessory(thumb => thumb.setURL(thumbUrl));
			}
			return section;
		});
	} else if (msg.body) {
		container.addTextDisplayComponents(td => td.setContent(replaceVarsNoPing(msg.body)));
	}

	if (msg.image) {
		const imgUrl = (replaceVars(msg.image) || '').trim();
		if (imgUrl && imgUrl.startsWith('http')) {
			const gallery = new MediaGalleryBuilder().addItems(item => item.setURL(imgUrl));
			container.addMediaGalleryComponents(gallery);
		}
	}

	if (msg.footer) {
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`-# ${replaceVarsNoPing(msg.footer)}`));
	}

	const payload = { flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: ['users'] } };
	const components = [];

	if (msg.content) {
		components.push(new TextDisplayBuilder().setContent(replaceVars(msg.content)));
	}

	components.push(container);
	payload.components = components;

	return payload;
};

const shouldThrottle = (memberState, now, cooldownMs) => {
	if (!cooldownMs) return false;
	return now - (memberState.lastMessageAt || 0) < cooldownMs;
};

export const ensureLevelingConfig = async (db, guildId) => {
	const guildData = await db.findOne({ guildId }) || { guildId };
	if (!guildData.leveling) {
		guildData.leveling = cloneDefault();
		await db.updateOne({ guildId }, { $set: { leveling: guildData.leveling } });
	}

	if (typeof guildData.leveling.autoCleanup === 'boolean') {
		const legacy = guildData.leveling.autoCleanup;
		guildData.leveling.autoCleanup = { leave: legacy, kick: legacy, ban: legacy };
		await db.updateOne({ guildId }, { $set: { leveling: guildData.leveling } });
	}
	return guildData.leveling;
};

export const handleMessageXp = async (client, message) => {
	if (!client?.db) return;

	const guildId = message.guildId;
	const leveling = await ensureLevelingConfig(client.db, guildId);
	if (!leveling?.enabled) return;
	if (shouldIgnoreMessage(message, leveling)) return;

	if (!leveling.xp.countCommands && client.prefix && message.content?.startsWith?.(client.prefix)) {
		return;
	}

	const memberState = ensureMember(leveling, message.author.id);
	const now = Date.now();
	if (shouldThrottle(memberState, now, leveling.xp.cooldownMs)) {
		return;
	}

	const rawXp = computeMessageXp(message, leveling);
	const result = addXp(leveling, memberState, rawXp);
	memberState.lastMessageAt = now;

	await client.db.updateOne({ guildId }, { $set: { leveling } });

	if (!result.leveledUp) return;

	await applyRewards(client, guildId, leveling, memberState, message.member);

	if (memberState.muteAnnouncements) return;

	const nextNeeded = xpToNextLevel(memberState.level, leveling);
	const ctx = {
		userMention: `<@${message.author.id}>`,
		userName: message.author.username,
		userTag: message.author.tag,
		userId: message.author.id,
		userAvatar: message.author.displayAvatarURL({ size: 512 }),
		level: memberState.level,
		xp: memberState.xp,
		totalXp: memberState.totalXp,
		nextLevelXp: nextNeeded,
		serverName: message.guild?.name || '',
		serverIcon: message.guild?.iconURL({ size: 512 }) || '',
		serverBanner: message.guild?.bannerURL({ size: 1024 }) || '',
		serverMembers: message.guild?.memberCount || 0
	};

	const payload = buildRichAnnouncement(leveling, ctx);

	const mode = leveling.announce?.mode || 'context';
	try {
		if (mode === 'none') return;
		if (mode === 'dm') {
			await message.author.send(payload).catch(() => {});
			return;
		}
		if (mode === 'channel') {
			const channelId = leveling.announce?.channelId;
			const channel = channelId ? await message.client.channels.fetch(channelId).catch(() => null) : null;
			if (channel && channel.isTextBased()) {
				await channel.send(payload).catch(() => {});
				return;
			}
		}
		await message.channel.send(payload).catch(() => {});
	} catch (err) {
		console.error('[Leveling] Failed to send level-up message:', err);
	}
};

const endVoiceSession = async (client, guildId, userId, now, channelId, member) => {
	const key = `${guildId}:${userId}`;
	const session = voiceSessions.get(key);
	if (!session) return;
	voiceSessions.delete(key);

	const durationMs = now - session.startedAt;
	const minutes = Math.floor(durationMs / 60_000);
	if (minutes <= 0) return;

	const leveling = await ensureLevelingConfig(client.db, guildId);
	if (!leveling?.enabled || !leveling.xp.voice?.enabled) return;
	if (leveling.ignores.channels?.includes(session.channelId)) return;
	if (leveling.ignores.channels?.includes(channelId)) return;
	if (leveling.ignores.users?.includes(userId)) return;
	if (leveling.ignores.roles?.length && member?.roles?.cache) {
		const blocked = member.roles.cache.some(r => leveling.ignores.roles.includes(r.id));
		if (blocked) return;
	}

	const memberState = ensureMember(leveling, userId);
	const xpGain = computeVoiceXp(minutes, leveling);
	const result = addXp(leveling, memberState, xpGain);
	memberState.lastVoiceAt = now;

	await client.db.updateOne({ guildId }, { $set: { leveling } });

	if (!result.leveledUp) return;

	await applyRewards(client, guildId, leveling, memberState, member);

	if (memberState.muteAnnouncements) return;

	const nextNeeded = xpToNextLevel(memberState.level, leveling);
	const memberUser = member?.user;
	const guild = member?.guild;
	const ctx = {
		userMention: `<@${userId}>`,
		userName: memberUser?.username || 'Member',
		userTag: memberUser?.tag || memberUser?.username || 'member',
		userId,
		userAvatar: memberUser?.displayAvatarURL?.({ size: 512 }) || '',
		level: memberState.level,
		xp: memberState.xp,
		totalXp: memberState.totalXp,
		nextLevelXp: nextNeeded,
		serverName: guild?.name || '',
		serverIcon: guild?.iconURL?.({ size: 512 }) || '',
		serverMembers: guild?.memberCount || 0
	};

	const payload = buildRichAnnouncement(leveling, ctx);

	try {
		const mode = leveling.announce?.mode || 'context';
		if (mode === 'none') return;
		if (mode === 'dm') {
			const user = await client.users.fetch(userId).catch(() => null);
			if (user) await user.send(payload).catch(() => {});
			return;
		}
		if (mode === 'channel') {
			const targetChannelId = leveling.announce?.channelId;
			const channel = targetChannelId ? await client.channels.fetch(targetChannelId).catch(() => null) : null;
			if (channel && channel.isTextBased()) {
				await channel.send(payload).catch(() => {});
				return;
			}
		}
		const channel = channelId ? await client.channels.fetch(channelId).catch(() => null) : null;
		if (channel && channel.isTextBased()) {
			await channel.send(payload).catch(() => {});
		}
	} catch (err) {
		console.error('[Leveling] Voice level-up message failed:', err);
	}
};

export const handleVoiceStateUpdate = async (client, oldState, newState) => {
	if (!client?.db) return;
	const user = newState?.member?.user || oldState?.member?.user;
	if (!user || user.bot) return;

	const guildId = newState?.guild?.id || oldState?.guild?.id;
	if (!guildId) return;

	const oldChannelId = oldState?.channelId;
	const newChannelId = newState?.channelId;
	const now = Date.now();

	const channelType = newState?.channel?.type ?? oldState?.channel?.type;
	if (channelType && ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channelType)) return;

	if (!oldChannelId && newChannelId) {
		voiceSessions.set(`${guildId}:${user.id}`, { startedAt: now, channelId: newChannelId });
		return;
	}

	if (oldChannelId && !newChannelId) {
		await endVoiceSession(client, guildId, user.id, now, oldChannelId, oldState?.member || newState?.member);
		return;
	}

	if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
		await endVoiceSession(client, guildId, user.id, now, oldChannelId, oldState?.member || newState?.member);
		voiceSessions.set(`${guildId}:${user.id}`, { startedAt: now, channelId: newChannelId });
	}
};
