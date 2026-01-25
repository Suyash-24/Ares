import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';
import {
	getThreadPermissionLevel,
	validateThreadPermission,
	fetchThread,
	parseThreadInput,
	parseUserInput,
	isValidThread,
	getWatchedThreads,
	toggleWatchedThread,
	saveSuggestionThread
} from '../../../utils/threadUtils.js';

const buildResponse = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

const executeThreadLock = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to lock threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const threadInput = args[0];
	let reason = args.slice(message.channel.isThread() ? 0 : 1).join(' ') || 'No reason provided';

	const thread = await parseThreadInput(threadInput, message);
	if (!thread || !isValidThread(thread)) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		markCommandInvoker(message.guild.id, 'threadlock', thread.id, message.author);
		await thread.edit({ locked: true });

		await sendLog(client, message.guildId, LOG_EVENTS.MOD_THREAD_LOCK, {
			executor: message.author,
			thread: thread,
			reason: reason,
			thumbnail: message.guild.iconURL({ dynamic: true })
		});

		return message.reply({
			components: [buildResponse(`${EMOJIS.locked} **Thread Locked**`, `Thread has been locked.\n**Reason:** ${reason}`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Lock Failed**`, 'Could not lock the thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeThreadUnlock = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to unlock threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const threadInput = args[0];
	let reason = args.slice(message.channel.isThread() ? 0 : 1).join(' ') || 'No reason provided';

	const thread = await parseThreadInput(threadInput, message);
	if (!thread || !isValidThread(thread)) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		markCommandInvoker(message.guild.id, 'threadunlock', thread.id, message.author);
		await thread.edit({ locked: false });

		await sendLog(client, message.guildId, LOG_EVENTS.MOD_THREAD_UNLOCK, {
			executor: message.author,
			thread: thread,
			reason: reason,
			thumbnail: message.guild.iconURL({ dynamic: true })
		});

		return message.reply({
			components: [buildResponse(`${EMOJIS.unlocked} **Thread Unlocked**`, `Thread has been unlocked.\n**Reason:** ${reason}`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Unlock Failed**`, 'Could not unlock the thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeThreadAdd = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to add members to threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	let threadInput;
	let userInput;

	if (message.channel.isThread()) {
		threadInput = null;
		userInput = args[0];
	} else {
		threadInput = args[0];
		userInput = args[1];
	}

	if (!threadInput && !message.channel.isThread()) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread add <thread-id> <@user or user-id>`\nOr use this command in a thread: `!thread add <@user or user-id>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	if (!userInput) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread add <thread-id> <@user or user-id>`\nOr use this command in a thread: `!thread add <@user or user-id>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const thread = await parseThreadInput(threadInput, message);
	if (!thread || !isValidThread(thread)) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const userId = await parseUserInput(userInput, message, client);
	if (!userId) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **User Not Found**`, 'Could not find the specified user.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		const user = await client.users.fetch(userId);
		await thread.members.add(userId);
		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Member Added**`, `${user.username} has been added to the thread.`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Action Failed**`, 'Could not add the member to the thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeThreadRemove = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to remove members from threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	let threadInput;
	let userInput;

	if (message.channel.isThread()) {
		threadInput = null;
		userInput = args[0];
	} else {
		threadInput = args[0];
		userInput = args[1];
	}

	if (!threadInput && !message.channel.isThread()) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread remove <thread-id> <@user or user-id>`\nOr use this command in a thread: `!thread remove <@user or user-id>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	if (!userInput) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread remove <thread-id> <@user or user-id>`\nOr use this command in a thread: `!thread remove <@user or user-id>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const thread = await parseThreadInput(threadInput, message);
	if (!thread || !isValidThread(thread)) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const userId = await parseUserInput(userInput, message, client);
	if (!userId) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **User Not Found**`, 'Could not find the specified user.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		const user = await client.users.fetch(userId);
		await thread.members.remove(userId);
		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Member Removed**`, `${user.username} has been removed from the thread.`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Action Failed**`, 'Could not remove the member from the thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeThreadWatch = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to watch threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const subcommand = args[0]?.toLowerCase();

	if (subcommand === 'list') {
		const watched = await getWatchedThreads(client, message.guild.id);

		if (watched.length === 0) {
			return message.reply({
				components: [buildResponse(`${EMOJIS.error} **No Watched Threads**`, 'There are no watched threads in this server.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const threadList = watched.map((t, i) => `**${i + 1}.** ${t.name} \`(${t.id})\``).join('\n');
		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Watched Threads**`, threadList)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const threadInput = args[0];
	const thread = await parseThreadInput(threadInput, message);

	if (!thread || !isValidThread(thread)) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		const result = await toggleWatchedThread(client, message.guild.id, thread.id, thread.name);
		const status = result.isNowWatched ? 'now being watched' : 'no longer being watched';
		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Watch Toggled**`, `Thread is ${status}.`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Action Failed**`, 'Could not toggle watch status.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeThreadRename = async (message, args, client) => {
	if (!(await validateThreadPermission(message.member, client, message.guild.id, 'mod'))) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Permission Denied**`, 'You need moderation permissions to rename threads.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	let threadInput;
	let newName;

	if (message.channel.isThread()) {
		threadInput = null;
		newName = args.join(' ');
	} else {
		threadInput = args[0];
		newName = args.slice(1).join(' ');
	}

	if (!threadInput && !message.channel.isThread()) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread rename [thread-id or mention] <new-name>`\nOr use this command in a thread: `!thread rename <new-name>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	if (!newName) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!thread rename [thread-id or mention] <new-name>`\nOr use this command in a thread: `!thread rename <new-name>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	if (newName.length > 100) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Name Too Long**`, 'Thread name must be 100 characters or less.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	const thread = await parseThreadInput(threadInput, message);
	if (!thread || !isValidThread(thread)) {
		if (!message.channel.isThread()) {
			return message.reply({
				components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the thread with ID/mention provided.\n\nUsage: `!thread rename [thread-id or mention] <new-name>`\nOr use this command in a thread: `!thread rename <new-name>`')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Thread Not Found**`, 'Could not find the specified thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		await thread.edit({ name: newName });
		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Thread Renamed**`, `Thread has been renamed to **${newName}**.`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Rename Failed**`, 'Could not rename the thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

const executeSuggestThread = async (message, args, client) => {
	const channelId = args[0];
	const threadName = args[1];
	const suggestionContent = args.slice(2).join(' ');

	if (!channelId || !threadName || !suggestionContent) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Invalid Usage**`, 'Usage: `!suggest threads <channel> <thread-name> <suggestion-content>`')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	if (threadName.length > 100) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Name Too Long**`, 'Thread name must be 100 characters or less.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}

	try {
		const channel = await message.guild.channels.fetch(channelId);
		if (!channel) {
			return message.reply({
				components: [buildResponse(`${EMOJIS.error} **Channel Not Found**`, 'Could not find the specified channel.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const thread = await channel.threads.create({
			name: threadName,
			autoArchiveDuration: 60
		});

		const suggestionText = `**Suggestion from ${message.author.username}**\n\n${suggestionContent}`;
		await thread.send(suggestionText);

		await saveSuggestionThread(client, message.guild.id, thread.id);

		return message.reply({
			components: [buildResponse(`${EMOJIS.success} **Suggestion Thread Created**`, `Thread created: ${thread}`)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	} catch (error) {
		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Creation Failed**`, 'Could not create the suggestion thread.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	}
};

export default {
	name: 'thread',
	aliases: ['threads'],
	description: 'Manage threads and forum posts',
	usage: 'thread [subcommand] [args]',
	category: 'Moderation',

	async execute(message, args, client) {
		const subcommand = args[0]?.toLowerCase();

		if (!subcommand || subcommand === 'help') {
			const helpText = `**Thread Management Commands**

**!thread lock [thread-id] [reason]** - Lock a thread
**!thread unlock [thread-id] [reason]** - Unlock a thread
**!thread add <thread-id> <user-id>** - Add a member to a thread
**!thread remove <thread-id> <user-id>** - Remove a member from a thread
**!thread watch [thread-id]** - Toggle watching a thread
**!thread watch list** - Show all watched threads
**!thread rename [thread-id] <new-name>** - Rename a thread
**!suggest threads <channel> <thread-name> <suggestion>** - Create a suggestion thread`;

			return message.reply({
				components: [buildResponse(`${EMOJIS.commands} **Thread Management**`, helpText)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (subcommand === 'lock') {
			return executeThreadLock(message, args.slice(1), client);
		}

		if (subcommand === 'unlock') {
			return executeThreadUnlock(message, args.slice(1), client);
		}

		if (subcommand === 'add') {
			return executeThreadAdd(message, args.slice(1), client);
		}

		if (subcommand === 'remove') {
			return executeThreadRemove(message, args.slice(1), client);
		}

		if (subcommand === 'watch') {
			return executeThreadWatch(message, args.slice(1), client);
		}

		if (subcommand === 'rename') {
			return executeThreadRename(message, args.slice(1), client);
		}

		if (subcommand === 'suggest') {
			const nextArg = args[1]?.toLowerCase();
			if (nextArg === 'threads') {
				return executeSuggestThread(message, args.slice(2), client);
			}
		}

		return message.reply({
			components: [buildResponse(`${EMOJIS.error} **Unknown Subcommand**`, 'Use `!thread help` for available commands.')],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { repliedUser: false }
		});
	},

	components: []
};
