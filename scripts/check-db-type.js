/**
 * Check Database Type Script
 * Run this to verify which database is being used.
 * 
 * Usage: node scripts/check-db-type.js
 */

import dotenv from 'dotenv';
dotenv.config();

async function check() {
	console.log('🔍 Checking Database Configuration\n');
	console.log('='.repeat(50));
	
	// Check environment variables
	console.log('\n📋 Environment Variables:');
	console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
	console.log(`   DB_HOST: ${process.env.DB_HOST || '(not set)'}`);
	
	// Import and initialize database manager
	console.log('\n📡 Testing Database Connections...\n');
	
	// Test PostgreSQL
	let pgAvailable = false;
	if (process.env.DATABASE_URL) {
		try {
			const pg = await import('pg');
			const { Client } = pg.default;
			const client = new Client({ connectionString: process.env.DATABASE_URL });
			await client.connect();
			const result = await client.query('SELECT COUNT(*) FROM guilds');
			console.log(`   PostgreSQL: ✅ Connected (${result.rows[0].count} guilds)`);
			await client.end();
			pgAvailable = true;
		} catch (error) {
			console.log(`   PostgreSQL: ❌ Failed - ${error.message}`);
		}
	} else {
		console.log('   PostgreSQL: ⏭️ Skipped (no DATABASE_URL)');
	}
	
	// Test SQLite
	let sqliteAvailable = false;
	try {
		const betterSqlite3 = await import('better-sqlite3');
		const Database = betterSqlite3.default;
		const fs = await import('fs');
		const path = await import('path');
		const { fileURLToPath } = await import('url');
		
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const dbPath = path.join(__dirname, '../data/ares.db');
		
		if (fs.existsSync(dbPath)) {
			const db = new Database(dbPath, { readonly: true });
			const result = db.prepare('SELECT COUNT(*) as count FROM guilds').get();
			console.log(`   SQLite: ✅ Available (${result.count} guilds)`);
			db.close();
			sqliteAvailable = true;
		} else {
			console.log('   SQLite: ⚪ File not found (will be created on first use)');
			sqliteAvailable = true; // Module is available
		}
	} catch (error) {
		console.log(`   SQLite: ❌ Not available - ${error.message}`);
	}
	
	// Test JSON
	try {
		const fs = await import('fs');
		const path = await import('path');
		const { fileURLToPath } = await import('url');
		
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const dbPath = path.join(__dirname, '../data/database.json');
		
		if (fs.existsSync(dbPath)) {
			const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
			const guilds = data.guilds?.length || 0;
			console.log(`   JSON: ✅ Available (${guilds} guilds)`);
		} else {
			console.log('   JSON: ⚪ File not found (will be created on first use)');
		}
	} catch (error) {
		console.log(`   JSON: ❌ Error - ${error.message}`);
	}
	
	console.log('\n' + '='.repeat(50));
	console.log('\n📊 Which database will be used:');
	
	if (pgAvailable) {
		console.log('   🔷 PostgreSQL (highest priority)');
	} else if (sqliteAvailable) {
		console.log('   🔷 SQLite (PostgreSQL unavailable)');
	} else {
		console.log('   🔷 JSON file (fallback)');
	}
	
	console.log('\n💡 To force SQLite:');
	console.log('   1. Remove DATABASE_URL from .env');
	console.log('   2. Restart the bot');
}

check().catch(console.error);
