import { Events } from 'discord.js';
import { ensureStatsConfig } from '../utils/statsManager.js';

const inviteCache = new Map();

async function cacheGuildInvites(guild) {
	try {
		const invites = await guild.invites.fetch();
		const guildInvites = new Map();

		for (const [code, invite] of invites) {
			guildInvites.set(code, {
				uses: invite.uses,
				inviterId: invite.inviter?.id,
				maxUses: invite.maxUses,
				expiresAt: invite.expiresAt?.getTime()
			});
		}

		inviteCache.set(guild.id, guildInvites);
		return guildInvites;
	} catch (error) {
		console.error(`[InviteTracker] Failed to cache invites for ${guild.name}:`, error.message);
		return null;
	}
}

async function handleReady(client) {
	console.log('[InviteTracker] Caching invites for all guilds...');

	for (const [guildId, guild] of client.guilds.cache) {
		await cacheGuildInvites(guild);
	}

	console.log(`[InviteTracker] Cached invites for ${inviteCache.size} guilds`);
}

async function handleInviteCreate(invite) {
	const guildInvites = inviteCache.get(invite.guild.id) || new Map();

	guildInvites.set(invite.code, {
		uses: invite.uses,
		inviterId: invite.inviter?.id,
		maxUses: invite.maxUses,
		expiresAt: invite.expiresAt?.getTime()
	});

	inviteCache.set(invite.guild.id, guildInvites);
}

async function handleInviteDelete(invite) {
	const guildInvites = inviteCache.get(invite.guild.id);
	if (guildInvites) {
		guildInvites.delete(invite.code);
	}
}

async function handleGuildMemberAdd(member, client) {
	const { guild } = member;

	try {

		const oldInvites = inviteCache.get(guild.id);

		const newInvites = await guild.invites.fetch();

		let usedInvite = null;
		let inviterId = null;

		if (oldInvites) {
			for (const [code, invite] of newInvites) {
				const oldInvite = oldInvites.get(code);

				if (oldInvite && invite.uses > oldInvite.uses) {
					usedInvite = invite;
					inviterId = invite.inviter?.id;
					break;
				}
			}

			if (!usedInvite) {
				for (const [code, invite] of newInvites) {
					if (!oldInvites.has(code) && invite.uses > 0) {
						usedInvite = invite;
						inviterId = invite.inviter?.id;
						break;
					}
				}
			}
		}

		await cacheGuildInvites(guild);

		if (client.db && inviterId) {
			const stats = await ensureStatsConfig(client.db, guild.id);

			if (!stats.invites) {
				stats.invites = {};
			}

			if (!stats.invites[inviterId]) {
				stats.invites[inviterId] = {
					regular: 0,
					left: 0,
					fake: 0,
					bonus: 0,
					invited: []
				};
			}

			const accountAge = Date.now() - member.user.createdTimestamp;
			const isFake = accountAge < 7 * 24 * 60 * 60 * 1000;

			if (isFake) {
				stats.invites[inviterId].fake++;
			} else {
				stats.invites[inviterId].regular++;
			}

			const existingInvite = stats.invites[inviterId].invited?.find(inv => inv.userId === member.id);
			if (!existingInvite) {
				if (!Array.isArray(stats.invites[inviterId].invited)) {
					stats.invites[inviterId].invited = [];
				}
				stats.invites[inviterId].invited.push({
					userId: member.id,
					ts: Date.now(),
					left: false
				});
			}

			if (!stats.users[member.id]) {
				stats.users[member.id] = {
					messages: [],
					voice: [],
					joins: []
				};
			}
			stats.users[member.id].invitedBy = inviterId;
			stats.users[member.id].inviteCode = usedInvite?.code;

			await client.db.updateOne({ guildId: guild.id }, { $set: { stats } });

			console.log(`[InviteTracker] ${member.user.tag} was invited by ${inviterId} in ${guild.name}`);
		}

	} catch (error) {
		console.error(`[InviteTracker] Error tracking invite for ${member.user.tag}:`, error.message);
	}
}

async function handleGuildMemberRemove(member, client) {
	const { guild } = member;

	try {
		if (!client.db) return;

		const stats = await ensureStatsConfig(client.db, guild.id);

		const invitedBy = stats.users?.[member.id]?.invitedBy;

		if (invitedBy && stats.invites?.[invitedBy]) {

			if (stats.invites[invitedBy].regular > 0) {
				stats.invites[invitedBy].regular--;
			}
			stats.invites[invitedBy].left++;

			await client.db.updateOne({ guildId: guild.id }, { $set: { stats } });

			console.log(`[InviteTracker] ${member.user.tag} left, updating invite stats for ${invitedBy}`);
		}

	} catch (error) {
		console.error(`[InviteTracker] Error updating leave stats:`, error.message);
	}
}

async function handleGuildCreate(guild) {
	await cacheGuildInvites(guild);
}

export function getInviteCache() {
	return inviteCache;
}

export {
	handleReady,
	handleInviteCreate,
	handleInviteDelete,
	handleGuildMemberAdd,
	handleGuildMemberRemove,
	handleGuildCreate,
	cacheGuildInvites
};

export default {
	name: 'inviteTracker',
	events: [
		{ event: Events.ClientReady, handler: handleReady },
		{ event: Events.InviteCreate, handler: handleInviteCreate },
		{ event: Events.InviteDelete, handler: handleInviteDelete },
		{ event: Events.GuildMemberAdd, handler: handleGuildMemberAdd },
		{ event: Events.GuildMemberRemove, handler: handleGuildMemberRemove },
		{ event: Events.GuildCreate, handler: handleGuildCreate }
	]
};
