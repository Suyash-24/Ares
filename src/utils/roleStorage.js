const savedRoles = new Map();

export const getSavedRoles = () => savedRoles;

export const saveRoles = (guildId, userId, roleIds) => {
	if (!savedRoles.has(guildId)) {
		savedRoles.set(guildId, new Map());
	}
	savedRoles.get(guildId).set(userId, roleIds);
};

export const loadSavedRoles = (guildId, userId) => {
	return savedRoles.get(guildId)?.get(userId) || null;
};

export const deleteSavedRoles = (guildId, userId) => {
	const guildData = savedRoles.get(guildId);
	if (guildData) {
		guildData.delete(userId);
		if (guildData.size === 0) {
			savedRoles.delete(guildId);
		}
	}
};

export const hasSavedRoles = (guildId, userId) => {
	return savedRoles.has(guildId) && savedRoles.get(guildId).has(userId);
};
