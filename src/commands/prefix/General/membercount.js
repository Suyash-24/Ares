import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const COMPONENT_IDS = {
    refresh: 'prefix:membercount:refresh'
};

const buildMemberCountComponents = async (guild, state = 'active') => {

    try {
        await guild.members.fetch();
    } catch (error) {

    }

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(member => !member.user.bot).size;
    const bots = guild.members.cache.filter(member => member.user.bot).size;

    const humanPercent = totalMembers > 0 ? ((humans / totalMembers) * 100).toFixed(1) : 0;
    const botPercent = totalMembers > 0 ? ((bots / totalMembers) * 100).toFixed(1) : 0;

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.members || '👥'} Member Statistics`)
        )
        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(td =>
            td.setContent(
                `${EMOJIS.users || '👤'} **Total Members:** \`${totalMembers.toLocaleString()}\`\n\n` +
                `${EMOJIS.members || '👥'} **Humans:** \`${humans.toLocaleString()}\` *(${humanPercent}%)*\n` +
                `${EMOJIS.bot || '🤖'} **Bots:** \`${bots.toLocaleString()}\` *(${botPercent}%)*`
            )
        )
        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(actionRow =>
            actionRow.setComponents(
                new ButtonBuilder()
                    .setCustomId(COMPONENT_IDS.refresh)
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(EMOJIS.refresh || '🔄')
                    .setDisabled(state !== 'active')
            )
        );

    return [container];
};

export default {
    name: 'membercount',
    description: 'Shows the total member count of the server',
    category: 'General',
    aliases: ['mc'],
    async execute(message) {
        const { guild } = message;

        if (!guild) {
            return message.reply({
                content: 'This command can only be used inside a server.',
                allowedMentions: { repliedUser: false }
            });
        }

        const components = await buildMemberCountComponents(guild);
        await message.reply({
            components,
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { repliedUser: false }
        });
    },
    components: [
        {
            customId: COMPONENT_IDS.refresh,
            async execute(interaction) {
                try {

                    await interaction.deferUpdate();

                    const components = await buildMemberCountComponents(interaction.guild);
                    await interaction.editReply({
                        components,
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    console.error('[MemberCount] Refresh button error:', error);
                }
            }
        }
    ]
};
