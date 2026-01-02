export const MODULES = {
    ban: { name: 'Anti Ban', description: 'Prevents mass banning', emoji: '🔨' },
    kick: { name: 'Anti Kick', description: 'Prevents mass kicking', emoji: '👢' },
    role: { name: 'Anti Role', description: 'Prevents mass role changes', emoji: '🎭' },
    channel: { name: 'Anti Channel', description: 'Prevents mass channel changes', emoji: '📁' },
    webhook: { name: 'Anti Webhook', description: 'Prevents webhook spam', emoji: '🪝' },
    emoji: { name: 'Anti Emoji', description: 'Prevents emoji deletion', emoji: '😀' },
    botadd: { name: 'Anti Bot', description: 'Prevents unauthorized bots', emoji: '🤖' },
    vanity: { name: 'Anti Vanity', description: 'Prevents vanity changes', emoji: '🔗' },
    prune: { name: 'Anti Prune', description: 'Prevents mass pruning', emoji: '✂️' },
    permissions: { name: 'Anti Permissions', description: 'Monitors dangerous perms', emoji: '⚠️' }
};

export const MODULE_DISPLAY_NAMES = {
    ban: 'Anti Ban',
    kick: 'Anti Kick',
    role: 'Anti Role',
    channel: 'Anti Channel',
    webhook: 'Anti Webhook',
    emoji: 'Anti Emoji',
    botadd: 'Anti Bot',
    vanity: 'Anti Vanity',
    prune: 'Anti Prune',
    permissions: 'Anti Permissions'
};

export const PUNISHMENTS = {
    quarantine: { name: 'Quarantine', description: 'Isolate user', severity: 1 },
    strip: { name: 'Strip', description: 'Remove all roles', severity: 2 },
    kick: { name: 'Kick', description: 'Kick from server', severity: 3 },
    ban: { name: 'Ban', description: 'Ban permanently', severity: 4 },
    timeout: { name: 'Timeout', description: 'Timeout 28 days', severity: 2 }
};

export const PUNISHMENT_TYPES = ['quarantine', 'strip', 'kick', 'ban', 'timeout'];

export const MODES = ['basic', 'advanced', 'strict'];

export const PRESETS = {
    recommended: { threshold: 3, punishment: 'ban', modules: ['ban', 'kick', 'role', 'channel', 'webhook', 'botadd'] },
    strict: { threshold: 2, punishment: 'ban', modules: Object.keys(MODULES) },
    light: { threshold: 5, punishment: 'kick', modules: ['ban', 'kick', 'channel'] }
};

export const DANGEROUS_PERMISSIONS = [
    'Administrator', 'BanMembers', 'KickMembers', 'ManageGuild',
    'ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageEmojisAndStickers',
    'MentionEveryone', 'ModerateMembers', 'ManageNicknames', 'ViewAuditLog'
];

export const TIMEOUT_28_DAYS_MS = 28 * 24 * 60 * 60 * 1000;
