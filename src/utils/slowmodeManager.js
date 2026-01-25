const scheduledSlowmodes = new Map();

const normalizeRecord = (rec, guildIdFallback) => ({
  guildId: rec.guildId || guildIdFallback,
  channelId: rec.channelId,
  interval: rec.interval,
  expiresAt: rec.expiresAt
});

const getKey = (record) => `${record.guildId}:${record.channelId}`;

export async function initializeSlowmodeManager(client) {
  await restoreSlowmodes(client);
  startSlowmodeExpirationChecker(client);
}

export function scheduleSlowmodeClear(client, record) {
  const normalized = normalizeRecord(record, record.guildId);
  if (!normalized.guildId || !normalized.channelId) return;

  const key = getKey(normalized);
  const delay = new Date(normalized.expiresAt).getTime() - Date.now();

  if (delay <= 0) {
    removeExpiredSlowmode(client, normalized);
    return;
  }

  if (scheduledSlowmodes.has(key)) {
    clearTimeout(scheduledSlowmodes.get(key));
  }

  const timeout = setTimeout(() => {
    scheduledSlowmodes.delete(key);
    removeExpiredSlowmode(client, normalized);
  }, delay);

  scheduledSlowmodes.set(key, timeout);
}

export async function cleanupExpiredSlowmodes(client, guildId) {
  const guildData = await client.db.findOne({ guildId });
  if (!guildData || !guildData.moderation || !guildData.moderation.slowmode) return guildData;

  const now = Date.now();
  const slowmodeEntries = guildData.moderation.slowmode || {};
  const expired = Object.entries(slowmodeEntries).filter(([channelId, rec]) => rec && rec.expiresAt && new Date(rec.expiresAt).getTime() - now <= 0);

  if (!expired.length) return guildData;

  for (const [channelId] of expired) {
    await removeExpiredSlowmode(client, { guildId, channelId });
  }

  return client.db.findOne({ guildId });
}

async function restoreSlowmodes(client) {
  for (const guild of client.guilds.cache.values()) {
    const guildData = await client.db.findOne({ guildId: guild.id });
    if (!guildData || !guildData.moderation || !guildData.moderation.slowmode) continue;

    const entries = guildData.moderation.slowmode;
    for (const channelId of Object.keys(entries)) {
      const rec = entries[channelId];
      if (!rec || !rec.expiresAt) continue;
      scheduleSlowmodeClear(client, normalizeRecord({ guildId: guild.id, channelId, ...rec }, guild.id));
    }
  }
}

function startSlowmodeExpirationChecker(client) {
  const INTERVAL_MS = 5000;
  setInterval(async () => {
    try {
      for (const guild of client.guilds.cache.values()) {
        await cleanupExpiredSlowmodes(client, guild.id);
      }
    } catch (err) {
      console.error('Error in slowmode expiration checker:', err);
    }
  }, INTERVAL_MS);
}

export async function removeExpiredSlowmode(client, input) {
  const rec = normalizeRecord(input, input.guildId);
  if (!rec.guildId || !rec.channelId) return;

  const key = getKey(rec);
  if (scheduledSlowmodes.has(key)) {
    clearTimeout(scheduledSlowmodes.get(key));
    scheduledSlowmodes.delete(key);
  }

  try {
    const guild = client.guilds.cache.get(rec.guildId);
    if (!guild) {
      await removeSlowmodeRecord(client, rec.guildId, rec.channelId);
      return;
    }

    const channel = guild.channels.cache.get(rec.channelId) || await guild.channels.fetch(rec.channelId).catch(() => null);
    if (channel && typeof channel.setRateLimitPerUser === 'function') {
      await channel.setRateLimitPerUser(0).catch(() => {});
    }

    await removeSlowmodeRecord(client, rec.guildId, rec.channelId);
  } catch (error) {
    console.error('Error removing expired slowmode:', error);
  }
}

async function removeSlowmodeRecord(client, guildId, channelId) {
  const guildData = await client.db.findOne({ guildId });
  if (!guildData || !guildData.moderation || !guildData.moderation.slowmode) return;

  if (Object.prototype.hasOwnProperty.call(guildData.moderation.slowmode, channelId)) {
    delete guildData.moderation.slowmode[channelId];
    await client.db.updateOne({ guildId }, { $set: guildData }, { upsert: true });
  }
}

export function extendSlowmode(client, guildId, channelId, ms) {
  return (async () => {
    const extraSeconds = Math.ceil(ms / 1000);
    let guildData = await client.db.findOne({ guildId });
    if (!guildData) guildData = { guildId };
    if (!guildData.moderation) guildData.moderation = {};
    if (!guildData.moderation.slowmode) guildData.moderation.slowmode = {};

    if (guildData.moderation.slowmode[channelId]) {
      const rec = guildData.moderation.slowmode[channelId];
      rec.interval = (rec.interval || 0) + extraSeconds;

      try {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
          if (channel && typeof channel.setRateLimitPerUser === 'function') {
            await channel.setRateLimitPerUser(rec.interval).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error setting channel rateLimit when extending stored slowmode:', err);
      }

      await client.db.updateOne({ guildId }, { $set: guildData }, { upsert: true });

      if (rec.expiresAt) scheduleSlowmodeClear(client, { guildId, channelId, interval: rec.interval, expiresAt: rec.expiresAt });
      return rec;
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return null;
      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || typeof channel.rateLimitPerUser !== 'number' || channel.rateLimitPerUser <= 0) return null;

      const newInterval = channel.rateLimitPerUser + extraSeconds;
      try {
        await channel.setRateLimitPerUser(newInterval).catch(() => {});
      } catch (err) {
        console.error('Error setting channel rateLimit when extending inferred slowmode:', err);
      }

      const rec = { interval: newInterval };
      guildData.moderation.slowmode[channelId] = rec;
      await client.db.updateOne({ guildId }, { $set: guildData }, { upsert: true });
      return rec;
    } catch (err) {
      console.error('Error extending inferred slowmode:', err);
      return null;
    }
  })();
}
