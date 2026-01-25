import { PermissionFlagsBits } from 'discord.js';

export const getThreadPermissionLevel = async (member, client, guildId) => {
	try {
		if (member.permissions.has(PermissionFlagsBits.ManageThreads) ||
			member.permissions.has(PermissionFlagsBits.ManageChannels)) {
			return 'discord';
		}

		if (!client.db) {
			return null;
		}

		const guildData = await client.db.findOne({ guildId });
		if (!guildData || !guildData.moderation) {
			return null;
		}

		const levels = ['headmodRoles', 'modRoles', 'supportRoles'];
		for (const level of levels) {
			const roleIds = guildData.moderation[level] || [];
			if (member.roles.cache.some(role => roleIds.includes(role.id))) {
				return level.replace('Roles', '');
			}
		}

		return null;
	} catch (error) {
		console.error('Error checking thread permission level:', error);
		return null;
	}
};

export const validateThreadPermission = async (member, client, guildId, requiredLevel = 'mod') => {
	const permLevel = await getThreadPermissionLevel(member, client, guildId);

	if (permLevel === 'discord') return true;

	const hierarchy = { support: 0, mod: 1, headmod: 2 };
	const required = hierarchy[requiredLevel] || 1;
	const userLevel = hierarchy[permLevel] || -1;

	return userLevel >= required;
};

export const fetchThread = async (guild, threadId) => {
	try {
		return await guild.channels.fetch(threadId);
	} catch (error) {
		return null;
	}
};

export const parseThreadInput = async (input, message) => {
	if (!input) {
		if (message.channel.isThread()) {
			return message.channel;
		}
		return null;
	}

	if (message.mentions.channels.size > 0) {
		return message.mentions.channels.first();
	}

	return await fetchThread(message.guild, input);
};

export const isValidThread = (channel) => {
	return channel && (channel.isThread() || channel.parent?.isForumChannel?.());
};

export const parseUserInput = async (input, message, client) => {
	if (!input) {
		return null;
	}

	if (message.mentions.users.size > 0) {
		return message.mentions.users.first().id;
	}

	if (/^\d+$/.test(input)) {
		try {
			const user = await client.users.fetch(input);
			return user.id;
		} catch (error) {
			return null;
		}
	}

	return null;
};

export const getWatchedThreads = async (client, guildId) => {
	try {
		if (!client.db) {
			return [];
		}

		const guildData = await client.db.findOne({ guildId });
		if (!guildData) {
			return [];
		}

		const watched = guildData.threads?.watched;
		if (Array.isArray(watched)) {
			return watched;
		}

		return [];
	} catch (error) {
		console.error('Error fetching watched threads:', error);
		return [];
	}
};

export const addWatchedThread = async (client, guildId, threadId, threadName) => {
	try {
		if (!client.db) {
			return false;
		}

		const guildData = await client.db.findOne({ guildId });

		let watched = [];

		if (guildData?.threads?.watched && Array.isArray(guildData.threads.watched)) {
			watched = [...guildData.threads.watched];
		}

		if (!watched.some(t => t.id === threadId)) {
			watched.push({ id: threadId, name: threadName, addedAt: Date.now() });
		}

		const existingThreads = guildData?.threads || {};

		const updateData = { threads: { ...existingThreads, watched } };

		const result = await client.db.updateOne(
			{ guildId },
			{ $set: updateData }
		);

		return true;
	} catch (error) {
		console.error('Error adding watched thread:', error);
		return false;
	}
};

export const removeWatchedThread = async (client, guildId, threadId) => {
	try {
		if (!client.db) {
			return false;
		}

		const guildData = await client.db.findOne({ guildId });
		let watched = [];

		if (guildData?.threads?.watched && Array.isArray(guildData.threads.watched)) {
			watched = [...guildData.threads.watched];
		}

		watched = watched.filter(t => t.id !== threadId);

		const existingThreads = guildData?.threads || {};
		await client.db.updateOne(
			{ guildId },
			{ $set: { threads: { ...existingThreads, watched } } }
		);

		return true;
	} catch (error) {
		console.error('Error removing watched thread:', error);
		return false;
	}
};

export const toggleWatchedThread = async (client, guildId, threadId, threadName) => {
	const watched = await getWatchedThreads(client, guildId);

	const isWatched = watched.some(t => t.id === threadId);

	if (isWatched) {
		await removeWatchedThread(client, guildId, threadId);
		return { toggled: true, isNowWatched: false };
	} else {
		await addWatchedThread(client, guildId, threadId, threadName);
		return { toggled: true, isNowWatched: true };
	}
};

export const getSuggestionConfig = async (client, guildId) => {
	try {
		if (!client.db) {
			return null;
		}

		const guildData = await client.db.findOne({ guildId });
		return guildData?.threads?.suggestionConfig || null;
	} catch (error) {
		console.error('Error fetching suggestion config:', error);
		return null;
	}
};

export const saveSuggestionThread = async (client, guildId, threadId) => {
	try {
		if (!client.db) {
			return false;
		}

		const guildData = await client.db.findOne({ guildId });
		let suggestions = [];

		if (guildData?.threads?.suggestions && Array.isArray(guildData.threads.suggestions)) {
			suggestions = [...guildData.threads.suggestions];
		}

		suggestions.push({ threadId, createdAt: Date.now() });

		const existingThreads = guildData?.threads || {};
		await client.db.updateOne(
			{ guildId },
			{ $set: { threads: { ...existingThreads, suggestions } } }
		);

		return true;
	} catch (error) {
		console.error('Error saving suggestion thread:', error);
		return false;
	}
};
