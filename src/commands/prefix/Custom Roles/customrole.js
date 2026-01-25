import { MessageFlags, ContainerBuilder, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

const RESERVED_SUBCOMMANDS = ['add', 'remove', 'del', 'delete', 'view', 'list', 'reqrole', 'requiredrole', 'perms'];

const getGuildData = async (client, guildId) => {
    return await client.db.findOne({ guildId }) || {};
};

const updateGuildData = async (client, guildId, update) => {
    await client.db.updateOne({ guildId }, update, { upsert: true });
};

const buildSuccess = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

const buildError = (title, description) => {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **${title}**`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(description));
    return container;
};

export default {
    name: 'customrole',
    aliases: ['cr', 'crole'],
    description: 'Manage custom role aliases',
    usage: '.customrole <alias> <role> (Toggle)\n.customrole add <alias> <role>\n.customrole remove <alias>\n.customrole view\n.customrole reqrole <role|off>',
    category: 'Custom Roles',

    async execute(message, args, client) {
        const guildData = await getGuildData(client, message.guildId);
        const customRoles = guildData.custom_roles || { aliases: {}, reqRole: null };

        const subcommand = args[0]?.toLowerCase();
        const isView = (!subcommand && args.length === 0) || subcommand === 'view' || subcommand === 'list';

        const isAdminOrManager = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.Administrator);

        if (isView) {
            let hasViewPerms = isAdminOrManager;
            if (!hasViewPerms) {
                 if (customRoles.reqRole) {
                     hasViewPerms = message.member.roles.cache.has(customRoles.reqRole);
                 } else {
                     hasViewPerms = message.member.permissions.has(PermissionFlagsBits.ManageRoles);
                 }
            }

            if (!hasViewPerms) {
                 const reqRoleName = customRoles.reqRole ? `<@&${customRoles.reqRole}>` : 'Manage Roles';
                 return message.reply({
                    components: [buildError('Permission Denied', `You need ${reqRoleName} (or Admin/Manage Server) to view custom roles.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }
        } else {

            if (!isAdminOrManager) {
                return message.reply({
                    components: [buildError('Permission Denied', 'You need **Manage Server** permission to manage custom roles.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }
        }

        if (isView) {
            const aliases = Object.entries(customRoles.aliases);
            const reqStatus = customRoles.reqRole ? `<@&${customRoles.reqRole}>` : '`None` (Manage Roles)';

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.roles || '🎭'} **Custom Role Configuration**`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

            container.addTextDisplayComponents(td => td.setContent(`**Required Role:** ${reqStatus}`));

            const logicDescription = customRoles.reqRole
                ? '• Users need `Admin` OR `Manage Server` OR `ReqRole` to use aliases \nif you will remove `ReqRole` users with `Manage Roles` perms can use it.'
                : '• Users need `Admin` OR `Manage Server` OR `Manage Roles` to use aliases \nif `ReqRole` is not set.';
            container.addTextDisplayComponents(td => td.setContent(logicDescription));

            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));

            if (aliases.length === 0) {
                 container.addTextDisplayComponents(td => td.setContent('*No custom role aliases configured.*'));
            } else {
                 const list = aliases.map(([alias, roleId]) => `\`${alias}\` → <@&${roleId}>`).join('\n');
                 container.addTextDisplayComponents(td => td.setContent(list));
            }

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        if (subcommand === 'reqrole' || subcommand === 'requiredrole') {
            const input = args[1];

            if (!input) {
                const current = customRoles.reqRole ? `<@&${customRoles.reqRole}>` : '`None`';

                const description = [
                    `**Current ReqRole:** ${current}`,
                    '',
                    '**logic:**',
                    '• **If ReqRole is Set:** Users need (`Admin` OR `Manage Server` OR `ReqRole`) to use aliases.',
                    '• **If ReqRole is NOT Set:** Users need (`Admin` OR `Manage Server` OR `Manage Roles`) to use aliases.',
                    '',
                    'Use `.customrole reqrole <role|off>` to change configuration.'
                ].join('\n');

                return message.reply({
                    components: [buildSuccess('Required Role Configuration', description)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false, parse: [] }
                });
            }

            if (input.toLowerCase() === 'off' || input.toLowerCase() === 'disable' || input.toLowerCase() === 'none') {
                customRoles.reqRole = null;
                await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
                return message.reply({
                    components: [buildSuccess('ReqRole Disabled', 'Users with **Manage Roles** permission can now use custom role commands.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            const role = message.mentions.roles.first() || message.guild.roles.cache.get(input.replace(/\D/g, ''));
            if (!role) {
                return message.reply({
                    components: [buildError('Invalid Role', 'Please mention a valid role or provide a role ID.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            customRoles.reqRole = role.id;
            await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
            return message.reply({
                components: [buildSuccess('ReqRole Set', `Users must have the <@&${role.id}> role (or Admin/Manage Server) to use custom role commands.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        if (subcommand === 'remove' || subcommand === 'del' || subcommand === 'delete') {
            const alias = args[1]?.toLowerCase();
            if (!alias) {
                 return message.reply({
                    components: [buildError('Invalid Usage', 'Usage: `.customrole remove <alias>`')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            if (!customRoles.aliases[alias]) {
                 return message.reply({
                    components: [buildError('Not Found', `The alias \`${alias}\` does not exist.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
            }

            delete customRoles.aliases[alias];
            await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
            return message.reply({
                components: [buildSuccess('Alias Removed', `Removed custom role alias \`${alias}\`.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (subcommand === 'add') {
             const alias = args[1]?.toLowerCase();
             const roleInput = args[2];

             if (!alias || !roleInput) {
                return message.reply({
                    components: [buildError('Invalid Usage', 'Usage: `.customrole add <alias> <role>`')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             if (args.length > 3) {
                 return message.reply({
                    components: [buildError('Invalid Alias', 'Aliases cannot contain spaces. Usage: `.customrole add <alias> <role>`')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             if (RESERVED_SUBCOMMANDS.includes(alias)) {
                return message.reply({
                    components: [buildError('Invalid Alias', `\`${alias}\` is a reserved subcommand name.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             if (customRoles.aliases[alias]) {
                  return message.reply({
                    components: [buildError('Alias Exists', `The alias \`${alias}\` is already in use.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleInput.replace(/\D/g, ''));
             if (!role) {
                return message.reply({
                    components: [buildError('Invalid Role', 'Please mention a valid role or provide a role ID.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             const existingAlias = Object.keys(customRoles.aliases).find(key => customRoles.aliases[key] === role.id);
             if (existingAlias) {
                 return message.reply({
                    components: [buildError('Role Aliased', `That role already has an alias: \`${existingAlias}\`. Only one alias per role is allowed.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             const dangerousPerms = [
                 PermissionFlagsBits.Administrator,
                 PermissionFlagsBits.ManageGuild,
                 PermissionFlagsBits.ManageRoles,
                 PermissionFlagsBits.KickMembers,
                 PermissionFlagsBits.BanMembers,
                 PermissionFlagsBits.ManageChannels,
                 PermissionFlagsBits.ManageWebhooks,
                 PermissionFlagsBits.MentionEveryone
             ];

             const hasDangerous = dangerousPerms.find(perm => role.permissions.has(perm));
             if (hasDangerous) {
                 return message.reply({
                    components: [buildError('Unsafe Role', 'You cannot create aliases for roles with dangerous permissions.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             if (role.position >= message.guild.members.me.roles.highest.position) {
                 return message.reply({
                    components: [buildError('Hierarchy Error', 'I cannot manage that role because it is higher than or equal to my highest role.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             customRoles.aliases[alias] = role.id;
             await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
             return message.reply({
                components: [buildSuccess('Alias Added', `Added alias \`.${alias}\` for role <@&${role.id}>.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }

        const alias = args[0]?.toLowerCase();
        const roleMatch = args[1];

        if (!alias || !roleMatch) {
             return message.reply({
                components: [buildError('Invalid Usage', 'Usage: `.customrole <alias> <role>` (Toggle)')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (args.length > 2) {
             return message.reply({
                components: [buildError('Invalid Alias', 'Aliases cannot contain spaces. Usage: `.customrole <alias> <role>`')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (RESERVED_SUBCOMMANDS.includes(alias)) {
             return message.reply({
                components: [buildError('Invalid Alias', `\`${alias}\` is a reserved subcommand name.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleMatch.replace(/\D/g, ''));
        if (!role) {
            return message.reply({
                components: [buildError('Invalid Role', 'Please mention a valid role or provide a role ID.')],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
            });
        }

        if (customRoles.aliases[alias]) {

             delete customRoles.aliases[alias];
             await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
             return message.reply({
                components: [buildSuccess('Alias Removed', `The alias \`${alias}\` has been removed.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false }
             });
        } else {

             const existingAlias = Object.keys(customRoles.aliases).find(key => customRoles.aliases[key] === role.id);
             if (existingAlias) {
                 return message.reply({
                    components: [buildError('Role Aliased', `That role already has an alias: \`${existingAlias}\`. Only one alias per role is allowed.`)],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             const dangerousPerms = [
                 PermissionFlagsBits.Administrator,
                 PermissionFlagsBits.ManageGuild,
                 PermissionFlagsBits.ManageRoles,
                 PermissionFlagsBits.KickMembers,
                 PermissionFlagsBits.BanMembers,
                 PermissionFlagsBits.ManageChannels,
                 PermissionFlagsBits.ManageWebhooks,
                 PermissionFlagsBits.MentionEveryone
             ];

             const hasDangerous = dangerousPerms.find(perm => role.permissions.has(perm));
             if (hasDangerous) {
                 return message.reply({
                    components: [buildError('Unsafe Role', 'You cannot create aliases for roles with dangerous permissions (e.g. Admin, Manage Server, etc).')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             if (role.position >= message.guild.members.me.roles.highest.position) {
                 return message.reply({
                    components: [buildError('Hierarchy Error', 'I cannot manage that role because it is higher than or equal to my highest role.')],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });
             }

             customRoles.aliases[alias] = role.id;
             await updateGuildData(client, message.guildId, { $set: { custom_roles: customRoles } });
             return message.reply({
                components: [buildSuccess('Alias Added', `Added alias \`.${alias}\` for role <@&${role.id}>.`)],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { repliedUser: false, parse: [] }
            });
        }
    }
};
