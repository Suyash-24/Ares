import { AuditLogEvent, Events, PermissionFlagsBits } from 'discord.js';
import { initializeTemporaryRoleManager } from '../utils/temporaryRoleManager.js';
import { initializeSlowmodeManager } from '../utils/slowmodeManager.js';
import { buildWelcomeEmbed, buildWelcomeButtons, replacePlaceholders } from '../commands/prefix/Welcome/welcome.js';
import { buildGoodbyeEmbed, buildGoodbyeButtons, replacePlaceholders as replaceGoodbyePlaceholders } from '../commands/prefix/Welcome/goodbye.js';
import { ensureLevelingConfig } from '../utils/leveling.js';
import { handleVoiceStats, handleMemberJoin, handleMemberLeave, initializeVoiceSessions } from '../events/statsHandler.js';
import { handleReady as inviteTrackerReady, handleInviteCreate, handleInviteDelete, handleGuildMemberAdd as inviteTrackerMemberAdd, handleGuildMemberRemove as inviteTrackerMemberRemove, handleGuildCreate as inviteTrackerGuildCreate } from '../events/inviteTrackerHandler.js';

export default function registerReadyEvent(discordClient, config) {
	discordClient.once(Events.ClientReady, async (readyClient) => {
		console.log(`
┌─────────────────────────────────────────────────────────────┐
│                   ARES IS ONLINE                            │
│           Logged in as ${readyClient.user.tag.padEnd(29, ' ')}│
│                                                             │
│  Bot ID:      ${readyClient.user.id.padEnd(30, ' ')}│
│  Guilds:      ${readyClient.guilds.cache.size.toString().padEnd(30, ' ')}│
│  Users:       ${readyClient.users.cache.size.toString().padEnd(30, ' ')}│
└─────────────────────────────────────────────────────────────┘
`);
		console.log('🎧 [Shoukaku] Music system ready');

		await restoreDetainedUsers(readyClient);

		await initializeTemporaryRoleManager(readyClient);

		await initializeSlowmodeManager(readyClient);

		await inviteTrackerReady(readyClient);

		await initializeVoiceSessions(readyClient);

		const SUBCOMMAND_REGISTRY = {
			'antiraid': { 'config': 1, 'enable': 1, 'disable': 1, 'massjoin': 1, 'avatar': 1, 'newaccounts': 1, 'state': 1, 'whitelist': 1, 'log': 1 },
			'automod': { 'on': 1, 'off': 1, 'config': 1, 'module': 1, 'preset': 1, 'ignore': 1, 'unignore': 1, 'words': 1, 'logchannel': 1, 'stats': 1, 'strikes': 1, 'notify': 1, 'reset': 1 },
			'antinuke': { 'wizard': 1, 'setup': 1, 'enable': 1, 'disable': 1, 'preset': 1, 'admin': 1, 'admins': 1, 'extraowner': 1, 'extraowners': 1, 'whitelist': 1, 'list': 1, 'config': 1, 'protocol': 1, 'unprotocol': 1, 'protocol-list': 1, 'logs': 1, 'punishment': 1, 'threshold': 1, 'strictbot': 1, 'reset': 1 },
			'welcome': { 'add': 1, 'remove': 1, 'list': 1, 'config': 1, 'toggle': 1, 'enable': 1, 'disable': 1, 'test': 1, 'reset': 1, 'show': 1 },
			'goodbye': { 'add': 1, 'remove': 1, 'list': 1, 'config': 1, 'toggle': 1, 'enable': 1, 'disable': 1, 'test': 1, 'reset': 1, 'show': 1 },
			'ticket': { 'create': 1, 'new': 1, 'open': 1, 'setup': 1, 'panel': 1, 'removepanel': 1, 'add': 1, 'remove': 1, 'claim': 1, 'close': 1, 'reopen': 1, 'rename': 1, 'transcript': 1, 'delete': 1, 'list': 1, 'stats': 1 },
			'giveaway': { 'start': 1, 'end': 1, 'reroll': 1, 'cancel': 1, 'list': 1, 'edit': 1 },
			'starboard': { 'unlock': 1, 'enable': 1, 'lock': 1, 'disable': 1, 'set': 1, 'channel': 1, 'emoji': 1, 'selfstar': 1, 'color': 1, 'timestamp': 1, 'jumpurl': 1, 'attachments': 1, 'ignore': 1, 'config': 1, 'reset': 1 },
			'birthday': { 'set': 1, 'view': 1, 'upcoming': 1, 'remove': 1, 'setup': 1, 'check': 1, 'config': 1 },
			'customrole': { 'add': 1, 'remove': 1, 'view': 1, 'list': 1, 'reqrole': 1 },
			'noprefix': { 'add': 1, 'remove': 1, 'list': 1, 'status': 1 },
			'bumpreminder': { 'channel': 1, 'enable': 1, 'disable': 1, 'thankyou': 1, 'message': 1, 'autolock': 1, 'autoclean': 1, 'config': 1 },
			'logs': { 'search': 1, 'export': 1, 'ignore': 1, 'status': 1, 'purge': 1, 'stats': 1 }
		};

		const getSubcommandCount = (cmd) => {
			const registered = SUBCOMMAND_REGISTRY[cmd.name?.toLowerCase()];
			if (registered) return Object.keys(registered).length;

			if (cmd.usage) {
				const match = cmd.usage.match(/<([^>]+\|[^>]+)>/);
				if (match) return match[1].split('|').length;
			}
			return 1;
		};

		let totalCommands = 0;
		readyClient.prefixCommands.forEach((cmd) => {
			if (cmd.category === 'Bot Owner') return;
			totalCommands += getSubcommandCount(cmd);
		});

		readyClient.user.setPresence({
			activities: [{
				name: `/help | ${totalCommands} commands`,
				type: 3
			}],
			status: 'online'
		});

		readyClient.on(Events.GuildMemberAdd, async (member) => {
			try {
				const guild = member.guild;
				const db = readyClient.db;
				if (!db) return;

				try {
					await handleMemberJoin(member, readyClient);
				} catch (e) {
					console.error('[Stats] Member join stats error:', e);
				}

				try {
					await inviteTrackerMemberAdd(member, readyClient);
				} catch (e) {
					console.error('[InviteTracker] Member add error:', e);
				}

				const guildData = await db.findOne({ guildId: guild.id }) || {};

				try {
					const rawForced = guildData.moderation?.forcedNicknames?.[member.id];
						const forcedNick = rawForced && typeof rawForced === 'object' ? rawForced.nickname : rawForced;
						if (forcedNick && guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
							const botHighest = guild.members.me.roles.highest?.position ?? 0;
							const targetHighest = member.roles.highest?.position ?? 0;
							if (botHighest > targetHighest && member.id !== guild.ownerId && (!member.roles.highest?.managed || member.user?.bot)) {
								await member.setNickname(forcedNick, 'Restore forced nickname on join').catch(() => {});
							}
						}
				} catch (e) {
					console.error('[forcenickname] guildMemberAdd restore error:', e);
				}

				if (guildData.welcome?.enabled && guildData.welcome?.channels?.length > 0) {
					for (const channelConfig of guildData.welcome.channels) {
						try {
							const welcomeChannel = guild.channels.cache.get(channelConfig.channelId);
							if (!welcomeChannel) continue;

							const embed = buildWelcomeEmbed(channelConfig, member);
							const messageContent = channelConfig.content ? replacePlaceholders(channelConfig.content, member) : null;
							const buttonRow = buildWelcomeButtons(channelConfig, member);

							if (!messageContent && !embed) continue;

							const sendOptions = { allowedMentions: { parse: ['users'] } };
							if (messageContent) sendOptions.content = messageContent;
							if (embed) sendOptions.embeds = [embed];
							if (buttonRow) sendOptions.components = [buttonRow];

							const sentMsg = await welcomeChannel.send(sendOptions).catch(e => console.error('[welcome] send error:', e));

							if (sentMsg && channelConfig.selfDestruct) {
								setTimeout(() => sentMsg.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
							}
						} catch (e) {
							console.error('[welcome] channel send error:', e);
						}
					}
				}

				else if (guildData.welcome?.enabled && guildData.welcome?.channel) {
					try {
						const welcomeChannel = guild.channels.cache.get(guildData.welcome.channel);
						if (welcomeChannel) {
							const config = guildData.welcome;
							const embed = buildWelcomeEmbed(config, member);
							const messageContent = config.content ? replacePlaceholders(config.content, member) : null;

							if (messageContent || embed) {
								const sendOptions = { allowedMentions: { parse: ['users'] } };
								if (messageContent) sendOptions.content = messageContent;
								if (embed) sendOptions.embeds = [embed];
								await welcomeChannel.send(sendOptions).catch(e => console.error('[welcome] send error:', e));
							}
						}
					} catch (e) {
						console.error('[welcome] guildMemberAdd error:', e);
					}
				}

				if (!guildData.binds) return;
				const rolesToRestore = guildData.binds[member.id];
				if (!rolesToRestore || !rolesToRestore.length) return;
				const botMember = guild.members.me || guild.members.cache.get(readyClient.user.id);
				const botHighest = botMember.roles.highest?.position ?? 0;
				const validRoles = [];
				for (const rid of rolesToRestore) {
					const role = guild.roles.cache.get(rid);
					if (!role) continue;
					if (role.managed) continue;
					if (role.id === guild.id) continue;
					if (role.position >= botHighest) continue;
					validRoles.push(role.id);
				}
				if (validRoles.length === 0) return;
				try {
					await member.roles.add(validRoles, 'Sticky roles restored on rejoin');
					console.log(`[bindrole] Restored ${validRoles.length} role(s) for ${member.id} in ${guild.id}`);
				} catch (e) {
					console.error('[bindrole] failed to restore roles on guildMemberAdd:', e);
				}
			} catch (err) {
				console.error('[bindrole] guildMemberAdd handler error:', err);
			}
		});

		readyClient.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
			try {
				if (!readyClient.db) return;
				const guild = newMember.guild;
				const guildData = await readyClient.db.findOne({ guildId: guild.id }) || {};
				const rawForced = guildData.moderation?.forcedNicknames?.[newMember.id];
				const forced = rawForced && typeof rawForced === 'object' ? rawForced.nickname : rawForced;
				if (!forced) return;
				if (newMember.displayName === forced) return;
				const botMember = guild.members.me || guild.members.cache.get(readyClient.user.id);
				if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) return;
				if (newMember.id === guild.ownerId) return;
				const botHighest = botMember.roles.highest?.position ?? 0;
				const targetHighest = newMember.roles.highest?.position ?? 0;
				if (botHighest <= targetHighest) return;
				if (newMember.roles.highest?.managed && !newMember.user?.bot) return;
				await newMember.setNickname(forced, 'Reapply forced nickname').catch(() => {});
			} catch (e) {
				console.error('[forcenickname] guildMemberUpdate error:', e);
			}
		});

		readyClient.on(Events.GuildMemberRemove, async (member) => {
			try {
				const guild = member.guild;
				const db = readyClient.db;
				if (!db) return;

				try {
					await handleMemberLeave(member, readyClient);
				} catch (e) {
					console.error('[Stats] Member leave stats error:', e);
				}

				try {
					await inviteTrackerMemberRemove(member, readyClient);
				} catch (e) {
					console.error('[InviteTracker] Member remove error:', e);
				}

				const guildData = await db.findOne({ guildId: guild.id }) || {};
				const leveling = await ensureLevelingConfig(db, guild.id);

				if (guildData.goodbye?.enabled && guildData.goodbye?.channels?.length > 0) {
					for (const channelConfig of guildData.goodbye.channels) {
						try {
							const goodbyeChannel = guild.channels.cache.get(channelConfig.channelId);
							if (!goodbyeChannel) continue;

							const embed = buildGoodbyeEmbed(channelConfig, member);
							const messageContent = channelConfig.content ? replaceGoodbyePlaceholders(channelConfig.content, member) : null;
							const buttonRow = buildGoodbyeButtons(channelConfig, member);

							if (!messageContent && !embed) continue;

							const sendOptions = { allowedMentions: { parse: ['users'] } };
							if (messageContent) sendOptions.content = messageContent;
							if (embed) sendOptions.embeds = [embed];
							if (buttonRow) sendOptions.components = [buttonRow];

							const sentMsg = await goodbyeChannel.send(sendOptions).catch(e => console.error('[goodbye] send error:', e));

							if (sentMsg && channelConfig.selfDestruct) {
								setTimeout(() => sentMsg.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
							}
						} catch (e) {
							console.error('[goodbye] channel send error:', e);
						}
					}
				}

				else if (guildData.goodbye?.enabled && guildData.goodbye?.channel) {
					const goodbyeChannel = guild.channels.cache.get(guildData.goodbye.channel);
					if (!goodbyeChannel) return;
					const config = guildData.goodbye;
					const embed = buildGoodbyeEmbed(config, member);
					const messageContent = config.content ? replaceGoodbyePlaceholders(config.content, member) : null;

					if (messageContent || embed) {
						const sendOptions = { allowedMentions: { parse: ['users'] } };
						if (messageContent) sendOptions.content = messageContent;
						if (embed) sendOptions.embeds = [embed];
						await goodbyeChannel.send(sendOptions).catch(e => console.error('[goodbye] send error:', e));
					}
				}

				const cleanup = leveling.autoCleanup || {};
				let erased = false;

				if (cleanup.leave || cleanup.kick) {
					let treatedAsKick = false;
					if (cleanup.kick) {
						const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
						const entry = audit?.entries.first();
						if (entry?.targetId === member.id && (Date.now() - entry.createdTimestamp) < 15_000) {
							treatedAsKick = true;
						}
					}

					if (treatedAsKick ? cleanup.kick : cleanup.leave) {
						if (leveling.members?.[member.id]) {
							delete leveling.members[member.id];
							erased = true;
						}
					}
				}

				if (erased) {
					await db.updateOne({ guildId: guild.id }, { $set: { leveling } });
				}
			} catch (e) {
				console.error('[goodbye] guildMemberRemove error:', e);
			}
		});

		readyClient.on(Events.GuildBanAdd, async (ban) => {
			try {
				const guild = ban.guild;
				const db = readyClient.db;
				if (!db) return;
				const leveling = await ensureLevelingConfig(db, guild.id);
				if (!leveling.autoCleanup?.ban) return;
				if (leveling.members?.[ban.user.id]) {
					delete leveling.members[ban.user.id];
					await db.updateOne({ guildId: guild.id }, { $set: { leveling } });
				}
			} catch (e) {
				console.error('[leveling] GuildBanAdd cleanup error:', e);
			}
		});

		readyClient.on(Events.VoiceStateUpdate, async (oldState, newState) => {
			try {
				await handleVoiceStats(oldState, newState, readyClient);
			} catch (e) {
				console.error('[Stats] Voice stats handling error:', e);
			}
		});

		readyClient.on(Events.InviteCreate, async (invite) => {
			try {
				await handleInviteCreate(invite);
			} catch (e) {
				console.error('[InviteTracker] Invite create error:', e);
			}
		});

		readyClient.on(Events.InviteDelete, async (invite) => {
			try {
				await handleInviteDelete(invite);
			} catch (e) {
				console.error('[InviteTracker] Invite delete error:', e);
			}
		});

		readyClient.on(Events.GuildCreate, async (guild) => {
			try {
				await inviteTrackerGuildCreate(guild);
			} catch (e) {
				console.error('[InviteTracker] Guild create error:', e);
			}
		});
	});
}

