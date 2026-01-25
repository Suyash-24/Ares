import {
	ContainerBuilder,
	SeparatorSpacingSize,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
	PermissionFlagsBits,
	TextDisplayBuilder,
	SectionBuilder,
	ThumbnailBuilder,
	MediaGalleryBuilder
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'giveaway';
const aliases = ['gw', 'giveaways'];
const SAFE_MENTIONS = { parse: [] };
const DEFAULT_COLOR = null;

function parseDuration(str) {
	if (!str || typeof str !== 'string') return null;
	const regex = /(\d+)\s*(d|h|m|s)/gi;
	let totalMs = 0;
	let match;
	while ((match = regex.exec(str)) !== null) {
		const val = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();
		if (unit === 'd') totalMs += val * 86400000;
		else if (unit === 'h') totalMs += val * 3600000;
		else if (unit === 'm') totalMs += val * 60000;
		else if (unit === 's') totalMs += val * 1000;
	}
	return totalMs > 0 ? totalMs : null;
}

function formatDuration(ms) {
	if (!ms || ms < 0) return '0s';
	const d = Math.floor(ms / 86400000);
	const h = Math.floor((ms % 86400000) / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	const parts = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (s > 0) parts.push(`${s}s`);
	return parts.length > 0 ? parts.join(' ') : '0s';
}

function formatTimestamp(ms) {
	return `<t:${Math.floor(ms / 1000)}:R>`;
}

function formatFullTimestamp(ms) {
	return `<t:${Math.floor(ms / 1000)}:F>`;
}

function parseMessageIdentifier(value) {
	if (!value) return null;

	const linkMatch = value.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
	if (linkMatch) {
		return { guildId: linkMatch[1], channelId: linkMatch[2], messageId: linkMatch[3] };
	}

	const idMatch = value.match(/^\d{10,}$/);
	if (idMatch) {
		return { messageId: value };
	}

	return null;
}

async function getGiveaway(client, guildId, messageId) {
	const data = await client.db.findOne({ guildId });
	if (!data?.giveaways) return null;
	return data.giveaways.find(g => g.messageId === messageId) || null;
}

async function getGiveawayById(client, guildId, giveawayId) {
	const data = await client.db.findOne({ guildId });
	if (!data?.giveaways) return null;
	return data.giveaways.find(g => g.giveawayId === giveawayId || g.messageId === giveawayId) || null;
}

async function getAllGiveaways(client, guildId) {
	const data = await client.db.findOne({ guildId });
	return data?.giveaways || [];
}

async function saveGiveaway(client, guildId, giveaway) {
	const data = await client.db.findOne({ guildId });
	const giveaways = data?.giveaways || [];
	const idx = giveaways.findIndex(g => g.messageId === giveaway.messageId);
	if (idx >= 0) giveaways[idx] = giveaway;
	else giveaways.push(giveaway);
	await client.db.updateOne({ guildId }, { $set: { giveaways } });
}

async function removeGiveaway(client, guildId, messageId) {
	const data = await client.db.findOne({ guildId });
	if (!data?.giveaways) return;
	const giveaways = data.giveaways.filter(g => g.messageId !== messageId);
	await client.db.updateOne({ guildId }, { $set: { giveaways } });
}

function buildResponseContainer(content, color = null) {
	const container = new ContainerBuilder();
	if (color) container.setAccentColor(color);
	container.addTextDisplayComponents(td => td.setContent(content));
	return container;
}

function replyContainer(message, content) {
	const container = buildResponseContainer(content);
	return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
}

function buildGiveawayContainer(giveaway, ended = false) {
	giveaway.entries = giveaway.entries || [];
	giveaway.winners = giveaway.winners || [];
	giveaway.giveawayId = giveaway.giveawayId || giveaway.messageId;
	const container = new ContainerBuilder();

	if (giveaway.color) {
		container.setAccentColor(giveaway.color);
	}

	const titleEmoji = EMOJIS.tada || '🎉';
	container.addTextDisplayComponents(td =>
		td.setContent(`# ${titleEmoji} ${giveaway.prize}`)
	);

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));

	if (giveaway.description) {
		container.addTextDisplayComponents(td => td.setContent(giveaway.description));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	}

	const arrow = EMOJIS.giveawayarrow || '➡️';
	let infoText = '';
	if (ended) {
		const winners = giveaway.winners?.length > 0
			? giveaway.winners.map(id => `<@${id}>`).join(', ')
			: 'No valid winners';
		infoText = `${arrow} **Winners:** ${winners}\n`;
		infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
		infoText += `${arrow} **Ended:** ${formatFullTimestamp(giveaway.endTime)}`;
	} else {
		infoText = `${arrow} **Ends:** ${formatTimestamp(giveaway.endTime)}\n`;
		infoText += `${arrow} **Winners:** ${giveaway.winnerCount}\n`;
		if (giveaway.winnerRoles?.length > 0) {
			infoText += `${arrow} **Prize Roles:** ${giveaway.winnerRoles.map(r => `<@&${r}>`).join(', ')}\n`;
		}
		infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
		infoText += `${arrow} **Hosted by:** <@${giveaway.hostId}>`;
	}

	if (giveaway.thumbnail) {
		container.addSectionComponents(section => {
			section.addTextDisplayComponents(td => td.setContent(infoText));
			section.setThumbnailAccessory(thumb => thumb.setURL(giveaway.thumbnail));
			return section;
		});
	} else {
		container.addTextDisplayComponents(td => td.setContent(infoText));
	}

	const requirements = [];
	if (giveaway.requiredRoles?.length > 0) {
		requirements.push(`**Required Roles:** ${giveaway.requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
	}
	if (giveaway.minLevel > 0) {
		requirements.push(`**Min Level:** ${giveaway.minLevel}`);
	}
	if (giveaway.maxLevel > 0) {
		requirements.push(`**Max Level:** ${giveaway.maxLevel}`);
	}
	if (giveaway.minAge > 0) {
		requirements.push(`**Min Account Age:** ${giveaway.minAge} days`);
	}
	if (giveaway.minStay > 0) {
		requirements.push(`**Min Server Stay:** ${giveaway.minStay} days`);
	}

	if (requirements.length > 0) {
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`### Requirements\n${requirements.join('\n')}`));
	}

	if (giveaway.image) {
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		const gallery = new MediaGalleryBuilder().addItems(item => item.setURL(giveaway.image));
		container.addMediaGalleryComponents(gallery);
	}

	if (!ended) {
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const parseButtonEmoji = (emojiStr) => {
			const match = emojiStr?.match(/<(a)?:(\w+):(\d+)>/);
			if (match) {
				return { id: match[3], name: match[2], animated: !!match[1] };
			}
			return emojiStr;
		};

		const joinRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`giveaway_join:${giveaway.giveawayId}`)
				.setEmoji(parseButtonEmoji(EMOJIS.tada) || '🎉')
				.setLabel(`Enter (${giveaway.entries?.length || 0})`)
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`giveaway_view:${giveaway.giveawayId}`)
				.setEmoji(parseButtonEmoji(EMOJIS.giveaway) || '👥')
				.setLabel('View Participants')
				.setStyle(ButtonStyle.Secondary)
		);
		container.addActionRowComponents(joinRow);
	}

	return container;
}

