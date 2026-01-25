import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { REST, Routes } from 'discord.js';

import registerInteractionHandler from '../handlers/interactionHandler.js';
import registerMessageHandler from '../handlers/messageHandler.js';
import registerReadyEvent from '../events/ready.js';
import registerButtonInteraction from '../events/buttonInteraction.js';
import registerModalInteraction from '../events/modalInteraction.js';
import { registerLoggingEvents } from '../events/loggingEvents.js';
import registerAntinukeProtection from '../events/antinukeProtectionHandler.js';
import registerStarboardHandler from '../events/starboardHandler.js';
import registerBumpReminderHandler from '../events/bumpReminderHandler.js';
import { initializeShoukaku } from './shoukakuManager.js';
import { Queue } from './Queue.js';
import registerAutomodHandler from '../events/automodHandler.js';
import registerAntiraidHandler from '../events/antiraidHandler.js';
import registerBirthdayHandler from '../events/birthdayHandler.js';
import registerAfkHandler from '../events/afkHandler.js';
import recommendationHandler from '../commands/shared/recommendationHandler.js';
import musicControlHandler from '../commands/shared/musicControlHandler.js';
import DatabaseManager from './DatabaseManager.js';
import AntiNukeEngine from '../commands/prefix/Antinuke/engine/AntiNukeEngine.js';
import registerVoiceLeveling from '../events/voiceLevelingHandler.js';
import { initGiveawayHandler } from '../events/giveawayHandler.js';
import ticketHandler from '../events/ticketHandler.js';
import { startInactivityScheduler } from './ticketScheduler.js';
import { registerSnipeEvents } from '../events/snipeHandler.js';
import registerTriggerHandler from '../events/triggerHandler.js';

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../config.json');

async function initializeAntinuke(client) {
	const engine = new AntiNukeEngine(client);
	await engine.initialize();

	client.antinuke = engine;
	console.log('🛡️ [Antinuke] System ready');

	return engine;
}

export async function bootstrap(client, __dirname) {
	const config = await loadConfig();
	client.config = config;
	client.shoukaku = initializeShoukaku(client, config);
	client.queue = new Map();

	await DatabaseManager.initialize();
	client.db = DatabaseManager.getGuilds();
	console.log(`✅ Database initialized: ${DatabaseManager.getType()}`);

	const token = resolveToken(config);
	const clientId = resolveClientId(config);
	client.prefix = resolvePrefix(config);
	client.ownerIds = resolveOwnerIds(config);
	console.log(`👤 [Owners] Loaded ${client.ownerIds.length} owner ID(s)${client.ownerIds.length > 0 ? ': ' + client.ownerIds.join(', ') : ''}`);

	const slashCommands = await loadSlashCommands(client, __dirname);
	await loadPrefixCommands(client, __dirname);

	client.components.set(recommendationHandler.customId, recommendationHandler);
	client.components.set(musicControlHandler.customId, musicControlHandler);

	await registerSlashCommands(clientId, token, slashCommands, config.testGuildIds);

	registerInteractionHandler(client);
	registerMessageHandler(client);

	registerReadyEvent(client, config);
	registerButtonInteraction(client);
	registerModalInteraction(client);

	registerLoggingEvents(client);

	registerAntinukeProtection(client);

	registerStarboardHandler(client);

	registerBumpReminderHandler(client);

	registerAutomodHandler(client);

	registerAntiraidHandler(client);

	registerBirthdayHandler(client);

	registerAfkHandler(client);
	registerVoiceLeveling(client);

	registerSnipeEvents(client);

	registerTriggerHandler(client);

	await initializeAntinuke(client);

	initGiveawayHandler(client);

	client.on('interactionCreate', (interaction) => ticketHandler(client, interaction));

	client.on('guildMemberRemove', async (member) => {
		try {
			const guildData = await client.db.findOne({ guildId: member.guild.id });
			if (!guildData?.tickets?.length) return;

			const userTickets = guildData.tickets.filter(t => t.userId === member.id && !t.closed);
			if (!userTickets.length) return;

			for (const ticket of userTickets) {

				const panel = guildData.ticketPanels?.find(p => p.messageId === ticket.panelMessageId);
				if (!panel?.config?.autoCloseOnLeave) continue;

				const channel = await member.guild.channels.fetch(ticket.channelId).catch(() => null);
				if (!channel) continue;

				const idx = guildData.tickets.findIndex(t => t.channelId === ticket.channelId);
				if (idx !== -1) {
					guildData.tickets[idx].closed = true;
					guildData.tickets[idx].closedAt = Date.now();
					guildData.tickets[idx].closedBy = 'AUTO_USER_LEFT';
				}

				await channel.setName(`closed-${ticket.ticketId.toString().padStart(4, '0')}`).catch(() => {});

				const { ContainerBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = await import('discord.js');
				const container = new ContainerBuilder()
					.addTextDisplayComponents(td => td.setContent(`# 🔒 Ticket Auto-Closed\nThe ticket owner <@${member.id}> left the server.`))
					.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

				const row = new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
					new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
					new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
				);
				container.addActionRowComponents(row);

				await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			await client.db.updateOne({ guildId: member.guild.id }, { $set: { tickets: guildData.tickets } });
		} catch (err) {
			console.error('[Ticket] Auto-close on leave error:', err);
		}
	});

	startInactivityScheduler(client);

	await client.login(token);
}

async function loadConfig() {
	try {
		const raw = await readFile(CONFIG_PATH, 'utf8');
		return raw ? JSON.parse(raw) : {};
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn('config.json not found; continuing with defaults.');
			return {};
		}

		throw error;
	}
}

