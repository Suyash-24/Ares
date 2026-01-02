export const moderationConfigSchema = {
	guildId: String,
	moderation: {
		supportRoles: [String],
		modRoles: [String],
		headmodRoles: [String],
		logChannel: String,
		warningThreshold: { type: Number, default: 3 },
		autoMuteOnWarn: { type: Boolean, default: false },
		autoKickOnWarn: { type: Boolean, default: false },
		muteDuration: { type: Number, default: 3600000 },
		warnings: [{
			userId: String,
			moderatorId: String,
			reason: String,
			timestamp: Date
		}]
	}
};

export const getModerationLogsFields = (action, moderator, target, reason, duration = null) => {
	const fields = [
		{
			name: 'Action',
			value: action,
			inline: true
		},
		{
			name: 'Moderator',
			value: `${moderator.user.username} (${moderator.id})`,
			inline: true
		},
		{
			name: 'Target',
			value: `${target.user.username} (${target.id})`,
			inline: true
		}
	];

	if (reason) {
		fields.push({
			name: 'Reason',
			value: reason,
			inline: false
		});
	}

	if (duration) {
		fields.push({
			name: 'Duration',
			value: duration,
			inline: true
		});
	}

	return fields;
};