function pickWinners(entries, count) {
	if (!entries || entries.length === 0) return [];
	const shuffled = [...entries].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function checkRequirements(member, giveaway, client) {
	const errors = [];

	if (giveaway.requiredRoles?.length > 0) {
		const hasRole = giveaway.requiredRoles.some(roleId => member.roles.cache.has(roleId));
		if (!hasRole) {
			errors.push('You need one of the required roles to enter.');
		}
	}

	if (giveaway.minLevel > 0 || giveaway.maxLevel > 0) {
		const data = await client.db.findOne({ guildId: member.guild.id });
		const userLevel = data?.leveling?.members?.[member.id]?.level || 0;
		if (giveaway.minLevel > 0 && userLevel < giveaway.minLevel) {
			errors.push(`You need to be at least level ${giveaway.minLevel} to enter.`);
		}
		if (giveaway.maxLevel > 0 && userLevel > giveaway.maxLevel) {
			errors.push(`You cannot be higher than level ${giveaway.maxLevel} to enter.`);
		}
	}

	if (giveaway.minAge > 0) {
		const accountAge = (Date.now() - member.user.createdTimestamp) / 86400000;
		if (accountAge < giveaway.minAge) {
			errors.push(`Your account must be at least ${giveaway.minAge} days old.`);
		}
	}

	if (giveaway.minStay > 0) {
		const stayDays = (Date.now() - member.joinedTimestamp) / 86400000;
		if (stayDays < giveaway.minStay) {
			errors.push(`You must be in the server for at least ${giveaway.minStay} days.`);
		}
	}

	return errors;
}

async function awardWinnerRoles(guild, giveaway) {
	if (!giveaway.winnerRoles?.length || !giveaway.winners?.length) return;

	for (const winnerId of giveaway.winners) {
		try {
			const member = await guild.members.fetch(winnerId).catch(() => null);
			if (member) {
				for (const roleId of giveaway.winnerRoles) {
					await member.roles.add(roleId).catch(() => {});
				}
			}
		} catch {}
	}
}

async function endGiveaway(client, giveaway, guild) {
	const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
	if (!channel) return null;

	const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
	if (!message) return null;

	const validEntries = [];
	for (const userId of giveaway.entries || []) {
		const member = await guild.members.fetch(userId).catch(() => null);
		if (member) {
			const errors = await checkRequirements(member, giveaway, client);
			if (errors.length === 0) validEntries.push(userId);
		}
	}

	const winners = pickWinners(validEntries, giveaway.winnerCount);
	giveaway.winners = winners;
	giveaway.ended = true;

	const container = buildGiveawayContainer(giveaway, true);
	await message.edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});

	await awardWinnerRoles(guild, giveaway);

	await saveGiveaway(client, guild.id, giveaway);

	if (winners.length > 0) {
		const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
		const winContainer = buildResponseContainer(`# 🎊 Congratulations!\n${winnerMentions} won **${giveaway.prize}**!`);
		await channel.send({
			components: [winContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { users: winners }
		}).catch(() => {});
	} else {
		const noWinContainer = buildResponseContainer(`# 😢 No Winners\nNo valid entries for **${giveaway.prize}**. The giveaway ended with no winners.`);
		await channel.send({
			components: [noWinContainer],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: SAFE_MENTIONS
		}).catch(() => {});
	}

	return giveaway;
}

