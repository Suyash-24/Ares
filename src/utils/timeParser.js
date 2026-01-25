

export function parseTime(timeStr) {
	if (!timeStr) return null;

	const match = timeStr.match(/^(\d+)([smhd])$/i);
	if (!match) return null;

	const amount = parseInt(match[1]);
	const unit = match[2].toLowerCase();

	const multipliers = {
		s: 1000,
		m: 1000 * 60,
		h: 1000 * 60 * 60,
		d: 1000 * 60 * 60 * 24
	};

	return amount * (multipliers[unit] || 0);
}

export function formatDuration(ms) {
	if (!ms) return 'permanent';

	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d`;
	if (hours > 0) return `${hours}h`;
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}
