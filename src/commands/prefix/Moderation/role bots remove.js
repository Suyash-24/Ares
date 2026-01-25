import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { setActiveTask, shouldCancelTask, clearActiveTask } from './role cancel.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

const resolveRole = (guild, input) => {
	if (!input) return null;
	const clean = input.replace(/[<@&#>]/g, '');
	let role = guild.roles.cache.get(clean);
	if (!role) {
		role = guild.roles.cache.find((r) => r.name.toLowerCase() === input.toLowerCase());
	}
	return role;
};

const formatRole = (role) => `<@&${role.id}>`;

const fetchMembersWithRetry = async (guild, maxRetries = 3) => {
	let retries = 0;
	while (retries < maxRetries) {
		try {
			return await guild.members.fetch({ time: 60000 });
		} catch (error) {
			if (error.code === 'GuildMembersTimeout' && retries < maxRetries - 1) {
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
				retries++;
			} else {
				throw error;
			}
		}
	}
};

export default {
	name: 'role bots remove',
	description: 'Remove a role from all bots',
	usage: 'role bots remove <role>',
	category: 'Moderation',

	async execute(message, args, client) {

		const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
		const isOwner = message.guild.ownerId === message.author.id;
		const isExtraOwner = Array.isArray(guildData.antinuke?.extraOwners) && guildData.antinuke.extraOwners.includes(message.author.id);
		const isAdmin = Array.isArray(guildData.antinuke?.admins) && guildData.antinuke.admins.some(a => (typeof a === 'string' ? a === message.author.id : a.id === message.author.id));
		const hasDiscordAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);

		if (!(hasDiscordAdmin && (isOwner || isExtraOwner || isAdmin))) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need **Discord Administrator** + **Antinuke Admin** permissions.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!globalThis._roleMassCooldowns) globalThis._roleMassCooldowns = new Map();
		const cooldownKey = `${message.guildId}_${message.author.id}`;
		const now = Date.now();
		const lastUsed = globalThis._roleMassCooldowns.get(cooldownKey) || 0;
		const COOLDOWN_MS = 60 * 1000;
		if (now - lastUsed < COOLDOWN_MS) {
			const seconds = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
			return message.reply({
				components: [buildNotice(
					`# ${EMOJIS.error} Cooldown`,
					`Please wait ${seconds} more second${seconds !== 1 ? 's' : ''} before using any mass role command again.`
				)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
		globalThis._roleMassCooldowns.set(cooldownKey, now);
		if (!args.length) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role bots remove <role>\``)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Roles** and **Manage Server** permissions.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const botMember = message.guild.members.me;
		if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I do not have permission to manage roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const role = resolveRole(message.guild, args[0]);
		if (!role) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.managed) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Managed Role`, 'I cannot edit managed roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const executorHighest = message.member.roles.highest?.position ?? 0;
		const botHighest = botMember.roles.highest?.position ?? 0;

		if (role.position >= executorHighest && message.member.id !== message.guild.ownerId) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below your highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.position >= botHighest) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below my highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const processingMsg = await message.reply({
			components: [buildNotice(`# ${EMOJIS.loading} Processing`, 'Fetching members...')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});

		const taskId = `${message.guild.id}-${Date.now()}`;
		setActiveTask(message.guild.id, taskId);

		let members;
		try {
			members = await fetchMembersWithRetry(message.guild);
		} catch (error) {
			clearActiveTask(message.guild.id);
			return processingMsg.edit({
				components: [buildNotice(`# ${EMOJIS.error} Fetch Timeout`, 'Could not fetch members. Please try again.')]
			});
		}
		const bots = members.filter((member) => member.user.bot);

		await processingMsg.edit({
			components: [buildNotice(`# ${EMOJIS.loading} Processing`, `Removing role from ${bots.size} bot(s)...`)]
		});

		let affected = 0;
		let failures = 0;

		for (const member of bots.values()) {

			if (shouldCancelTask(message.guild.id)) {
				clearActiveTask(message.guild.id);
				return processingMsg.edit({
					components: [
						buildNotice(
							`# ${EMOJIS.error} Task Cancelled`,
							`**Role:** ${formatRole(role)}\n**Processed:** ${affected}\n**Failures:** ${failures}`
						)
					]
				});
			}

			if (!member.roles.cache.has(role.id)) {
				continue;
			}

			try {
				markCommandInvoker(message.guild.id, 'rolebotsremove', member.id, message.author);
				await member.roles.remove(role);
				affected++;
			} catch (error) {
				failures++;
			}
		}

		clearActiveTask(message.guild.id);

		if (affected > 0) {
			await sendLog(message.client, message.guildId, LOG_EVENTS.MOD_MASS_ACTION, {
				executor: message.author,
				action: 'Role Remove from Bots',
				count: affected,
				role: role,
				details: `Removed ${role.name} from ${affected} bot(s)${failures > 0 ? `, ${failures} failed` : ''}`
			});
		}

		return processingMsg.edit({
			components: [
				buildNotice(
					`# ${EMOJIS.success} Role Removed from Bots`,
					`**Role:** ${formatRole(role)}\n**Affected:** ${affected}\n**Failures:** ${failures}`
				)
			]
		});
	}
};
