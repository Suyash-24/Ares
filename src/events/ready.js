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
		console.log(`Kira is online as ${readyClient.user.tag}.`);

		console.log('🎧 [Shoukaku] Music system is ready.');
		
		// Restore detained users from database
		await restoreDetainedUsers(readyClient);

		// Restore temporary roles from database
		// Initialize temporary role manager (restores + schedules removals)
		await initializeTemporaryRoleManager(readyClient);

		// Restore slowmode expirations and schedule clear timers
		await initializeSlowmodeManager(readyClient);
		
		// Initialize invite tracker (cache all guild invites)
		await inviteTrackerReady(readyClient);
		
		// Initialize voice sessions (detect users already in voice channels)
		await initializeVoiceSessions(readyClient);
		
		if (config.presence) {
			readyClient.user.setPresence(config.presence);
		}

		readyClient.on(Events.GuildMemberAdd, async (member) => {
			try {
				const guild = member.guild;
				const db = readyClient.db;
				if (!db) return;

				// Stats tracking for member join
				try {
					await handleMemberJoin(member, readyClient);
				} catch (e) {
					console.error('[Stats] Member join stats error:', e);
				}

				// Invite tracking for member join
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

				// Multi-channel welcome support
				if (guildData.welcome?.enabled && guildData.welcome?.channels?.length > 0) {
					for (const channelConfig of guildData.welcome.channels) {
						try {
							const welcomeChannel = guild.channels.cache.get(channelConfig.channelId);
							if (!welcomeChannel) continue;
							
							const embed = buildWelcomeEmbed(channelConfig, member);
							const messageContent = channelConfig.content ? replacePlaceholders(channelConfig.content, member) : null;
							const buttonRow = buildWelcomeButtons(channelConfig, member);
							
							// Skip if no content and no embed
							if (!messageContent && !embed) continue;
							
							const sendOptions = { allowedMentions: { parse: ['users'] } };
							if (messageContent) sendOptions.content = messageContent;
							if (embed) sendOptions.embeds = [embed];
							if (buttonRow) sendOptions.components = [buttonRow];
							
							const sentMsg = await welcomeChannel.send(sendOptions).catch(e => console.error('[welcome] send error:', e));
							
							// Self-destruct
							if (sentMsg && channelConfig.selfDestruct) {
								setTimeout(() => sentMsg.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
							}
						} catch (e) {
							console.error('[welcome] channel send error:', e);
						}
					}
				}
				// Legacy single-channel support
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

				// Stats tracking for member leave
				try {
					await handleMemberLeave(member, readyClient);
				} catch (e) {
					console.error('[Stats] Member leave stats error:', e);
				}

				// Invite tracking for member leave
				try {
					await inviteTrackerMemberRemove(member, readyClient);
				} catch (e) {
					console.error('[InviteTracker] Member remove error:', e);
				}

				const guildData = await db.findOne({ guildId: guild.id }) || {};
				const leveling = await ensureLevelingConfig(db, guild.id);
				
				// Multi-channel goodbye support
				if (guildData.goodbye?.enabled && guildData.goodbye?.channels?.length > 0) {
					for (const channelConfig of guildData.goodbye.channels) {
						try {
							const goodbyeChannel = guild.channels.cache.get(channelConfig.channelId);
							if (!goodbyeChannel) continue;
							
							const embed = buildGoodbyeEmbed(channelConfig, member);
							const messageContent = channelConfig.content ? replaceGoodbyePlaceholders(channelConfig.content, member) : null;
							const buttonRow = buildGoodbyeButtons(channelConfig, member);
							
							// Skip if no content and no embed
							if (!messageContent && !embed) continue;
							
							const sendOptions = { allowedMentions: { parse: ['users'] } };
							if (messageContent) sendOptions.content = messageContent;
							if (embed) sendOptions.embeds = [embed];
							if (buttonRow) sendOptions.components = [buttonRow];
							
							const sentMsg = await goodbyeChannel.send(sendOptions).catch(e => console.error('[goodbye] send error:', e));
							
							// Self-destruct
							if (sentMsg && channelConfig.selfDestruct) {
								setTimeout(() => sentMsg.delete().catch(() => {}), channelConfig.selfDestruct * 1000);
							}
						} catch (e) {
							console.error('[goodbye] channel send error:', e);
						}
					}
				}
				// Legacy single-channel support
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

				// Leveling auto-cleanup: leave/kick handled here; ban handled in GuildBanAdd
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

		// Voice state update handler for stats tracking
		readyClient.on(Events.VoiceStateUpdate, async (oldState, newState) => {
			try {
				await handleVoiceStats(oldState, newState, readyClient);
			} catch (e) {
				console.error('[Stats] Voice stats handling error:', e);
			}
		});

		// Invite tracking events
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

// Function to restore detained users on bot startup
async function restoreDetainedUsers(client) {
	try {
		// Loop through all cached guilds and check for detains
		for (const guild of client.guilds.cache.values()) {
			const guildData = await client.db.findOne({ guildId: guild.id });
			if (!guildData || !guildData.moderation?.detains) continue;

			const detains = guildData.moderation.detains || [];

			for (const detainRecord of detains) {
				const timeUntilExpiry = detainRecord.expiresAt - Date.now();

				if (timeUntilExpiry <= 0) {
					// Already expired, restore immediately
					await restoreDetainedUser(client, detainRecord);
				} else {
					// Set up timer for this detention
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

// Helper function to restore detained user
async function restoreDetainedUser(client, detainRecord) {
	try {
		const guild = client.guilds.cache.get(detainRecord.guildId);
		if (!guild) return;

		const member = await guild.members.fetch(detainRecord.userId).catch(() => null);
		if (!member) return;

		// Remove detain role
		await member.roles.remove(detainRecord.detainRole).catch(() => {});

		// Restore old roles
		if (detainRecord.oldRoles && detainRecord.oldRoles.length > 0) {
			await member.roles.add(detainRecord.oldRoles).catch(() => {});
		}

		// Update database to remove the record
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

// Temporary roles are handled by temporaryRoleManager utility
