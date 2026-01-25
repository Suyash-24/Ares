

import { sendLog, LOG_EVENTS, formatDuration } from './LoggingManager.js';

export async function logBan(client, guildId, executor, target, reason, duration = null) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_BAN, {
		executor,
		target,
		reason,
		duration: duration ? formatDuration(duration) : 'Permanent',
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logKick(client, guildId, executor, target, reason) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_KICK, {
		executor,
		target,
		reason,
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logMute(client, guildId, executor, target, reason, duration) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_MUTE, {
		executor,
		target,
		reason,
		duration: formatDuration(duration),
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logWarn(client, guildId, executor, target, reason, warningNumber = null) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_WARN, {
		executor,
		target,
		reason,
		content: warningNumber ? `Warning #${warningNumber}` : null,
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logDetain(client, guildId, executor, target, reason, duration = null) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_DETAIN, {
		executor,
		target,
		reason,
		duration: duration ? formatDuration(duration) : 'Until manually released',
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logForcenick(client, guildId, executor, target, nickname, action = 'set') {
	await sendLog(client, guildId, LOG_EVENTS.MOD_FORCENICK, {
		executor,
		target,
		content: action === 'remove' ? 'Forced nickname removed' : `Forced nickname: ${nickname}`,
		userId: target.id || target.user?.id,
		thumbnail: target.displayAvatarURL?.() || target.user?.displayAvatarURL?.()
	});
}

export async function logRaidwipe(client, guildId, executor, count, criteria) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_RAIDWIPE, {
		executor,
		count,
		content: `Wiped ${count} members\nCriteria: ${criteria}`,
		reason: 'Raid cleanup'
	});
}

export async function logMassAction(client, guildId, executor, action, count, reason) {
	await sendLog(client, guildId, LOG_EVENTS.MOD_MASS_ACTION, {
		executor,
		count,
		content: `Action: ${action}\nAffected: ${count} users`,
		reason
	});
}

export async function logAutomodAction(client, guildId, target, action, reason, content = null) {
	await sendLog(client, guildId, LOG_EVENTS.AUTOMOD_ACTION, {
		executor: { tag: 'Ares Automod', id: client.user.id },
		target,
		content: content ? `Deleted: ${content.substring(0, 500)}` : null,
		reason: `${action}: ${reason}`,
		userId: target.id || target.user?.id
	});
}

export default {
	logBan,
	logKick,
	logMute,
	logWarn,
	logDetain,
	logForcenick,
	logRaidwipe,
	logMassAction,
	logAutomodAction
};
