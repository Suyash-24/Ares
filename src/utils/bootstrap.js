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

	// Initialize database manager
	await DatabaseManager.initialize();
	client.db = DatabaseManager.getGuilds();
	console.log(`✅ Database initialized: ${DatabaseManager.getType()}`);

	const token = resolveToken(config);
	const clientId = resolveClientId(config);
	client.prefix = resolvePrefix(config);

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
	
	// Register logging event handlers
	registerLoggingEvents(client);

	// Register antinuke protection handlers with whitelist integration
	registerAntinukeProtection(client);

	// Register starboard event handler
	registerStarboardHandler(client);

	// Register bump reminder handler
	registerBumpReminderHandler(client);

	// Register automod message handler
	registerAutomodHandler(client);

	// Register antiraid handler
	registerAntiraidHandler(client);

	// Register birthday handler
	registerBirthdayHandler(client);

	// Register AFK handler
	registerAfkHandler(client);

	await initializeAntinuke(client);

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

async function loadSlashCommands(discordClient, __dirname) {
	const slashRoot = path.join(__dirname, 'src', 'commands', 'slash');
	const commandFiles = await collectCommandFiles(slashRoot);
	const slashData = [];

	for (const file of commandFiles) {
		const module = await import(pathToFileURL(file).href);
		const command = module.default ?? module;

		if (!command?.data || typeof command.execute !== 'function') {
			console.warn(`Skipping command at ${path.relative(__dirname, file)} (missing data or execute).`);
			continue;
		}

		const name = command.data.name;

		if (discordClient.commands.has(name)) {
			console.warn(`Duplicate command name "${name}" detected. Only the first definition will be used.`);
			continue;
		}

		discordClient.commands.set(name, command);
		slashData.push(command.data.toJSON());

		if (Array.isArray(command.components)) {
			for (const component of command.components) {
				if (!component?.customId || typeof component.execute !== 'function') {
					console.warn(`Component in command "${name}" is missing a valid customId or execute handler.`);
					continue;
				}

				if (discordClient.components.has(component.customId)) {
					console.warn(`Duplicate component customId "${component.customId}" detected. Overwriting previous handler.`);
				}

				discordClient.components.set(component.customId, {
					...component,
					commandName: name
				});
			}
		}
	}

	console.log(`Loaded ${slashData.length} slash command${slashData.length === 1 ? '' : 's'}.`);
	return slashData;
}

async function loadPrefixCommands(discordClient, __dirname) {
	const prefixRoot = path.join(__dirname, 'src', 'commands', 'prefix');
	const commandFiles = await collectCommandFiles(prefixRoot);
	let loaded = 0;

	for (const file of commandFiles) {
		const module = await import(pathToFileURL(file).href);
		const command = module.default ?? module;

		if (!command?.name || typeof command.execute !== 'function') {
			console.warn(`Skipping prefix command at ${path.relative(__dirname, file)} (missing name or execute).`);
			continue;
		}

		const name = command.name.toLowerCase();

		if (discordClient.prefixCommands.has(name)) {
			console.warn(`Duplicate prefix command name "${name}" detected. Only the first definition will be used.`);
			continue;
		}

		discordClient.prefixCommands.set(name, command);

		if (Array.isArray(command.aliases)) {
			for (const alias of command.aliases) {
				const aliasKey = typeof alias === 'string' ? alias.toLowerCase() : null;

				if (!aliasKey) {
					continue;
				}

				if (discordClient.prefixCommands.has(aliasKey) || discordClient.prefixAliases.has(aliasKey)) {
					console.warn(`Alias "${aliasKey}" for command "${name}" conflicts with an existing command or alias.`);
					continue;
				}

				discordClient.prefixAliases.set(aliasKey, name);
			}
		}

		if (Array.isArray(command.components)) {
			for (const component of command.components) {
				if (!component?.customId || typeof component.execute !== 'function') {
					console.warn(`Component in prefix command "${name}" is missing a valid customId or execute handler.`);
					continue;
				}

				if (discordClient.components.has(component.customId)) {
					console.warn(`Duplicate component customId "${component.customId}" detected. Overwriting previous handler.`);
				}

				discordClient.components.set(component.customId, {
					...component,
					commandName: name
				});
			}
		}

		loaded += 1;
	}

	console.log(`Loaded ${loaded} prefix command${loaded === 1 ? '' : 's'}.`);
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
