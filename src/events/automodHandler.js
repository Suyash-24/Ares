import { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

const DISCORD_INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/gi;
const ZALGO_REGEX = /[\u0300-\u036f\u0489]/g;
const EVERYONE_HERE_REGEX = /@(everyone|here)/gi;

const COPYPASTAS = [
    'did you just seriously think',
    'navy seal copypasta',
    'gorilla warfare',
    'i am trained in',
    'over 300 confirmed',
    'my dad works at',
    'unregistered hypercam',
    'free robux',
    'free nitro',
    'claim your gift',
    'steam gift',
    'discord nitro for free',
    'you have been gifted',
    'airdrop claim',
    'click here to claim'
];

const PUNISHMENTS = {
    warn: { name: 'Warn' },
    delete: { name: 'Delete' },
    mute: { name: 'Mute' },
    kick: { name: 'Kick' },
    ban: { name: 'Ban' },
    protocol: { name: 'Protocol' }
};

const spamCache = new Map();

const getConfig = async (client, guildId) => {
    const data = await client.db.findOne({ guildId }) || {};
    return data.automod || null;
};

const saveConfig = async (client, guildId, config) => {
    await client.db.updateOne({ guildId }, { $set: { automod: config } }, { upsert: true });
};

const isIgnored = (message, config, moduleName) => {
    const moduleConfig = config.modules?.[moduleName];
    if (!moduleConfig?.enabled) return true;

    if (config.ignore?.channels?.includes(message.channel.id)) return true;
    if (config.ignore?.users?.includes(message.author.id)) return true;
    if (config.ignore?.roles?.some(roleId => message.member?.roles.cache.has(roleId))) return true;

    if (moduleConfig.ignore?.channels?.includes(message.channel.id)) return true;
    if (moduleConfig.ignore?.roles?.some(roleId => message.member?.roles.cache.has(roleId))) return true;

    return false;
};

const checkAntiInvite = (message) => {
    return DISCORD_INVITE_REGEX.test(message.content);
};

const checkAntiLink = (message) => {
    const urls = message.content.match(URL_REGEX);
    if (!urls) return false;
    return urls.some(url => !url.includes('discord.com') && !url.includes('discord.gg'));
};

const checkAntiSpam = (message, config) => {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const window = (config.modules.antispam?.window || 5) * 1000;
    const threshold = config.modules.antispam?.threshold || 5;

    if (!spamCache.has(key)) {
        spamCache.set(key, []);
    }

    const timestamps = spamCache.get(key);
    timestamps.push({ time: now, content: message.content });

    const recentMessages = timestamps.filter(t => now - t.time < window);
    spamCache.set(key, recentMessages);

    if (recentMessages.length >= threshold) {
        return true;
    }

    const duplicates = recentMessages.filter(t => t.content === message.content);
    if (duplicates.length >= 3) {
        return true;
    }

    return false;
};

const checkAntiCaps = (message, config) => {
    const text = message.content.replace(/[^a-zA-Z]/g, '');
    if (text.length < 8) return false;

    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsPercentage = (capsCount / text.length) * 100;
    const threshold = config.modules.anticaps?.threshold || 70;

    return capsPercentage >= threshold;
};

const checkAntiMention = (message, config) => {
    const threshold = config.modules.antimention?.threshold || 5;
    const userMentions = message.mentions.users.size;
    return userMentions >= threshold;
};

const checkAntiEmoji = (message, config) => {
    const threshold = config.modules.antiemoji?.threshold || 10;
    const customEmojis = (message.content.match(/<a?:\w+:\d+>/g) || []).length;
    const unicodeEmojis = (message.content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    return (customEmojis + unicodeEmojis) >= threshold;
};

const checkBadWords = (message, config) => {
    const words = config.modules.badwords?.words || [];
    if (!words.length) return false;

    const content = message.content.toLowerCase();
    return words.some(word => content.includes(word.toLowerCase()));
};

const checkMaxLines = (message, config) => {
    const threshold = config.modules.maxlines?.threshold || 15;
    const lines = message.content.split('\n').length;
    return lines > threshold;
};

const checkAntiEveryone = (message, config) => {
    if (message.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) return false;

    if (EVERYONE_HERE_REGEX.test(message.content)) return true;

    const moduleConfig = config.modules.antieveryone;
    const threshold = moduleConfig?.threshold || 5;
    const usePercent = moduleConfig?.usePercent !== false;
    const serverMembers = message.guild.memberCount;

    const minMembers = usePercent ? Math.ceil(serverMembers * (threshold / 100)) : threshold;

    const mentionedRoles = message.mentions.roles;
    if (mentionedRoles.size > 0) {
        for (const [, role] of mentionedRoles) {
            if (role.members.size >= minMembers) {
                return true;
            }
        }
    }
    return false;
};

const checkAntiRole = async (message, config) => {
    const moduleConfig = config.modules.antirole;
    const threshold = moduleConfig?.threshold || 5;
    const usePercent = moduleConfig?.usePercent !== false;
    const serverMembers = message.guild.memberCount;

    const minMembers = usePercent ? Math.ceil(serverMembers * (threshold / 100)) : threshold;

    const mentionedRoles = message.mentions.roles;
    if (!mentionedRoles.size) return false;

    for (const [, role] of mentionedRoles) {
        if (role.members.size >= minMembers) {
            return true;
        }
    }
    return false;
};

const checkAntiZalgo = (message) => {
    const zalgoChars = message.content.match(ZALGO_REGEX);
    return zalgoChars && zalgoChars.length > 10;
};

const checkAntiNewlines = (message, config) => {
    const threshold = config.modules.antinewlines?.threshold || 5;
    const blankLines = (message.content.match(/\n\s*\n/g) || []).length;
    return blankLines >= threshold;
};

const checkAntiCopypasta = (message) => {
    const content = message.content.toLowerCase();
    return COPYPASTAS.some(pasta => content.includes(pasta));
};

const applyPunishment = async (message, client, config, moduleName, violation) => {
    const moduleConfig = config.modules[moduleName];
    let punishments = moduleConfig?.punishments || (moduleConfig?.punishment ? [moduleConfig.punishment] : ['delete']);
    const moduleStrikes = moduleConfig?.strikes ?? 0;

    if (!Array.isArray(punishments)) {
        punishments = [punishments];
    }

    try {
        const shouldDelete = punishments.some(p => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(p));
        if (shouldDelete && message.deletable) {
            await message.delete().catch(() => {});
        }

        // Only process strikes if strikes system is enabled
        if (moduleStrikes > 0 && config.strikesEnabled !== false) {
            if (!config.strikes) config.strikes = {};
            if (!config.strikes[message.author.id]) {
                config.strikes[message.author.id] = { count: 0, history: [] };
            }

            const expiryHours = config.strikeExpiry || 24;
            const expiryMs = expiryHours * 60 * 60 * 1000;
            const lastStrike = config.strikes[message.author.id].lastStrike || 0;
            if (Date.now() - lastStrike > expiryMs) {
                config.strikes[message.author.id].count = 0;
                config.strikes[message.author.id].history = [];
            }

            config.strikes[message.author.id].count += moduleStrikes;
            config.strikes[message.author.id].lastStrike = Date.now();
            config.strikes[message.author.id].history.push({
                time: Date.now(),
                amount: moduleStrikes,
                reason: `${moduleName}: ${violation}`,
                module: moduleName
            });

            await saveConfig(client, message.guild.id, config);

            const totalStrikes = config.strikes[message.author.id].count;
            const strikeActions = config.strikeActions || { 3: { action: 'mute', duration: '10m' }, 5: { action: 'mute', duration: '1h' }, 7: { action: 'kick' }, 10: { action: 'ban' } };

            for (const [threshold, actionConfig] of Object.entries(strikeActions).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
                if (totalStrikes >= parseInt(threshold)) {
                    await applyStrikeAction(message, actionConfig, totalStrikes);
                    break;
                }
            }
        }

        for (const punishment of punishments) {
            if (punishment === 'warn') {
                continue;
            }

            if (punishment === 'mute') {
                if (message.member?.moderatable) {
                    await message.member.timeout(10 * 60 * 1000, `Automod: ${violation}`).catch(() => {});
                }
            }

            if (punishment === 'kick') {
                if (message.member?.kickable) {
                    await message.member.kick(`Automod: ${violation}`).catch(() => {});
                }
            }

            if (punishment === 'ban') {
                if (message.member?.bannable) {
                    await message.member.ban({ reason: `Automod: ${violation}`, deleteMessageSeconds: 86400 }).catch(() => {});
                }
            }

            if (punishment === 'protocol') {
                if (message.member?.moderatable) {
                    const memberRoles = message.member.roles.cache
                        .filter(r => r.id !== message.guild.id && r.position < message.guild.members.me.roles.highest.position)
                        .map(r => r.id);

                    if (memberRoles.length > 0) {
                        await message.member.roles.remove(memberRoles, `Automod Protocol: ${violation}`).catch(() => {});
                    }

                    await message.member.timeout(28 * 24 * 60 * 60 * 1000, `Automod Protocol: ${violation}`).catch(() => {});

                    if (!config.protocol) config.protocol = [];
                    config.protocol.push({
                        id: message.author.id,
                        roles: memberRoles,
                        reason: violation,
                        time: Date.now(),
                        module: moduleName
                    });
                    await saveConfig(client, message.guild.id, config);
                }
            }
        }

        const strikeInfo = moduleStrikes > 0 ? ` (+${moduleStrikes} strike${moduleStrikes > 1 ? 's' : ''})` : '';
        await logViolation(message, client, config, moduleName, violation, punishments.join(' + ') + strikeInfo);

        // Notify User if enabled
        if (config.notifyUser !== false) {
            try {
                await message.channel.send({
                    content: `<@${message.author.id}> ${violation}`,
                    allowedMentions: { users: [message.author.id] }
                });
            } catch (e) {
                console.error('[Automod] Failed to send warning:', e.message);
            }
        }
    } catch (error) {
        console.error(`[Automod] Error applying punishment:`, error);
    }
};

const applyStrikeAction = async (message, actionConfig, totalStrikes) => {
    try {
        if (actionConfig.action === 'mute') {
            const duration = parseDuration(actionConfig.duration || '10m');
            if (message.member?.moderatable) {
                await message.member.timeout(duration, `Automod: ${totalStrikes} strikes reached`).catch(() => {});
            }
        } else if (actionConfig.action === 'kick') {
            if (message.member?.kickable) {
                await message.member.kick(`Automod: ${totalStrikes} strikes reached`).catch(() => {});
            }
        } else if (actionConfig.action === 'ban') {
            if (message.member?.bannable) {
                await message.member.ban({ reason: `Automod: ${totalStrikes} strikes reached`, deleteMessageSeconds: 86400 }).catch(() => {});
            }
        }
    } catch (error) {
        console.error(`[Automod] Error applying strike action:`, error);
    }
};

const applyEscalatedAction = async (message, action) => {
    try {
        if (action.startsWith('mute:')) {
            const duration = parseDuration(action.split(':')[1]);
            if (message.member?.moderatable) {
                await message.member.timeout(duration, 'Automod: Warning threshold reached').catch(() => {});
            }
        } else if (action === 'kick') {
            if (message.member?.kickable) {
                await message.member.kick('Automod: Warning threshold reached').catch(() => {});
            }
        } else if (action === 'ban') {
            if (message.member?.bannable) {
                await message.member.ban({ reason: 'Automod: Warning threshold reached', deleteMessageSeconds: 86400 }).catch(() => {});
            }
        }
    } catch (error) {
        console.error(`[Automod] Error applying escalated action:`, error);
    }
};

const parseDuration = (str) => {
    const match = str.match(/^(\d+)(m|h|d)$/);
    if (!match) return 10 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 10 * 60 * 1000;
    }
};

const logViolation = async (message, client, config, moduleName, violation, punishment) => {
    if (!config.logChannel) return;

    const channel = message.guild.channels.cache.get(config.logChannel);
    if (!channel) return;

    try {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.security || '🛡️'} Automod Violation`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**User:** ${message.author.tag} (${message.author.id})\n` +
                `**Channel:** <#${message.channel.id}>\n` +
                `**Module:** ${moduleName}\n` +
                `**Violation:** ${violation}\n` +
                `**Action:** ${punishment}\n` +
                `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
        );

        if (message.content && message.content.length < 1000) {
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
            container.addTextDisplayComponents(td =>
                td.setContent(`**Message Content:**\n\`\`\`${message.content.substring(0, 900)}\`\`\``)
            );
        }

        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
        console.error(`[Automod] Error logging violation:`, error);
    }
};

