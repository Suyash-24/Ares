/**
 * PostgreSQL to SQLite Migration Script
 * 
 * This script migrates all data from PostgreSQL to SQLite.
 * Run this BEFORE removing PostgreSQL configuration.
 * 
 * Usage: node scripts/migrate-to-sqlite.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function migrate() {
	console.log('🔄 PostgreSQL to SQLite Migration Tool\n');
	console.log('='.repeat(50));
	
	// Check for DATABASE_URL
	if (!process.env.DATABASE_URL) {
		console.log('❌ No DATABASE_URL found. Nothing to migrate.');
		console.log('   If you want to use SQLite, just remove DATABASE_URL from .env');
		process.exit(0);
	}
	
	// Connect to PostgreSQL
	console.log('\n📡 Connecting to PostgreSQL...');
	let pgClient;
	try {
		const pg = await import('pg');
		const { Client } = pg.default;
		pgClient = new Client({ connectionString: process.env.DATABASE_URL });
		await pgClient.connect();
		console.log('✅ Connected to PostgreSQL');
	} catch (error) {
		console.error('❌ Failed to connect to PostgreSQL:', error.message);
		console.log('\n💡 If your PostgreSQL quota is exceeded, you may need to:');
		console.log('   1. Wait for quota reset, or');
		console.log('   2. Start fresh with SQLite (no migration needed)');
		process.exit(1);
	}
	
	// Initialize SQLite
	console.log('\n📁 Initializing SQLite database...');
	let sqliteDb;
	try {
		const betterSqlite3 = await import('better-sqlite3');
		const Database = betterSqlite3.default;
		const dbPath = path.join(DATA_DIR, 'ares.db');
		
		// Backup existing SQLite if it exists
		if (fs.existsSync(dbPath)) {
			const backupPath = path.join(DATA_DIR, `ares.backup.${Date.now()}.db`);
			fs.copyFileSync(dbPath, backupPath);
			console.log(`📦 Backed up existing SQLite to: ${backupPath}`);
		}
		
		sqliteDb = new Database(dbPath);
		sqliteDb.pragma('journal_mode = WAL');
		console.log('✅ SQLite initialized');
	} catch (error) {
		console.error('❌ Failed to initialize SQLite:', error.message);
		console.log('\n💡 Make sure better-sqlite3 is installed: npm install better-sqlite3');
		await pgClient.end();
		process.exit(1);
	}
	
	// Create SQLite tables
	console.log('\n📋 Creating SQLite tables...');
	try {
		sqliteDb.exec(`
			CREATE TABLE IF NOT EXISTS guilds (
				guildId TEXT PRIMARY KEY,
				data TEXT NOT NULL,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);
		sqliteDb.exec(`
			CREATE TABLE IF NOT EXISTS moderation (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				guildId TEXT NOT NULL,
				userId TEXT NOT NULL,
				moderatorId TEXT NOT NULL,
				action TEXT NOT NULL,
				reason TEXT,
				timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (guildId) REFERENCES guilds(guildId)
			)
		`);
		sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_moderation_guild ON moderation(guildId)`);
		sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation(userId)`);
		console.log('✅ Tables created');
	} catch (error) {
		console.error('❌ Failed to create tables:', error.message);
	}
	
	// Migrate guilds table
	console.log('\n📤 Migrating guilds data...');
	try {
		const result = await pgClient.query('SELECT * FROM guilds');
		const guilds = result.rows;
		console.log(`   Found ${guilds.length} guilds to migrate`);
		
		const insertStmt = sqliteDb.prepare(`
			INSERT OR REPLACE INTO guilds (guildId, data, createdAt, updatedAt)
			VALUES (?, ?, ?, ?)
		`);
		
		let migrated = 0;
		for (const guild of guilds) {
			try {
				const dataStr = typeof guild.data === 'string' 
					? guild.data 
					: JSON.stringify(guild.data);
				insertStmt.run(
					guild.guildid || guild.guildId,
					dataStr,
					guild.createdat || guild.createdAt || new Date().toISOString(),
					guild.updatedat || guild.updatedAt || new Date().toISOString()
				);
				migrated++;
			} catch (err) {
				console.error(`   ⚠️ Failed to migrate guild ${guild.guildid || guild.guildId}: ${err.message}`);
			}
		}
		console.log(`✅ Migrated ${migrated}/${guilds.length} guilds`);
	} catch (error) {
		console.error('❌ Failed to migrate guilds:', error.message);
	}
	
	// Migrate moderation table
	console.log('\n📤 Migrating moderation logs...');
	try {
		const result = await pgClient.query('SELECT * FROM moderation');
		const logs = result.rows;
		console.log(`   Found ${logs.length} moderation logs to migrate`);
		
		const insertStmt = sqliteDb.prepare(`
			INSERT OR REPLACE INTO moderation (id, guildId, userId, moderatorId, action, reason, timestamp)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);
		
		let migrated = 0;
		for (const log of logs) {
			try {
				insertStmt.run(
					log.id,
					log.guildid || log.guildId,
					log.userid || log.userId,
					log.moderatorid || log.moderatorId,
					log.action,
					log.reason,
					log.timestamp
				);
				migrated++;
			} catch (err) {
				console.error(`   ⚠️ Failed to migrate log ${log.id}: ${err.message}`);
			}
		}
		console.log(`✅ Migrated ${migrated}/${logs.length} moderation logs`);
	} catch (error) {
		if (error.message.includes('does not exist')) {
			console.log('   ℹ️ No moderation table found (this is OK)');
		} else {
			console.error('❌ Failed to migrate moderation:', error.message);
		}
	}
	
	// Cleanup
	await pgClient.end();
	sqliteDb.close();
	
	console.log('\n' + '='.repeat(50));
	console.log('✅ Migration complete!\n');
	console.log('📝 Next steps:');
	console.log('   1. Edit your .env file on the VPS');
	console.log('   2. Remove or comment out DATABASE_URL');
	console.log('   3. Restart the bot with: pm2 restart ares-bot');
	console.log('   4. Check logs: pm2 logs ares-bot');
	console.log('\n💡 The bot will now use SQLite automatically.');
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

migrate().catch(console.error);
