import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
	constructor() {
		this.type = 'json';
		this.postgresClient = null;
		this.sqliteDb = null;
		this.data = this.loadJSONDatabase();

		this.cache = new Map();
		this.cacheTTL = 30000;
	}

	async initialize() {

		if (await this.initializePostgres()) {
			console.log('✅ Using PostgreSQL');
			return;
		}

		if (await this.initializeSQLite()) {
			console.log('✅ Using SQLite');
			return;
		}

		console.log('✅ Using JSON database (local fallback)');
		this.type = 'json';
	}

	async initializePostgres() {
		try {
			const pg = await import('pg');
			const { Client } = pg.default;

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

			await this.createPostgresTables();
			return true;
		} catch (error) {
			console.error('❌ PostgreSQL connection failed:', error.message);
			return false;
		}
	}

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

	async initializeSQLite() {
		try {
			const betterSqlite3 = await import('better-sqlite3');
			const Database = betterSqlite3.default;

			const dbPath = path.join(DATA_DIR, 'ares.db');
			this.sqliteDb = new Database(dbPath);
			this.sqliteDb.pragma('journal_mode = WAL');
			this.type = 'sqlite';

			this.createSQLiteTables();
			return true;
		} catch (error) {
			console.log('SQLite unavailable, falling back to JSON...');
			return false;
		}
	}

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

	getType() {
		return this.type;
	}

	async findOne(collection, filter) {
		const cacheKey = `${collection}:${filter.guildId}`;
		const cached = this.cache.get(cacheKey);

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

		if (result) {
			this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
		}

		return result;
	}

	async updateOne(collection, filter, update) {

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

	async postgresUpdate(collection, filter, update) {
		try {
			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};
			const incOps = update.$inc || {};
			const hasInc = Object.keys(incOps).length > 0;

			if (hasInc) {

				const existing = await this.postgresFind(collection, filter);
				let data = existing || {};

				const getNestedValue = (obj, path) => {
					const parts = path.split('.');
					let cursor = obj;
					for (const part of parts) {
						if (cursor === undefined || cursor === null) return 0;
						cursor = cursor[part];
					}
					return typeof cursor === 'number' ? cursor : 0;
				};

				const setNestedValue = (obj, path, value) => {
					const parts = path.split('.');
					let cursor = obj;
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

				for (const key of Object.keys(incOps)) {
					const currentValue = getNestedValue(data, key);
					setNestedValue(data, key, currentValue + incOps[key]);
				}

				for (const key of Object.keys(setOps)) {
					setNestedValue(data, key, setOps[key]);
				}

				for (const key of Object.keys(unsetOps)) {
					const parts = key.split('.');
					let cursor = data;
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

				const query = `
					INSERT INTO ${collection} (guildId, data)
					VALUES ($1, $2::jsonb)
					ON CONFLICT (guildId) DO UPDATE
					SET data = $2::jsonb,
						updatedAt = CURRENT_TIMESTAMP
					RETURNING *
				`;
				const result = await this.postgresClient.query(query, [filter.guildId, JSON.stringify(data)]);
				return { ok: 1, modifiedCount: result.rowCount };
			}

			let setData = {};
			for (const key of Object.keys(setOps)) {
				const parts = key.split('.');
				if (parts.length === 1) {
					setData[key] = setOps[key];
				} else {
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

			if (!update.$set && !update.$unset) {
				setData = update;
			}

			const unsetPaths = Object.keys(unsetOps);
			let query;
			let params;

			if (unsetPaths.length > 0) {
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

	sqliteUpdate(collection, filter, update) {
		try {

			const selectStmt = this.sqliteDb.prepare(`SELECT data FROM ${collection} WHERE guildId = ?`);
			const existingRow = selectStmt.get(filter.guildId);

			let existingData = {};
			if (existingRow) {
				existingData = typeof existingRow.data === 'string'
					? JSON.parse(existingRow.data)
					: existingRow.data;
			}

			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};
			const incOps = update.$inc || {};
			let mergedData = { ...existingData };

			const getNestedValue = (obj, path) => {
				const parts = path.split('.');
				let cursor = obj;
				for (const part of parts) {
					if (cursor === undefined || cursor === null) return 0;
					cursor = cursor[part];
				}
				return typeof cursor === 'number' ? cursor : 0;
			};

			const setNestedValue = (obj, path, value) => {
				const parts = path.split('.');
				let cursor = obj;
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

			for (const key of Object.keys(incOps)) {
				const currentValue = getNestedValue(mergedData, key);
				const increment = incOps[key];
				setNestedValue(mergedData, key, currentValue + increment);
			}

			for (const key of Object.keys(setOps)) {
				setNestedValue(mergedData, key, setOps[key]);
			}

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

			if (!update.$set && !update.$unset && !update.$inc) {
				mergedData = { ...existingData, ...update };
			}

			if (existingRow) {

				const updateStmt = this.sqliteDb.prepare(
					`UPDATE ${collection} SET data = ?, updatedAt = CURRENT_TIMESTAMP WHERE guildId = ?`
				);
				const result = updateStmt.run(JSON.stringify(mergedData), filter.guildId);
				return { ok: 1, modifiedCount: result.changes };
			} else {

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

	jsonFind(collection, filter) {
		try {
			if (!this.data[collection]) {
				this.data[collection] = [];
			}

			const records = this.data[collection].filter(r => r.guildId === filter.guildId);
			if (records.length === 0) return null;
			let record = records[0];

			if (records.length > 1) {
				for (let i = 1; i < records.length; i++) {
					const other = records[i];

					for (const k of Object.keys(other)) {
						if (k === 'guildId') continue;
						if (typeof record[k] === 'undefined') record[k] = other[k];
						else if (typeof record[k] === 'object' && record[k] !== null && typeof other[k] === 'object' && other[k] !== null) {

							for (const nk of Object.keys(other[k])) {
								if (typeof record[k][nk] === 'undefined') record[k][nk] = other[k][nk];
							}
						}
					}
				}

				this.data[collection] = this.data[collection].filter((r, idx) => !(r.guildId === filter.guildId && idx > this.data[collection].indexOf(record)));
				this.saveJSONDatabase();
			}

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

				this.saveJSONDatabase();
			}

			return record || null;
		} catch (error) {
			console.error('JSON find error:', error.message);
			return null;
		}
	}

	jsonUpdate(collection, filter, update) {
		try {
			if (!this.data[collection]) {
				this.data[collection] = [];
			}

			const index = this.data[collection].findIndex(r => r.guildId === filter.guildId);
			const setOps = update.$set || {};
			const unsetOps = update.$unset || {};
			const incOps = update.$inc || {};

			const getNestedValue = (obj, path) => {
				const parts = path.split('.');
				let cursor = obj;
				for (const part of parts) {
					if (cursor === undefined || cursor === null) return 0;
					cursor = cursor[part];
				}
				return typeof cursor === 'number' ? cursor : 0;
			};

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
						if (!cursor || typeof cursor[part] !== 'object') return;
						cursor = cursor[part];
					}
				}
			};

			if (index !== -1) {
				const target = this.data[collection][index];

				for (const key of Object.keys(incOps)) {
					const currentValue = getNestedValue(target, key);
					applySet(target, key, currentValue + incOps[key]);
				}

				for (const key of Object.keys(setOps)) {
					applySet(target, key, setOps[key]);
				}

				for (const key of Object.keys(unsetOps)) {
					applyUnset(target, key);
				}

				if (!update.$set && !update.$unset && !update.$inc) {
					Object.assign(target, update);
				}
			} else {

				const newRecord = { guildId: filter.guildId };
				for (const key of Object.keys(incOps)) {
					applySet(newRecord, key, incOps[key]);
				}
				for (const key of Object.keys(setOps)) {
					applySet(newRecord, key, setOps[key]);
				}

				if (!update.$set && !update.$unset && !update.$inc) Object.assign(newRecord, update);
				this.data[collection].push(newRecord);
			}

			this.saveJSONDatabase();
			return { ok: 1, modifiedCount: 1 };
		} catch (error) {
			console.error('JSON update error:', error.message);
			return { ok: 0 };
		}
	}

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

	saveJSONDatabase() {
		try {
			fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
		} catch (error) {
			console.error('Error saving JSON database:', error.message);
		}
	}

	getType() {
		return this.type;
	}

	getGuilds() {
		return {
			findOne: (filter) => this.findOne('guilds', filter),
			updateOne: (filter, update) => this.updateOne('guilds', filter, update)
		};
	}

	async ping() {
		const start = performance.now();
		try {
			if (this.type === 'postgres') {
				await this.postgresClient.query('SELECT 1');
			} else if (this.type === 'sqlite') {
				this.sqliteDb.prepare('SELECT 1').get();
			} else {

				await new Promise(resolve => setImmediate(resolve));
			}
			return Math.round(performance.now() - start);
		} catch (error) {
			return -1;
		}
	}
}

export default new DatabaseManager();
