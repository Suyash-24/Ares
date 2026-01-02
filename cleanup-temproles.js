import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Read the database file
const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// Clear temporaryRoles from all guilds
let count = 0;
for (const guildId in data.guilds) {
	if (data.guilds[guildId].temporaryRoles) {
		data.guilds[guildId].temporaryRoles = [];
		count++;
	}
}

// Write back to database
fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Cleaned up expired temporary roles from ${count} guilds.`);
