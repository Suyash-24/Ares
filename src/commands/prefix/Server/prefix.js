import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'prefix';
const aliases = ['showprefix', 'currentprefix'];
const description = 'Shows the current prefix for this server.';
const usage = 'prefix';
const category = 'Server';

async function execute(message, args, client) {
    const container = new ContainerBuilder();

    try {

        let currentPrefix = client.prefix || '.';
        const guildData = await client.db.findOne({ guildId: message.guildId });

        if (guildData?.prefix) {
            currentPrefix = guildData.prefix;
        }

        const isCustom = guildData?.prefix ? true : false;

        container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.info || '📋'} Server Prefix`));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        let content = `**Current Prefix:** \`${currentPrefix}\`\n`;
        content += `**Type:** ${isCustom ? '🔧 Custom (Server)' : '🌐 Global (Default)'}\n\n`;
        content += `> Use \`${currentPrefix}help\` to see all commands.`;

        container.addTextDisplayComponents(td => td.setContent(content));

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });

    } catch (err) {
        console.error('Prefix Error:', err);
        container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Error**`));
        container.addTextDisplayComponents(td => td.setContent('Failed to get prefix information.'));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }
}

export default { name, aliases, description, usage, execute, category };
