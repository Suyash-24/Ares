export function parseDuration(durationStr) {
	if (!durationStr || typeof durationStr !== 'string') {
		return null;
	}

	const regex = /^(\d+)([smhd])$/i;
	const match = durationStr.toLowerCase().match(regex);

	if (!match) {
		return null;
	}

	const amount = parseInt(match[1]);
	const unit = match[2];

	const multipliers = {
		's': 1000,
		'm': 60 * 1000,
		'h': 60 * 60 * 1000,
		'd': 24 * 60 * 60 * 1000
	};

	const ms = amount * multipliers[unit];

	const maxTimeout = 28 * 24 * 60 * 60 * 1000;
	if (ms > maxTimeout) {
		return null;
	}

	return ms;
}

export function formatDuration(ms) {
	if (!ms || ms < 0) {
		return '0s';
	}

	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	const seconds = Math.floor((ms % (60 * 1000)) / 1000);

	const parts = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);

	return parts.length > 0 ? parts.join(' ') : '0s';
}
