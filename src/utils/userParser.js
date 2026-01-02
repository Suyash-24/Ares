export async function parseUserInput(input, guild, client) {
	if (!input) return null;

	const cleaned = input.replace(/[<@!>]/g, '').trim();

	if (!isNaN(cleaned) && cleaned.length > 0) {
		try {
			const member = await guild.members.fetch(cleaned);
			return member;
		} catch (guildError) {
			try {
				const user = await client.users.fetch(cleaned);
				// Return a member-like object with the user property
				return {
					user,
					id: user.id,
					guild,
					displayName: user.username
				};
			} catch (clientError) {
				return null;
			}
		}
	}

	// Try to search by username if not a number
	try {
		const members = await guild.members.search({ query: input, limit: 1 });
		if (members.size > 0) {
			return members.first();
		}
	} catch (searchError) {
		// Silently fail, will return null below
	}

	return null;
}

export function extractUserId(input) {
	const cleaned = input.replace(/[<@!>]/g, '');
	return isNaN(cleaned) ? null : cleaned;
}