async function restoreDetainedUsers(client) {
	try {

		for (const guild of client.guilds.cache.values()) {
			const guildData = await client.db.findOne({ guildId: guild.id });
			if (!guildData || !guildData.moderation?.detains) continue;

			const detains = guildData.moderation.detains || [];

			for (const detainRecord of detains) {
				const timeUntilExpiry = detainRecord.expiresAt - Date.now();

				if (timeUntilExpiry <= 0) {

					await restoreDetainedUser(client, detainRecord);
				} else {

					setTimeout(() => {
						restoreDetainedUser(client, detainRecord);
					}, timeUntilExpiry);
				}
			}
		}

		console.log('✅ Detained users restored from database.');
	} catch (error) {
		console.error('Error restoring detained users:', error);
	}
}

async function restoreDetainedUser(client, detainRecord) {
	try {
		const guild = client.guilds.cache.get(detainRecord.guildId);
		if (!guild) return;

		const member = await guild.members.fetch(detainRecord.userId).catch(() => null);
		if (!member) return;

		await member.roles.remove(detainRecord.detainRole).catch(() => {});

		if (detainRecord.oldRoles && detainRecord.oldRoles.length > 0) {
			await member.roles.add(detainRecord.oldRoles).catch(() => {});
		}

		const guildData = await client.db.findOne({ guildId: detainRecord.guildId });
		if (guildData && guildData.moderation?.detains) {
			guildData.moderation.detains = guildData.moderation.detains.filter(
				d => !(d.userId === detainRecord.userId && d.timestamp === detainRecord.timestamp)
			);
			await client.db.updateOne({ guildId: detainRecord.guildId }, guildData);
		}

		console.log(`✅ Restored detained user ${detainRecord.userId} in guild ${detainRecord.guildId}`);
	} catch (error) {
		console.error('Error restoring detained user:', error);
	}
}
