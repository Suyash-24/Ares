import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

const activeTasks = new Map();

export const getActiveTasks = () => activeTasks;
export const setActiveTask = (guildId, taskId) => {
	activeTasks.set(guildId, { id: taskId, cancelled: false, timestamp: Date.now() });
};
export const shouldCancelTask = (guildId) => {
	const task = activeTasks.get(guildId);
	return task?.cancelled || false;
};
export const cancelActiveTask = (guildId) => {
	const task = activeTasks.get(guildId);
	if (task) {
		task.cancelled = true;
	}
};
export const clearActiveTask = (guildId) => activeTasks.delete(guildId);
export const hasActiveTask = (guildId) => {
	const task = activeTasks.get(guildId);

	return task && (Date.now() - task.timestamp) < 300000;
};

export default {
	name: 'role cancel',
	description: 'Cancels a mass role task running',
	usage: 'role cancel',
	category: 'Moderation',

	async execute(message) {
		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Roles** and **Manage Server** permissions.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const guildId = message.guild.id;

		if (!hasActiveTask(guildId)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} No Active Task`, 'There is no mass role task currently running.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		cancelActiveTask(guildId);

		return message.reply({
			components: [buildNotice(`# ${EMOJIS.success} Task Cancelled`, 'The mass role task has been cancelled.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};