const callPerspective = async (text) => {
    const apiKey = process.env.PERSPECTIVE_API_KEY;
    if (!apiKey) throw new Error('No Key');

    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
    const body = {
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
            TOXICITY: {}, SEVERE_TOXICITY: {}, IDENTITY_ATTACK: {},
            THREAT: {}, PROFANITY: {}, SEXUALLY_EXPLICIT: {}, FLIRTATION: {}
        }
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Perspective API Error: ${response.status}`);
    const data = await response.json();
    const scores = data.attributeScores;
    if (!scores) throw new Error('No Scores');

    const getScore = (attr) => scores[attr]?.summaryScore?.value || 0;

    // Check scores
    if (getScore('SEVERE_TOXICITY') > 0.85) return { isToxic: true, reason: 'Severe Toxicity' };
    if (getScore('IDENTITY_ATTACK') > 0.85) return { isToxic: true, reason: 'Hate Speech' };
    if (getScore('THREAT') > 0.85) return { isToxic: true, reason: 'Threat' };
    if (getScore('PROFANITY') > 0.90) return { isToxic: true, reason: 'Profanity' };
    if (getScore('SEXUALLY_EXPLICIT') > 0.85) return { isToxic: true, reason: 'Sexual Content' };
    if (getScore('FLIRTATION') > 0.85) return { isToxic: true, reason: 'Sexual Harassment' };

    return { isToxic: false };
};

const callGemini = async (text) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No Key');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: `Analyze the following message for severe toxicity, hate speech, threats, sexual harassment, or scams. Answer strictly with JSON: {"unsafe": boolean, "reason": "category"}. Message: "${text}"` }] }]
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('No Result');

    const cleanJson = resultText.replace(/```json|```/g, '').trim();
    try {
        const result = JSON.parse(cleanJson);
        return { isToxic: result.unsafe, reason: result.reason || 'AI Detection' };
    } catch {
        return { isToxic: false };
    }
};

const callOpenAI = async (text) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('No Key');

    const url = `https://api.openai.com/v1/chat/completions`;
    const body = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a content moderator. Analyze the message for severe toxicity, hate speech, threats, sexual harassment, or scam. Return JSON: {\"unsafe\": boolean, \"reason\": \"category\"}." },
            { role: "user", content: text }
        ],
        max_tokens: 50
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    try {
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        return { isToxic: result.unsafe, reason: result.reason || 'AI Detection' };
    } catch {
        return { isToxic: false };
    }
};

