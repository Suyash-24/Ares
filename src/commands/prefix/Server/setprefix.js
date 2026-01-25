import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'setprefix';
const aliases = ['changeprefix', 'newprefix'];
const description = 'Set a custom prefix for this server.';
const usage = 'setprefix <new prefix> | setprefix reset';
const category = 'Server';

async function execute(message, args, client) {
    const container = new ContainerBuilder();

    const isOwner = message.member.id === message.guild.ownerId;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const ownerIds = client.ownerIds || client.config?.ownerIds || [];
    const isBotOwner = ownerIds.includes(message.author.id) || client.application?.owner?.id === message.author.id;

    if (!isOwner && !isAdmin && !isBotOwner) {
        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Permission Denied`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent('You need **Administrator** permission to change the prefix.'));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const newPrefix = args[0];

    if (!newPrefix) {

        let currentPrefix = client.prefix || '.';
        try {
            const guildData = await client.db.findOne({ guildId: message.guildId });
            if (guildData?.prefix) {
                currentPrefix = guildData.prefix;
            }
        } catch (err) {}

        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || '⚙️'} Set Prefix`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let content = `**Current Prefix:** \`${currentPrefix}\`\n\n`;
        content += `**Usage:**\n`;
        content += `- \`${currentPrefix}setprefix <symbol>\` — Set new prefix\n`;
        content += `- \`${currentPrefix}setprefix reset\` — Reset to default`;

        container.addTextDisplayComponents(td => td.setContent(content));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    try {

        if (newPrefix.toLowerCase() === 'reset') {
            await client.db.updateOne(
                { guildId: message.guildId },
                { $unset: { prefix: '' } },
                { upsert: true }
            );

            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Prefix Reset`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(
                `The prefix has been reset to the global default: \`${client.prefix || '.'}\``
            ));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (newPrefix.length > 5) {
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Invalid Prefix`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent('Prefix must be 5 characters or less.'));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        if (newPrefix.includes(' ')) {
            container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error || '❌'} Invalid Prefix`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent('Prefix cannot contain spaces.'));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
        }

        await client.db.updateOne(
            { guildId: message.guildId },
            { $set: { prefix: newPrefix } },
            { upsert: true }
        );

        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.success || '✅'} Prefix Updated`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let content = `**New Prefix:** \`${newPrefix}\`\n\n`;
        content += `> Use \`${newPrefix}help\` to see all commands.\n`;
        content += `> Use \`${newPrefix}setprefix reset\` to revert to default.`;

        container.addTextDisplayComponents(td => td.setContent(content));

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    } catch (err) {
        console.error('SetPrefix Error:', err);
        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Database Error**`));
        container.addTextDisplayComponents(td => td.setContent('Failed to update the prefix. Please try again.'));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
}

export default { name, aliases, description, usage, execute, category };
