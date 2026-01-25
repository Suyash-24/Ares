const scheduledRemovals = new Map();

const getTempRoleKey = (record) => {
	return `${record.guildId}:${record.userId}:${record.roleId}:${new Date(record.assignedAt).getTime()}`;
};

const normalizeTempRole = (tempRole, guildIdFallback) => ({
	...tempRole,
	guildId: tempRole.guildId || guildIdFallback
});

export async function initializeTemporaryRoleManager(client) {
	await restoreTemporaryRoles(client);
	startTemporaryRoleExpirationChecker(client);
}

export function scheduleTemporaryRoleRemoval(client, tempRole) {
	const normalized = normalizeTempRole(tempRole, tempRole.guildId);
	if (!normalized.guildId) return;

	const key = getTempRoleKey(normalized);
	const delay = new Date(normalized.expiresAt).getTime() - Date.now();

	if (delay <= 0) {
		removeExpiredTemporaryRole(client, normalized);
		return;
	}

	if (scheduledRemovals.has(key)) {
		clearTimeout(scheduledRemovals.get(key));
	}

	const timeout = setTimeout(() => {
		scheduledRemovals.delete(key);
		removeExpiredTemporaryRole(client, normalized);
	}, delay);

	scheduledRemovals.set(key, timeout);
}

export async function cleanupExpiredTemporaryRoles(client, guildId) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData || !guildData.temporaryRoles || guildData.temporaryRoles.length === 0) {
		return guildData;
	}

	const now = Date.now();
	const expired = guildData.temporaryRoles.filter((record) => new Date(record.expiresAt).getTime() - now <= 0);

	if (!expired.length) {
		return guildData;
	}

	for (const record of expired) {
		await removeExpiredTemporaryRole(client, normalizeTempRole(record, guildId));
	}

	return client.db.findOne({ guildId });
}

const EXPIRATION_POLL_INTERVAL_MS = 5000;

async function restoreTemporaryRoles(client) {
	for (const guild of client.guilds.cache.values()) {
		const guildData = await client.db.findOne({ guildId: guild.id });
		if (!guildData || !guildData.temporaryRoles || guildData.temporaryRoles.length === 0) continue;

		for (const record of guildData.temporaryRoles) {
			scheduleTemporaryRoleRemoval(client, normalizeTempRole(record, guild.id));
		}
	}
}

function startTemporaryRoleExpirationChecker(client) {
	setInterval(async () => {
		try {
			for (const guild of client.guilds.cache.values()) {
				await cleanupExpiredTemporaryRoles(client, guild.id);
			}
		} catch (error) {
			console.error('Error in temporary role expiration checker:', error);
		}
	}, EXPIRATION_POLL_INTERVAL_MS);
}

export async function removeExpiredTemporaryRole(client, tempRoleInput) {
	const tempRole = normalizeTempRole(tempRoleInput, tempRoleInput.guildId);
	if (!tempRole.guildId) return;

	const key = getTempRoleKey(tempRole);
	if (scheduledRemovals.has(key)) {
		clearTimeout(scheduledRemovals.get(key));
		scheduledRemovals.delete(key);
	}

	try {
		const guild = client.guilds.cache.get(tempRole.guildId);
		if (!guild) {
			await removeTempRoleRecord(client, tempRole.guildId, tempRole);
			return;
		}

		const member = await guild.members.fetch(tempRole.userId).catch(() => null);
		const role = await guild.roles.fetch(tempRole.roleId).catch(() => null);

		if (member && role && member.roles.cache.has(role.id)) {
			await member.roles.remove(role).catch((err) => {
				console.error(`Failed to remove role ${role.name} from ${member.user?.username || member.id}:`, err.message);
			});
		}

		await removeTempRoleRecord(client, tempRole.guildId, tempRole);
	} catch (error) {
		console.error('Error removing expired temporary role:', error);
	}
}

async function removeTempRoleRecord(client, guildId, tempRole) {
	const guildData = await client.db.findOne({ guildId });
	if (!guildData || !guildData.temporaryRoles) return;

	const updated = guildData.temporaryRoles.filter((record) => {
		return !(
			record.userId === tempRole.userId &&
			record.roleId === tempRole.roleId &&
			new Date(record.assignedAt).getTime() === new Date(tempRole.assignedAt).getTime()
		);
	});

	if (updated.length !== guildData.temporaryRoles.length) {
		await client.db.updateOne({ guildId }, { $set: { temporaryRoles: updated } });
	}
}
