import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
	constructor() {
		this.type = 'json'; // Default to JSON
		this.postgresClient = null;
		this.sqliteDb = null;
		this.data = this.loadJSONDatabase();
		// In-memory cache for frequently accessed guild data
		this.cache = new Map();
		this.cacheTTL = 30000; // 30 seconds cache TTL
	}

	/**
	 * Initialize database with priority: PostgreSQL > SQLite > JSON
	 */
	async initialize() {
		// Try PostgreSQL first
		if (await this.initializePostgres()) {
			console.log('✅ Using PostgreSQL');
			return;
		}

		// Fall back to SQLite
		if (await this.initializeSQLite()) {
			console.log('✅ Using SQLite');
			return;
		}

		// Fall back to JSON
		console.log('✅ Using JSON database (local fallback)');
		this.type = 'json';
	}

	/**
	 * Initialize PostgreSQL connection
	 */
	async initializePostgres() {
		try {
			const pg = await import('pg');
			const { Client } = pg.default;

			// Try connection string first (for Neon), then fallback to individual parameters
			const connectionString = process.env.DATABASE_URL;
			const clientConfig = connectionString 
				? { connectionString }
				: {
					host: process.env.DB_HOST || 'localhost',
					port: process.env.DB_PORT || 5432,
					database: process.env.DB_NAME || 'ares_bot',
					user: process.env.DB_USER || 'postgres',
					password: process.env.DB_PASSWORD,
					ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
				};

			this.postgresClient = new Client(clientConfig);

			await this.postgresClient.connect();
			this.type = 'postgres';

			// Create necessary tables
			await this.createPostgresTables();
			return true;
		} catch (error) {
			console.error('❌ PostgreSQL connection failed:', error.message);
			return false;
		}
	}

	/**
	 * Create PostgreSQL tables
	 */
	async createPostgresTables() {
		const queries = [
			`CREATE TABLE IF NOT EXISTS guilds (
				guildId VARCHAR(255) PRIMARY KEY,
				data JSONB NOT NULL,
				createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)`,
			`CREATE TABLE IF NOT EXISTS moderation (
				id SERIAL PRIMARY KEY,
				guildId VARCHAR(255) NOT NULL,
				userId VARCHAR(255) NOT NULL,
				moderatorId VARCHAR(255) NOT NULL,
				action VARCHAR(50) NOT NULL,
				reason TEXT,
				timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (guildId) REFERENCES guilds(guildId)
			)`,
			`CREATE INDEX IF NOT EXISTS idx_moderation_guild ON moderation(guildId)`,
			`CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation(userId)`
		];

		for (const query of queries) {
			try {
				await this.postgresClient.query(query);
			} catch (error) {
				console.error('Error creating table:', error.message);
			}
		}
	}

	/**
	 * Initialize SQLite database
	 */
	async initializeSQLite() {
		try {
			const betterSqlite3 = await import('better-sqlite3');
			const Database = betterSqlite3.default;

			const dbPath = path.join(DATA_DIR, 'ares.db');
			this.sqliteDb = new Database(dbPath);
			this.sqliteDb.pragma('journal_mode = WAL');
			this.type = 'sqlite';

			// Create necessary tables
			this.createSQLiteTables();
			return true;
		} catch (error) {
			console.log('SQLite unavailable, falling back to JSON...');
			return false;
		}
	}

	/**
	 * Create SQLite tables
	 */
	createSQLiteTables() {
		const queries = [
			`CREATE TABLE IF NOT EXISTS guilds (
				guildId TEXT PRIMARY KEY,
				data TEXT NOT NULL,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			)`,
			`CREATE TABLE IF NOT EXISTS moderation (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				guildId TEXT NOT NULL,
				userId TEXT NOT NULL,
				moderatorId TEXT NOT NULL,
				action TEXT NOT NULL,
				reason TEXT,
				timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (guildId) REFERENCES guilds(guildId)
			)`,
			`CREATE INDEX IF NOT EXISTS idx_moderation_guild ON moderation(guildId)`,
			`CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation(userId)`
		];

		for (const query of queries) {
			try {
				this.sqliteDb.exec(query);
			} catch (error) {
				console.error('Error creating SQLite table:', error.message);
			}
		}
	}

	/**
	 * Find guild data (with caching)
	 */
	async findOne(collection, filter) {
		const cacheKey = `${collection}:${filter.guildId}`;
		const cached = this.cache.get(cacheKey);
		
		// Return cached data if valid
		if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
			return cached.data;
		}

		let result;
		if (this.type === 'postgres') {
			result = await this.postgresFind(collection, filter);
		} else if (this.type === 'sqlite') {
			result = this.sqliteFind(collection, filter);
		} else {
			result = this.jsonFind(collection, filter);
		}

		// Cache the result
		if (result) {
			this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
		}
		
		return result;
	}

	/**
	 * Update guild data (invalidates cache)
	 */
	async updateOne(collection, filter, update) {
		// Invalidate cache for this guild
		const cacheKey = `${collection}:${filter.guildId}`;
		this.cache.delete(cacheKey);

		let result;
		if (this.type === 'postgres') {
			result = await this.postgresUpdate(collection, filter, update);
		} else if (this.type === 'sqlite') {
			result = this.sqliteUpdate(collection, filter, update);
		} else {
			result = this.jsonUpdate(collection, filter, update);
		}
		
		return result;
	}

	/**
	 * PostgreSQL find
	 */
	async postgresFind(collection, filter) {
		try {
			const result = await this.postgresClient.query(
				`SELECT data FROM ${collection} WHERE guildId = $1`,
				[filter.guildId]
			);

			if (result.rows.length > 0) {
				return typeof result.rows[0].data === 'string'
					? JSON.parse(result.rows[0].data)
					: result.rows[0].data;
			}
			return null;
		} catch (error) {
			console.error('PostgreSQL find error:', error.message);
			return null;
		}
	}

	/**
	 * PostgreSQL update - uses JSONB merge for efficient single-query updates
	 */
	async postgresUpdate(collection, filter, update) {
		try {
			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};

			// Build the merged data object for $set operations
			let setData = {};
			for (const key of Object.keys(setOps)) {
				const parts = key.split('.');
				if (parts.length === 1) {
					// Simple key - direct set
					setData[key] = setOps[key];
				} else {
					// Dotted path - build nested object
					let cursor = setData;
					for (let i = 0; i < parts.length; i++) {
						const part = parts[i];
						if (i === parts.length - 1) {
							cursor[part] = setOps[key];
						} else {
							if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
							cursor = cursor[part];
						}
					}
				}
			}

			// If no $set or $unset, use update object directly
			if (!update.$set && !update.$unset) {
				setData = update;
			}

			// Build unset paths for removal
			const unsetPaths = Object.keys(unsetOps);

			// Use PostgreSQL's JSONB concatenation for efficient merge
			// INSERT ... ON CONFLICT ... UPDATE with JSONB merge
			let query;
			let params;

			if (unsetPaths.length > 0) {
				// With $unset - need to remove keys after merge
				const unsetClause = unsetPaths.map(p => `'${p.split('.')[0]}'`).join(', ');
				query = `
					INSERT INTO ${collection} (guildId, data)
					VALUES ($1, $2::jsonb)
					ON CONFLICT (guildId) DO UPDATE
					SET data = (${collection}.data || $2::jsonb) - ARRAY[${unsetClause}],
						updatedAt = CURRENT_TIMESTAMP
					RETURNING *
				`;
				params = [filter.guildId, JSON.stringify(setData)];
			} else {
				// Simple merge without $unset
				query = `
					INSERT INTO ${collection} (guildId, data)
					VALUES ($1, $2::jsonb)
					ON CONFLICT (guildId) DO UPDATE
					SET data = ${collection}.data || $2::jsonb,
						updatedAt = CURRENT_TIMESTAMP
					RETURNING *
				`;
				params = [filter.guildId, JSON.stringify(setData)];
			}

			const result = await this.postgresClient.query(query, params);
			return { ok: 1, modifiedCount: result.rowCount };
		} catch (error) {
			console.error('PostgreSQL update error:', error.message);
			return { ok: 0 };
		}
	}

	/**
	 * SQLite find
	 */
	sqliteFind(collection, filter) {
		try {
			const stmt = this.sqliteDb.prepare(`SELECT data FROM ${collection} WHERE guildId = ?`);
			const result = stmt.get(filter.guildId);

			if (result) {
				return typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
			}
			return null;
		} catch (error) {
			console.error('SQLite find error:', error.message);
			return null;
		}
	}

	/**
	 * SQLite update - properly merges $set data with existing data
	 */
	sqliteUpdate(collection, filter, update) {
		try {
			// First, get existing data to merge with
			const selectStmt = this.sqliteDb.prepare(`SELECT data FROM ${collection} WHERE guildId = ?`);
			const existingRow = selectStmt.get(filter.guildId);

			let existingData = {};
			if (existingRow) {
				existingData = typeof existingRow.data === 'string'
					? JSON.parse(existingRow.data)
					: existingRow.data;
			}

			// Merge $set data with existing data
			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};
			let mergedData = { ...existingData };

			// Apply $set operations (supports dotted paths)
			for (const key of Object.keys(setOps)) {
				const parts = key.split('.');
				let cursor = mergedData;
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					if (i === parts.length - 1) {
						cursor[part] = setOps[key];
					} else {
						if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
						cursor = cursor[part];
					}
				}
			}

			// Apply $unset operations
			for (const key of Object.keys(unsetOps)) {
				const parts = key.split('.');
				let cursor = mergedData;
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					if (i === parts.length - 1) {
						if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) delete cursor[part];
					} else {
						if (!cursor || typeof cursor[part] !== 'object') break;
						cursor = cursor[part];
					}
				}
			}

			// If no $set or $unset, merge update object directly
			if (!update.$set && !update.$unset) {
				mergedData = { ...existingData, ...update };
			}

			if (existingRow) {
				// Update existing record
				const updateStmt = this.sqliteDb.prepare(
					`UPDATE ${collection} SET data = ?, updatedAt = CURRENT_TIMESTAMP WHERE guildId = ?`
				);
				const result = updateStmt.run(JSON.stringify(mergedData), filter.guildId);
				return { ok: 1, modifiedCount: result.changes };
			} else {
				// Insert new record
				const insertStmt = this.sqliteDb.prepare(
					`INSERT INTO ${collection} (guildId, data) VALUES (?, ?)`
				);
				insertStmt.run(filter.guildId, JSON.stringify(mergedData));
				return { ok: 1, modifiedCount: 1 };
			}
		} catch (error) {
			console.error('SQLite update error:', error.message);
			return { ok: 0 };
		}
	}

	/**
	 * JSON find
	 */
	jsonFind(collection, filter) {
		try {
			if (!this.data[collection]) {
				this.data[collection] = [];
			}

			const records = this.data[collection].filter(r => r.guildId === filter.guildId);
			if (records.length === 0) return null;
			let record = records[0];
			// If multiple records exist for the same guild, merge them to a single canonical record
			if (records.length > 1) {
				for (let i = 1; i < records.length; i++) {
					const other = records[i];
					// shallow-merge keys, favoring existing values in `record` when conflicts arise
					for (const k of Object.keys(other)) {
						if (k === 'guildId') continue;
						if (typeof record[k] === 'undefined') record[k] = other[k];
						else if (typeof record[k] === 'object' && record[k] !== null && typeof other[k] === 'object' && other[k] !== null) {
							// merge nested objects shallowly
							for (const nk of Object.keys(other[k])) {
								if (typeof record[k][nk] === 'undefined') record[k][nk] = other[k][nk];
							}
						}
					}
				}
				// remove duplicates from the array, keep the first record
				this.data[collection] = this.data[collection].filter((r, idx) => !(r.guildId === filter.guildId && idx > this.data[collection].indexOf(record)));
				this.saveJSONDatabase();
			}

			// Migrate any flat dotted keys into nested objects so existing data becomes accessible
			let mutated = false;
			for (const key of Object.keys(record)) {
				if (key.includes('.') && key !== 'guildId') {
					const parts = key.split('.');
					let cursor = record;
					for (let i = 0; i < parts.length; i++) {
						const part = parts[i];
						if (i === parts.length - 1) {
							cursor[part] = record[key];
						} else {
							if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
							cursor = cursor[part];
						}
					}
					delete record[key];
					mutated = true;
				}
			}

			if (mutated) {
				// persist migration
				this.saveJSONDatabase();
			}

			return record || null;
		} catch (error) {
			console.error('JSON find error:', error.message);
			return null;
		}
	}

	/**
	 * JSON update with support for dotted path keys in $set and $unset (mimics Mongo-style behavior)
	 */
	jsonUpdate(collection, filter, update) {
		try {
			if (!this.data[collection]) {
				this.data[collection] = [];
			}

			const index = this.data[collection].findIndex(r => r.guildId === filter.guildId);
			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};

			const applySet = (target, key, value) => {
				const parts = key.split('.');
				let cursor = target;
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					if (i === parts.length - 1) {
						cursor[part] = value;
					} else {
						if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
						cursor = cursor[part];
					}
				}
			};

			const applyUnset = (target, key) => {
				const parts = key.split('.');
				let cursor = target;
				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					if (i === parts.length - 1) {
						if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) delete cursor[part];
					} else {
						if (!cursor || typeof cursor[part] !== 'object') return; // nothing to unset deeper
						cursor = cursor[part];
					}
				}
			};

			if (index !== -1) {
				const target = this.data[collection][index];
				// apply $set dotted keys
				for (const key of Object.keys(setOps)) {
					applySet(target, key, setOps[key]);
				}
				// apply $unset dotted keys
				for (const key of Object.keys(unsetOps)) {
					applyUnset(target, key);
				}
				// If update passed direct fields (no $set/$unset), merge them shallowly
				if (!update.$set && !update.$unset) {
					Object.assign(target, update);
				}
			} else {
				// create new record and apply $set keys
				const newRecord = { guildId: filter.guildId };
				for (const key of Object.keys(setOps)) {
					applySet(newRecord, key, setOps[key]);
				}
				// also merge direct update fields
				if (!update.$set && !update.$unset) Object.assign(newRecord, update);
				this.data[collection].push(newRecord);
			}

			this.saveJSONDatabase();
			return { ok: 1, modifiedCount: 1 };
		} catch (error) {
			console.error('JSON update error:', error.message);
			return { ok: 0 };
		}
	}

	/**
	 * Load JSON database from file
	 */
	loadJSONDatabase() {
		try {
			if (fs.existsSync(DB_FILE)) {
				const data = fs.readFileSync(DB_FILE, 'utf-8');
				return JSON.parse(data);
			}
		} catch (error) {
			console.error('Error loading JSON database:', error.message);
		}
		return { guilds: [] };
	}

	/**
	 * Save JSON database to file
	 */
	saveJSONDatabase() {
		try {
			fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
		} catch (error) {
			console.error('Error saving JSON database:', error.message);
		}
	}

	/**
	 * Get database type
	 */
	getType() {
		return this.type;
	}

	/**
	 * Get guild collection
	 */
	getGuilds() {
		return {
			findOne: (filter) => this.findOne('guilds', filter),
			updateOne: (filter, update) => this.updateOne('guilds', filter, update)
		};
	}
	/**
	 * Ping the database to check latency
	 * @returns {Promise<number>} Latency in ms
	 */
	async ping() {
		const start = performance.now();
		try {
			if (this.type === 'postgres') {
				await this.postgresClient.query('SELECT 1');
			} else if (this.type === 'sqlite') {
				this.sqliteDb.prepare('SELECT 1').get();
			} else {
				// JSON is just memory access
				await new Promise(resolve => setImmediate(resolve));
			}
			return Math.round(performance.now() - start);
		} catch (error) {
			return -1;
		}
	}
}

export default new DatabaseManager();