function resolveToken(config) {
	const token = process.env.DISCORD_TOKEN || config.token;

	if (!token) {
		throw new Error('Discord token is missing. Provide DISCORD_TOKEN env var or fill config.json token.');
	}

	return token;
}

function resolveClientId(config) {
	const clientId = process.env.DISCORD_CLIENT_ID || config.clientId;

	if (!clientId) {
		throw new Error('Discord application clientId is missing. Provide DISCORD_CLIENT_ID env var or fill config.json clientId.');
	}

	return clientId;
}

function resolvePrefix(config) {
	const prefix = process.env.DISCORD_PREFIX || config.prefix || '!';

	if (typeof prefix !== 'string' || !prefix.trim()) {
		throw new Error('Prefix must be a non-empty string.');
	}

	return prefix;
}

function resolveOwnerIds(config) {
	if (process.env.OWNER_IDS) {
		return process.env.OWNER_IDS.split(',').map(id => id.trim()).filter(id => id);
	}
	return config.ownerIds || [];
}


async function loadSlashCommands(discordClient, __dirname) {
	const slashRoot = path.join(__dirname, 'src', 'commands', 'slash');
	const commandFiles = await collectCommandFiles(slashRoot);
	const slashData = [];
	const DISABLED_SLASH = new Set([

		'fluxfiles', 'crimefile', 'detain', 'detainlist', 'voidstaff', 'raidwipe', 'unbanall', 'massban', 'snapshot'
	]);

	let disabledCount = 0;
	let skippedCount = 0;

	for (const file of commandFiles) {
		const module = await import(pathToFileURL(file).href);
		const command = module.default ?? module;

		if (!command?.data || typeof command.execute !== 'function') {

			skippedCount++;
			continue;
		}

		const name = command.data.name;
		if (DISABLED_SLASH.has(name)) {
			disabledCount++;
			continue;
		}

		if (discordClient.commands.has(name)) {
			console.warn(`⚠️ [Slash] Duplicate command "${name}"`);
			continue;
		}

		discordClient.commands.set(name, command);
		slashData.push(command.data.toJSON());

		if (Array.isArray(command.components)) {
			for (const component of command.components) {
				if (!component?.customId || typeof component.execute !== 'function') continue;
				discordClient.components.set(component.customId, { ...component, commandName: name });
			}
		}
	}

	console.log(`⚡ [Slash] Loaded ${slashData.length} commands (${disabledCount} disabled, ${skippedCount} skipped)`);
	return slashData;
}

async function loadPrefixCommands(discordClient, __dirname) {
	const prefixRoot = path.join(__dirname, 'src', 'commands', 'prefix');
	const commandFiles = await collectCommandFiles(prefixRoot);
	let loaded = 0;

	let skippedCount = 0;

	for (const file of commandFiles) {
		const module = await import(pathToFileURL(file).href);
		const command = module.default ?? module;

		if (!command?.name || typeof command.execute !== 'function') {

			skippedCount++;
			continue;
		}

		const name = command.name.toLowerCase();

		if (discordClient.prefixCommands.has(name)) {
			continue;
		}

		discordClient.prefixCommands.set(name, command);

		if (Array.isArray(command.aliases)) {
			for (const alias of command.aliases) {
				const aliasKey = typeof alias === 'string' ? alias.toLowerCase() : null;
				if (!aliasKey) continue;

				if (discordClient.prefixCommands.has(aliasKey) || discordClient.prefixAliases.has(aliasKey)) {

					continue;
				}

				discordClient.prefixAliases.set(aliasKey, name);
			}
		}

		if (Array.isArray(command.components)) {
			for (const component of command.components) {
				if (!component?.customId || typeof component.execute !== 'function') continue;
				discordClient.components.set(component.customId, { ...component, commandName: name });
			}
		}

		loaded += 1;
	}

	console.log(`📜 [Prefix] Loaded ${loaded} commands (${skippedCount} skipped)`);
}

async function collectCommandFiles(dir) {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		const files = [];

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				files.push(...await collectCommandFiles(fullPath));
			} else if (entry.isFile() && entry.name.endsWith('.js')) {
				files.push(fullPath);
			}
		}

		return files;
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn(`Commands directory not found at ${dir}.`);
			return [];
		}

		throw error;
	}
}

async function registerSlashCommands(clientId, token, commands, guildIds = []) {
	if (!commands.length) {
		console.warn('No slash commands to register. Skipping registration.');
		return;
	}

	const rest = new REST({ version: '10' }).setToken(token);

	try {
		if (Array.isArray(guildIds) && guildIds.length) {
			await Promise.all(
				guildIds.map(async (guildId) => {
					await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
					console.log(`Registered ${commands.length} command(s) for guild ${guildId}.`);
				})
			);
		} else {
			await rest.put(Routes.applicationCommands(clientId), { body: commands });
			console.log(`Registered ${commands.length} global command${commands.length === 1 ? '' : 's'}.`);
		}
	} catch (error) {
		console.error('Failed to register slash commands:', error);
	}
}
