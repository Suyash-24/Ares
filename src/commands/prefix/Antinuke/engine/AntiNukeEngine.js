class AntiNukeEngine {
    constructor(client) {
        this.client = client;
        this.initialized = false;
        this.cache = new Map();
    }

    async initialize() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('🛡️ [Antinuke] Engine initialized');
    }

    async getConfig(guildId) {
        if (this.cache.has(guildId)) {
            const cached = this.cache.get(guildId);
            if (Date.now() - cached.timestamp < 30000) {
                return cached.data;
            }
        }

        const guildData = await this.client.db.findOne({ guildId });
        const config = guildData?.antinuke || this.getDefaultConfig();

        this.cache.set(guildId, { data: config, timestamp: Date.now() });
        return config;
    }

    getDefaultConfig() {
        return {
            enabled: false,
            admins: [],
            extraOwners: [],
            trustedAdmins: [],
            whitelist: [],
            modules: {},
            quarantineRole: null,
            logChannel: null,
            defaultPunishment: 'ban',
            defaultThreshold: 3,
            defaultWindow: 60,
            protocol: []
        };
    }

    async setConfig(guildId, config) {
        this.cache.set(guildId, { data: config, timestamp: Date.now() });
        await this.client.db.updateOne(
            { guildId },
            { $set: { antinuke: config } },
            { upsert: true }
        );
    }

    invalidateCache(guildId) {
        this.cache.delete(guildId);
    }

    async isEnabled(guildId) {
        const config = await this.getConfig(guildId);
        return config.enabled;
    }

    async isWhitelisted(guildId, userId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return false;

        if (userId === guild.ownerId) return true;
        if (userId === this.client.user.id) return true;
        if (this.client.config?.owners?.includes(userId)) return true;

        const config = await this.getConfig(guildId);
        if (config.extraOwners?.includes(userId)) return true;
        if (config.whitelist?.includes(userId)) return true;

        if (config.admins?.some(admin =>
            (typeof admin === 'string' ? admin === userId : admin.id === userId) &&
            (typeof admin === 'object' ? admin.immune : false)
        )) return true;
        if (config.admins?.includes(userId)) return true;

        return false;
    }

    async isModuleEnabled(guildId, moduleId) {
        const config = await this.getConfig(guildId);
        return config.enabled && config.modules?.[moduleId]?.enabled === true;
    }

    async getModuleConfig(guildId, moduleId) {
        const config = await this.getConfig(guildId);
        return config.modules?.[moduleId] || {
            enabled: false,
            threshold: config.defaultThreshold || 3,
            punishment: config.defaultPunishment || 'ban',
            window: config.defaultWindow || 60
        };
    }
}

export default AntiNukeEngine;