const execute = async (message, args, client) => {
	if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {

		if (args[0]?.toLowerCase() !== 'list') {
			const permContainer = buildResponseContainer(`${EMOJIS.error} You need **Manage Channels** permission.`);
			return message.reply({ components: [permContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}
	}

	const sub = args[0]?.toLowerCase();

	if (!sub || sub === 'help') {
		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td => td.setContent('# 🎉 Giveaway Commands'));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(
			'**Starting a Giveaway**\n' +
			'`.giveaway start <channel> <duration> <winners> <prize> [options]`\n\n' +
			'**Optional Flags** (add any to start command):\n' +
			'`--desc <text>` `--color #hex` `--image <url>` `--thumb <url>`\n' +
			'`--reqroles @role` `--roles @role` `--minlevel 10` `--maxlevel 50`\n' +
			'`--age 30` `--stay 7` `--host @user`\n\n' +
			'**Managing**\n' +
			'`.giveaway end <id>` `.giveaway reroll <id>` `.giveaway cancel <id>` `.giveaway list`\n\n' +
			'**Editing** (use `.giveaway edit <property> <id> <value>`):\n' +
			'`prize` `winners` `duration` `host` `description` `color` `image` `thumbnail`\n' +
			'`requiredroles` `roles` `minlevel` `maxlevel` `age` `stay`'
		));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(
			'**📋 Full Template:**\n' +
			'```\n.giveaway start #giveaways 2d 1 Nitro Classic --desc Win this amazing prize! --color #8A5FFF --image https://example.com/banner.png --thumb https://example.com/icon.png --reqroles @Vip --roles @Winner --minlevel 10 --maxlevel 100 --age 30 --stay 7```'
		));
		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'start') {

		const fullArgs = args.slice(1).join(' ');

		const flagPattern = /--(\w+)\s+([^--]+?)(?=\s*--|$)/gi;
		const flags = {};
		let match;
		while ((match = flagPattern.exec(fullArgs)) !== null) {
			flags[match[1].toLowerCase()] = match[2].trim();
		}

		const cleanArgs = fullArgs.replace(/--\w+\s+[^--]+?(?=\s*--|$)/gi, '').trim().split(/\s+/);

		const channelArg = cleanArgs[0];
		let channel = message.mentions.channels.first();
		if (!channel && channelArg) {
			channel = message.guild.channels.cache.get(channelArg.replace(/[<#>]/g, '')) ||
				message.guild.channels.cache.find(c => c.name === channelArg);
		}
		if (!channel) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Please specify a valid channel.\n**Usage:** \`.giveaway start #channel 1d 1 Nitro\``);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const durationArg = cleanArgs[1];
		const durationMs = parseDuration(durationArg);
		if (!durationMs) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Invalid duration. Use formats like \`1d\`, \`2h30m\`, \`1d12h\``);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const winnersArg = cleanArgs[2];
		const winnerCount = parseInt(winnersArg, 10);
		if (!winnerCount || winnerCount < 1 || winnerCount > 50) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Winner count must be between 1 and 50.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const prizeEndIndex = fullArgs.indexOf('--');
		let prize;
		if (prizeEndIndex > -1) {

			const beforeFlags = fullArgs.substring(0, prizeEndIndex).trim();
			const parts = beforeFlags.split(/\s+/);
			prize = parts.slice(3).join(' ');
		} else {
			prize = cleanArgs.slice(3).join(' ');
		}

		if (!prize) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Please specify a prize.\n**Usage:** \`.giveaway start #channel 1d 1 Nitro Classic\``);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const endTime = Date.now() + durationMs;
		const giveawayId = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
		const giveaway = {
			giveawayId,
			messageId: null,
			channelId: channel.id,
			guildId: message.guild.id,
			hostId: message.author.id,
			prize,
			description: null,
			winnerCount,
			entries: [],
			winners: [],
			startTime: Date.now(),
			endTime,
			ended: false,
			color: null,
			thumbnail: null,
			image: null,
			requiredRoles: [],
			winnerRoles: [],
			minLevel: 0,
			maxLevel: 0,
			minAge: 0,
			minStay: 0
		};

		if (flags.description || flags.desc) {
			giveaway.description = flags.description || flags.desc;
		}
		if (flags.color) {
			const hex = flags.color.replace('#', '');
			if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
				giveaway.color = parseInt(hex, 16);
			}
		}
		if (flags.image) {
			if (/^https?:\/\/.+/.test(flags.image)) {
				giveaway.image = flags.image;
			}
		}
		if (flags.thumbnail || flags.thumb) {
			const thumbUrl = flags.thumbnail || flags.thumb;
			if (/^https?:\/\/.+/.test(thumbUrl)) {
				giveaway.thumbnail = thumbUrl;
			}
		}
		if (flags.requiredroles || flags.reqroles) {
			const rolesStr = flags.requiredroles || flags.reqroles;
			const roleIds = rolesStr.match(/\d{17,}/g) || [];
			if (roleIds.length > 0) giveaway.requiredRoles = roleIds;
		}
		if (flags.roles || flags.winnerroles || flags.prizeroles) {
			const rolesStr = flags.roles || flags.winnerroles || flags.prizeroles;
			const roleIds = rolesStr.match(/\d{17,}/g) || [];
			if (roleIds.length > 0) giveaway.winnerRoles = roleIds;
		}
		if (flags.minlevel) {
			const lvl = parseInt(flags.minlevel, 10);
			if (!isNaN(lvl) && lvl >= 0) giveaway.minLevel = lvl;
		}
		if (flags.maxlevel) {
			const lvl = parseInt(flags.maxlevel, 10);
			if (!isNaN(lvl) && lvl >= 0) giveaway.maxLevel = lvl;
		}
		if (flags.age || flags.minage) {
			const days = parseInt(flags.age || flags.minage, 10);
			if (!isNaN(days) && days >= 0) giveaway.minAge = days;
		}
		if (flags.stay || flags.minstay) {
			const days = parseInt(flags.stay || flags.minstay, 10);
			if (!isNaN(days) && days >= 0) giveaway.minStay = days;
		}
		if (flags.host) {
			const hostId = flags.host.match(/\d{17,}/)?.[0];
			if (hostId) giveaway.hostId = hostId;
		}

		const container = buildGiveawayContainer(giveaway);
		const sentMsg = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		giveaway.messageId = sentMsg.id;

		await saveGiveaway(client, message.guild.id, giveaway);

		const delay = durationMs;
		setTimeout(async () => {
			const current = await getGiveaway(client, message.guild.id, giveaway.messageId);

			if (current && !current.ended && Date.now() >= current.endTime) {
				await endGiveaway(client, current, message.guild);
			}
		}, delay);

		const successContainer = buildResponseContainer(`${EMOJIS.success} Giveaway started in ${channel}!\n🔗 ${sentMsg.url}`);
		return message.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'end') {
		const link = args[1];
		const parsed = parseMessageIdentifier(link);
		if (!parsed) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Please provide a valid message link or ID.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		let giveaway = await getGiveaway(client, message.guild.id, parsed.messageId);
		if (!giveaway) {
			giveaway = await getGiveawayById(client, message.guild.id, parsed.messageId);
		}
		if (!giveaway) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Giveaway not found.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}
		if (giveaway.ended) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} This giveaway has already ended.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		await endGiveaway(client, giveaway, message.guild);
		const endedContainer = buildResponseContainer(`${EMOJIS.success} Giveaway ended early!`);
		return message.reply({ components: [endedContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'reroll') {
		const link = args[1];
		const parsed = parseMessageIdentifier(link);
		if (!parsed) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Please provide a valid message link or ID.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		let giveaway = await getGiveaway(client, message.guild.id, parsed.messageId);
		if (!giveaway) {
			giveaway = await getGiveawayById(client, message.guild.id, parsed.messageId);
		}
		if (!giveaway) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Giveaway not found.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}
		if (!giveaway.ended) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} This giveaway hasn't ended yet. Use \`.giveaway end\` first.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const rerollCount = parseInt(args[2], 10) || giveaway.winnerCount;

		const validEntries = [];
		for (const userId of giveaway.entries || []) {
			const member = await message.guild.members.fetch(userId).catch(() => null);
			if (member) {
				const errors = await checkRequirements(member, giveaway, client);
				if (errors.length === 0) validEntries.push(userId);
			}
		}

		const newWinners = pickWinners(validEntries, rerollCount);
		if (newWinners.length === 0) {
			const noEntriesContainer = buildResponseContainer(`${EMOJIS.error} No valid entries to reroll.`);
			return message.reply({ components: [noEntriesContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		giveaway.winners = newWinners;
		await saveGiveaway(client, message.guild.id, giveaway);

		const channel = await message.guild.channels.fetch(giveaway.channelId).catch(() => null);
		if (channel) {
			const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
			if (msg) {
				const container = buildGiveawayContainer(giveaway, true);
				await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
			}

			await awardWinnerRoles(message.guild, giveaway);

			const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
			const rerollContainer = buildResponseContainer(`# 🎊 Reroll!\nCongratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
			await channel.send({
				components: [rerollContainer],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { users: newWinners }
			}).catch(() => {});
		}

		const rerollSuccessContainer = buildResponseContainer(`${EMOJIS.success} Rerolled **${newWinners.length}** winner(s)!`);
		return message.reply({ components: [rerollSuccessContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'cancel') {
		const link = args[1];
		const parsed = parseMessageIdentifier(link);
		if (!parsed) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Please provide a valid message link or ID.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		let giveaway = await getGiveaway(client, message.guild.id, parsed.messageId);
		if (!giveaway) {
			giveaway = await getGiveawayById(client, message.guild.id, parsed.messageId);
		}
		if (!giveaway) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} Giveaway not found.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const channel = await message.guild.channels.fetch(giveaway.channelId).catch(() => null);
		if (channel) {
			const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
			if (msg) await msg.delete().catch(() => {});
		}

		await removeGiveaway(client, message.guild.id, giveaway.messageId);

		const cancelContainer = buildResponseContainer(`${EMOJIS.success} Giveaway cancelled and deleted.`);
		return message.reply({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'list') {
		const giveaways = await getAllGiveaways(client, message.guild.id);
		if (giveaways.length === 0) {
			const errContainer = buildResponseContainer(`${EMOJIS.error} No giveaways found.`);
			return message.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
		}

		const container = new ContainerBuilder();
		container.addTextDisplayComponents(td => td.setContent('# 🎉 Giveaways'));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

		const active = giveaways.filter(g => !g.ended);
		const ended = giveaways.filter(g => g.ended);

		if (active.length > 0) {
			let activeText = '### Active Giveaways\n';
			for (const g of active.slice(0, 10)) {
				activeText += `• **${g.prize}** - ${g.entries?.length || 0} entries - Ends ${formatTimestamp(g.endTime)}\n`;
				activeText += `  [Jump to message](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})\n`;
			}
			container.addTextDisplayComponents(td => td.setContent(activeText));
		}

		if (ended.length > 0) {
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			let endedText = '### Past Giveaways\n';
			for (const g of ended.slice(0, 10)) {
				const winners = g.winners?.length > 0 ? g.winners.map(id => `<@${id}>`).join(', ') : 'None';
				endedText += `• **${g.prize}** - Winners: ${winners}\n`;
			}
			container.addTextDisplayComponents(td => td.setContent(endedText));
		}

		return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS });
	}

	if (sub === 'edit') {
		const prop = args[1]?.toLowerCase();
		const link = args[2];
		const parsed = parseMessageIdentifier(link);

		if (!parsed) {
			return replyContainer(message, `${EMOJIS.error} Please provide a valid message link or ID.\n**Usage:** \`.giveaway edit prize <link|id> <new_prize>\``);
		}

		let giveaway = await getGiveaway(client, message.guild.id, parsed.messageId);
		if (!giveaway) {
			giveaway = await getGiveawayById(client, message.guild.id, parsed.messageId);
		}
		if (!giveaway) {
			return replyContainer(message, `${EMOJIS.error} Giveaway not found.`);
		}
		if (giveaway.ended) {
			return replyContainer(message, `${EMOJIS.error} Cannot edit an ended giveaway.`);
		}

		const value = args.slice(3).join(' ');

		switch (prop) {
			case 'prize': {
				if (!value) return replyContainer(message, `${EMOJIS.error} Please specify a new prize.`);
				giveaway.prize = value;
				break;
			}
			case 'winners': {
				const count = parseInt(value, 10);
				if (!count || count < 1 || count > 50) {
					return replyContainer(message, `${EMOJIS.error} Winner count must be between 1 and 50.`);
				}
				giveaway.winnerCount = count;
				break;
			}
			case 'duration': {
				const ms = parseDuration(value);
				if (!ms) return replyContainer(message, `${EMOJIS.error} Invalid duration format.`);
				giveaway.endTime = Date.now() + ms;

				setTimeout(async () => {
					const current = await getGiveaway(client, message.guild.id, giveaway.messageId);

					if (current && !current.ended && Date.now() >= current.endTime) {
						await endGiveaway(client, current, message.guild);
					}
				}, ms);
				break;
			}
			case 'host': {
				let user = message.mentions.users.first();
				if (!user && value) {

					const userId = value.replace(/[<@!>]/g, '');
					if (/^\d{17,}$/.test(userId)) {
						user = await client.users.fetch(userId).catch(() => null);
					}
				}
				if (!user) return replyContainer(message, `${EMOJIS.error} Please mention a user or provide a valid user ID.`);
				giveaway.hostId = user.id;
				break;
			}
			case 'description': {
				giveaway.description = value || null;
				break;
			}
			case 'color': {
				if (!value || value.toLowerCase() === 'none') {
					giveaway.color = null;
				} else {
					const hex = value.replace('#', '');
					if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
						return replyContainer(message, `${EMOJIS.error} Invalid hex color. Use format like \`#FF5733\` or \`none\`.`);
					}
					giveaway.color = parseInt(hex, 16);
				}
				break;
			}
			case 'image': {
				if (!value || value.toLowerCase() === 'none') {
					giveaway.image = null;
				} else if (!/^https?:\/\/.+/.test(value)) {
					return replyContainer(message, `${EMOJIS.error} Please provide a valid image URL.`);
				} else {
					giveaway.image = value;
				}
				break;
			}
			case 'thumbnail': {
				if (!value || value.toLowerCase() === 'none') {
					giveaway.thumbnail = null;
				} else if (!/^https?:\/\/.+/.test(value)) {
					return replyContainer(message, `${EMOJIS.error} Please provide a valid thumbnail URL.`);
				} else {
					giveaway.thumbnail = value;
				}
				break;
			}
			case 'requiredroles': {

				let roles = message.mentions.roles.map(r => r.id);
				if (roles.length === 0 && value) {

					const idMatches = value.match(/\d{17,}/g);
					if (idMatches) {
						roles = idMatches;
					}
				}
				if (value?.toLowerCase() === 'none' || value?.toLowerCase() === 'clear') {
					roles = [];
				}
				giveaway.requiredRoles = roles;
				break;
			}
			case 'roles':
			case 'winnerroles': {

				let roles = message.mentions.roles.map(r => r.id);
				if (roles.length === 0 && value) {

					const idMatches = value.match(/\d{17,}/g);
					if (idMatches) {
						roles = idMatches;
					}
				}
				if (value?.toLowerCase() === 'none' || value?.toLowerCase() === 'clear') {
					roles = [];
				}
				giveaway.winnerRoles = roles;
				break;
			}
			case 'minlevel': {
				const lvl = parseInt(value, 10);
				if (isNaN(lvl) || lvl < 0) return replyContainer(message, `${EMOJIS.error} Invalid level.`);
				giveaway.minLevel = lvl;
				break;
			}
			case 'maxlevel': {
				const lvl = parseInt(value, 10);
				if (isNaN(lvl) || lvl < 0) return replyContainer(message, `${EMOJIS.error} Invalid level.`);
				giveaway.maxLevel = lvl;
				break;
			}
			case 'age': {
				const days = parseInt(value, 10);
				if (isNaN(days) || days < 0) return replyContainer(message, `${EMOJIS.error} Invalid days.`);
				giveaway.minAge = days;
				break;
			}
			case 'stay': {
				const days = parseInt(value, 10);
				if (isNaN(days) || days < 0) return replyContainer(message, `${EMOJIS.error} Invalid days.`);
				giveaway.minStay = days;
				break;
			}
			default:
				return replyContainer(message, `${EMOJIS.error} Unknown property. Use \`.giveaway help\` for options.`);
		}

		await saveGiveaway(client, message.guild.id, giveaway);

		const channel = await message.guild.channels.fetch(giveaway.channelId).catch(() => null);
		if (channel) {
			const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
			if (msg) {
				const container = buildGiveawayContainer(giveaway);
				await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
			}
		}

		return replyContainer(message, `${EMOJIS.success} Giveaway updated!`);
	}

	return replyContainer(message, `${EMOJIS.error} Unknown subcommand. Use \`.giveaway help\` for options.`);
};

	const components = [
	{
		customId: /^giveaway_join:([\w-]+)$/,
		execute: async (interaction) => {
			try {
				const [, giveawayId] = interaction.customId.match(/^giveaway_join:([\w-]+)$/) || [];
				const giveaway = await getGiveawayById(interaction.client, interaction.guildId, giveawayId);
				if (!giveaway) {
					return interaction.reply({ content: `${EMOJIS.error} Giveaway not found.`, ephemeral: true });
				}
				if (giveaway.ended) {
					return interaction.reply({ content: `${EMOJIS.error} This giveaway has ended.`, ephemeral: true });
				}

				giveaway.entries = giveaway.entries || [];

				const errors = await checkRequirements(interaction.member, giveaway, interaction.client);
				if (errors.length > 0) {
					return interaction.reply({ content: `${EMOJIS.error} ${errors.join('\n')}`, ephemeral: true });
				}

				const idx = giveaway.entries.indexOf(interaction.user.id);
				if (idx >= 0) {
					giveaway.entries.splice(idx, 1);
					await saveGiveaway(interaction.client, interaction.guildId, giveaway);

					const container = buildGiveawayContainer(giveaway);
					await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
					await interaction.followUp({ content: `${EMOJIS.success} You left the giveaway.`, ephemeral: true }).catch(() => {});
				} else {
					giveaway.entries.push(interaction.user.id);
					await saveGiveaway(interaction.client, interaction.guildId, giveaway);

					const container = buildGiveawayContainer(giveaway);
					await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: SAFE_MENTIONS }).catch(() => {});
					await interaction.followUp({ content: `${EMOJIS.success} You entered the giveaway! Good luck! 🍀`, ephemeral: true }).catch(() => {});
				}
			} catch (err) {
				console.error('[giveaway_join] failed:', err);
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({ content: `${EMOJIS.error} Something went wrong. Please try again.`, ephemeral: true }).catch(() => {});
				}
			}
		}
	},
	{
		customId: /^giveaway_view:([\w-]+)$/,
		execute: async (interaction) => {
			try {
				const [, giveawayId] = interaction.customId.match(/^giveaway_view:([\w-]+)$/) || [];
				const giveaway = await getGiveawayById(interaction.client, interaction.guildId, giveawayId);
				if (!giveaway) {
					return interaction.reply({ content: `${EMOJIS.error} Giveaway not found.`, ephemeral: true });
				}

				const entries = giveaway.entries || [];
				if (entries.length === 0) {
					return interaction.reply({ content: `${EMOJIS.giveawayarrow || '➡️'} No participants yet.`, ephemeral: true });
				}

				const preview = entries.slice(0, 25).map((id, i) => `${i + 1}. <@${id}>`).join('\n');
				const more = entries.length > 25 ? `\n...and ${entries.length - 25} more` : '';
				return interaction.reply({ content: `${EMOJIS.giveawayarrow || '➡️'} Participants (${entries.length}):\n${preview}${more}`, ephemeral: true, allowedMentions: SAFE_MENTIONS });
			} catch (err) {
				console.error('[giveaway_view] failed:', err);
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({ content: `${EMOJIS.error} Unable to fetch participants right now.`, ephemeral: true }).catch(() => {});
				}
			}
		}
	}
];

export default { name, aliases, category: 'Giveaways', execute, components };
export { getGiveaway, getAllGiveaways, saveGiveaway, endGiveaway, buildGiveawayContainer, checkRequirements, pickWinners };
