import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, GuildPremiumTier } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const getTierName = (tier) => {
    switch (tier) {
        case GuildPremiumTier.Tier1: return 'Level 1';
        case GuildPremiumTier.Tier2: return 'Level 2';
        case GuildPremiumTier.Tier3: return 'Level 3';
        default: return 'No Level';
    }
};

const getBoostPerks = (tier) => {
    switch (tier) {
        case GuildPremiumTier.Tier1:
            return '50 emoji slots • 128kbps audio • Custom invite bg';
        case GuildPremiumTier.Tier2:
            return '100 emoji slots • 256kbps audio • Server banner • 50MB uploads';
        case GuildPremiumTier.Tier3:
            return '250 emoji slots • 384kbps audio • Vanity URL • 100MB uploads';
        default:
            return 'Boost to unlock perks!';
    }
};

const getNextTierInfo = (tier, boostCount) => {
    switch (tier) {
        case GuildPremiumTier.None:
            return `**${2 - boostCount}** more boost(s) to reach Level 1`;
        case GuildPremiumTier.Tier1:
            return `**${7 - boostCount}** more boost(s) to reach Level 2`;
        case GuildPremiumTier.Tier2:
            return `**${14 - boostCount}** more boost(s) to reach Level 3`;
        case GuildPremiumTier.Tier3:
            return '🎉 Maximum level reached!';
        default:
            return '';
    }
};

const getProgressBar = (tier) => {
    const tiers = [
        { level: 0, boosts: 0 },
        { level: 1, boosts: 2 },
        { level: 2, boosts: 7 },
        { level: 3, boosts: 14 }
    ];

    let currentLevel = 0;
    if (tier === GuildPremiumTier.Tier1) currentLevel = 1;
    else if (tier === GuildPremiumTier.Tier2) currentLevel = 2;
    else if (tier === GuildPremiumTier.Tier3) currentLevel = 3;

    const filled = '▰';
    const empty = '▱';
    const bar = Array(3).fill(empty).map((_, i) => i < currentLevel ? filled : empty).join('');

    return bar;
};

export default {
    name: 'boostcount',
    description: 'Shows the server boost count and tier',
    category: 'General',
    aliases: ['bc'],
    async execute(message) {
        const { guild } = message;

        if (!guild) {
            return message.reply({
                content: 'This command can only be used inside a server.',
                allowedMentions: { repliedUser: false }
            });
        }

        const boostCount = guild.premiumSubscriptionCount || 0;
        const tier = guild.premiumTier;
        const tierName = getTierName(tier);
        const perks = getBoostPerks(tier);
        const nextTier = getNextTierInfo(tier, boostCount);
        const progressBar = getProgressBar(tier);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(td =>
                td.setContent(`# ${EMOJIS.star || '⭐'} Server Boost Status`)
            )
            .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(td =>
                td.setContent(
                    `${EMOJIS.trending || '📈'} **Total Boosts:** \`${boostCount}\`\n` +
                    `${EMOJIS.trophy || '🏆'} **Boost Tier:** \`${tierName}\`\n\n` +
                    `**Progress:** ${progressBar} ${tierName}\n` +
                    `> ${nextTier}`
                )
            )
            .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(td =>
                td.setContent(
                    `**Current Perks:**\n` +
                    `> ${perks}`
                )
            );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    }
};
