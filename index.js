import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

import { bootstrap } from './src/utils/bootstrap.js';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.GuildPresences
	],
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
		Partials.Reaction,
		Partials.User,
		Partials.GuildScheduledEvent
	]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.prefixAliases = new Collection();
client.components = new Collection();
client.componentContexts = new Map();

client.updateConfig = async (newConfig) => {
	const CONFIG_PATH = path.join(__dirname, 'config.json');
	try {
		await writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
		client.config = newConfig;
	} catch (error) {
		console.error('Error updating config:', error);
		throw error;
	}
};

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
	console.error('Unhandled promise rejection:', reason);
});

process.on('warning', (warning) => {
	if (warning.name === 'DeprecationWarning' && warning.message.includes('The ready event has been renamed to clientReady')) {

		return;
	}
	console.warn(warning);
});

bootstrap(client, __dirname).catch((error) => {
	console.error('Failed to start Ares:', error);
	process.exit(1);
});
