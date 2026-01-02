/**
 * Format user display name with discriminator
 * Handles both old (#XXXX) and new (@username) Discord formats
 */
export function formatUserDisplay(user) {
	if (!user) return 'Unknown User';

	// If user has a discriminator (old format), include it
	if (user.discriminator && user.discriminator !== '0') {
		return `${user.username}#${user.discriminator}`;
	}

	// New format or no discriminator
	return `@${user.username}`;
}

/**
 * Format user mention (for display purposes)
 */
export function formatUserMention(user) {
	if (!user) return 'Unknown';
	return user.tag || formatUserDisplay(user);
}