const callBytez = async (text) => {
    const apiKey = process.env.BYTEZ_API_KEY;
    if (!apiKey) throw new Error('No Key');

    const url = `https://api.bytez.com/v1/chat/completions`;
    const body = {
        model: "openai/gpt-oss-20b",
        messages: [
            { role: "system", content: "You are a content moderator. Analyze the message for severe toxicity, hate speech, threats, sexual harassment, or scam. Answer strictly with JSON: {\"unsafe\": boolean, \"reason\": \"category\"}." },
            { role: "user", content: text }
        ],
        max_tokens: 50
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Bytez API Error: ${response.status}`);

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    try {
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        return { isToxic: result.unsafe, reason: result.reason || 'AI Detection' };
    } catch {
        return { isToxic: false };
    }
};

const analyzeTextWithFallback = async (text) => {

    try {
        return await callPerspective(text);
    } catch (e) {

    }

    try {
        return await callGemini(text);
    } catch (e) {

    }

    try {
        return await callOpenAI(text);
    } catch (e) {

    }

    try {
        return await callBytez(text);
    } catch (e) {

    }

    return { isToxic: false };
};

const checkAI = async (message, config) => {
    if (!config.modules.antiai?.enabled) return false;
    if (!message.content || message.content.length < 4) return false;

    const result = await analyzeTextWithFallback(message.content);
    return result.isToxic;
};

const checkNicknameAI = async (member, config) => {
    if (!config.modules.antiai?.enabled) return;
    const nickname = member.displayName;
    if (!nickname || nickname.length < 3) return;

    const result = await analyzeTextWithFallback(nickname);

    if (result.isToxic) {
        const oldName = member.displayName;
        const newName = `Moderated User ${Math.floor(Math.random() * 10000)}`;

        if (member.manageable) {
            await member.setNickname(newName, `Automod: AI detected ${result.reason}`).catch(() => {});

            try {
                const dmChannel = await member.createDM();
                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.security} **Nickname Moderated**`));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(
                    `Your nickname in **${member.guild.name}** was flagged by our AI systems as inappropriate (${result.reason}).\n` +
                    `It has been automatically changed to: \`${newName}\`.\n\n` +
                    `*Please choose a respectful nickname next time.*`
                ));
                await dmChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch (e) {}

            if (config.logChannel) {
                const channel = member.guild.channels.cache.get(config.logChannel);
                if (channel) {
                    const container = new ContainerBuilder();
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.security || '🛡️'} Automod Violation (Nickname)`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td => td.setContent(
                        `**User:** ${member.user.tag} (${member.id})\n` +
                        `**Old Name:** \`${oldName}\`\n` +
                        `**New Name:** \`${newName}\`\n` +
                        `**Reason:** AI Detected ${result.reason}\n` +
                        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ));
                    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                }
            }
        }
    }
};

