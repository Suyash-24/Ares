

export function formatUserDisplay(user) {
	if (!user) return 'Unknown User';

	if (user.discriminator && user.discriminator !== '0') {
		return `${user.username}#${user.discriminator}`;
	}

	return `@${user.username}`;
}

export function formatUserMention(user) {
	if (!user) return 'Unknown';
	return user.tag || formatUserDisplay(user);
}