const MODULE_CHECKS = {
    antiinvite: { check: checkAntiInvite, violation: 'Discord invite links are not allowed here.' },
    antilink: { check: checkAntiLink, violation: 'Links are not allowed in this channel.' },
    antispam: { check: checkAntiSpam, violation: 'Please slow down! No spamming.' },
    anticaps: { check: checkAntiCaps, violation: 'Please avoid using excessive CAPS.' },
    antimention: { check: checkAntiMention, violation: 'Too many mentions in one message.' },
    antiemoji: { check: checkAntiEmoji, violation: 'Too many emojis in one message.' },
    badwords: { check: checkBadWords, violation: 'Your message contained a banned word.' },
    maxlines: { check: checkMaxLines, violation: 'Your message was too long.' },
    antieveryone: { check: checkAntiEveryone, violation: 'You cannot use @everyone or @here.' },
    antirole: { check: checkAntiRole, violation: 'You cannot mass ping roles.' },
    antizalgo: { check: checkAntiZalgo, violation: 'Zalgo/glitchy text is not allowed.' },
    antinewlines: { check: checkAntiNewlines, violation: 'Too many blank lines in your message.' },
    anticopypasta: { check: checkAntiCopypasta, violation: 'Spam content is not allowed.' },
    antiai: { check: checkAI, violation: 'Your message was flagged as inappropriate.' }
};

export default function registerAutomodHandler(client) {
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || message.author.bot) return;
        if (!message.member) return;

        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        const config = await getConfig(client, message.guild.id);
        if (!config?.enabled) return;

        for (const [moduleName, { check, violation }] of Object.entries(MODULE_CHECKS)) {
            if (isIgnored(message, config, moduleName)) continue;

            try {
                const triggered = await check(message, config);
                if (triggered) {
                    await applyPunishment(message, client, config, moduleName, violation);
                    break;
                }
            } catch (error) {
                console.error(`[Automod] Error in ${moduleName} check:`, error);
            }
        }
    });

    const handleNicknameCheck = async (member) => {
         if (member.user.bot) return;

         if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

         const config = await getConfig(client, member.guild.id);
         if (!config || !config.enabled) return;

         await checkNicknameAI(member, config);
    };

    client.on(Events.GuildMemberAdd, handleNicknameCheck);
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (oldMember.displayName !== newMember.displayName) {
            await handleNicknameCheck(newMember);
        }
    });

    setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of spamCache.entries()) {
            const filtered = timestamps.filter(t => now - t.time < 60000);
            if (filtered.length === 0) {
                spamCache.delete(key);
            } else {
                spamCache.set(key, filtered);
            }
        }
    }, 60000);
}
