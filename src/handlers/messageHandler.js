import { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import EMOJIS from '../utils/emojis.js';
import { handleMessageXp } from '../utils/leveling.js';
import { handleMessageStats } from '../events/statsHandler.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents(textDisplay => textDisplay.setContent(title));
	container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(textDisplay => textDisplay.setContent(description));
	return container;
};

export default function registerMessageHandler(discordClient) {
	discordClient.on(Events.MessageCreate, async (message) => {
		if (!message.guild || message.author.bot) {
			return;
		}

		let guildData = null;
		try {
			guildData = await discordClient.db.findOne({ guildId: message.guildId }) || {};
		} catch (err) {

			guildData = {};
		}

		try {
			await handleMessageXp(discordClient, message);
		} catch (err) {
			console.error('[Leveling] Message XP handling failed:', err);
		}

		try {
			await handleMessageStats(message, discordClient);
		} catch (err) {
			console.error('[Stats] Message stats handling failed:', err);
		}

		let prefix = discordClient.prefix;
		if (guildData?.prefix) {
			prefix = guildData.prefix;
		}

		const mentionOnlyRegex = new RegExp(`^<@!?${discordClient.user.id}>\\s*$`);
		if (mentionOnlyRegex.test(message.content.trim())) {
			try {
				const container = new ContainerBuilder();

				container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.bot || '🤖'} ${discordClient.user.username}`));
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`**Prefix:** ${prefix}`));
				container.addTextDisplayComponents(td => td.setContent(`> Use \`${prefix}help\` to see all commands.`));

				const supportUrl = discordClient.config?.supportServer;
				const websiteUrl = discordClient.config?.website;

				if (supportUrl || websiteUrl) {
					const buttons = [];
					if (supportUrl) {
						buttons.push(
							new ButtonBuilder()
								.setLabel('Support Server')
								.setStyle(ButtonStyle.Link)
								.setURL(supportUrl)
								.setEmoji('💬')
						);
					}
					if (websiteUrl) {
						buttons.push(
							new ButtonBuilder()
								.setLabel('Website')
								.setStyle(ButtonStyle.Link)
								.setURL(websiteUrl)
								.setEmoji('🌐')
						);
					}
					container.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));
				}

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (err) {
				console.error('[MessageHandler] Bot mention response failed:', err);
			}
			return;
		}

		let hasNoPrefix = false;

		const startsWithPrefix = prefix && message.content.startsWith(prefix);
		const startsWithMention = message.content.match(new RegExp(`^<@!?${discordClient.user.id}> `));

		if (!startsWithPrefix && !startsWithMention) {

			const ownerIds = discordClient.ownerIds || discordClient.config?.ownerIds || [];
			if (ownerIds.includes(message.author.id) || discordClient.application?.owner?.id === message.author.id) {
				hasNoPrefix = true;
			}

			if (!hasNoPrefix) {
				try {
					const NOPREFIX_KEY = '_noprefix';
					const LIFETIME = 9999999999999;
					const npData = await discordClient.db.findOne({ guildId: NOPREFIX_KEY });

					if (npData) {
						const now = Date.now();

						if (npData.users && Array.isArray(npData.users)) {
							const userEntry = npData.users.find(u => u.id === message.author.id);
							if (userEntry && (userEntry.expiresAt > now || userEntry.expiresAt >= LIFETIME)) {
								hasNoPrefix = true;
							}
						}

						if (!hasNoPrefix && npData.servers && Array.isArray(npData.servers)) {
							const serverEntry = npData.servers.find(s => s.id === message.guildId);
							if (serverEntry && (serverEntry.expiresAt > now || serverEntry.expiresAt >= LIFETIME)) {
								hasNoPrefix = true;
							}
						}

						if (!hasNoPrefix && npData.roles && Array.isArray(npData.roles)) {
							const guildRoles = npData.roles.filter(r => r.guildId === message.guildId);
							for (const roleGrant of guildRoles) {
								if (roleGrant.expiresAt > now || roleGrant.expiresAt >= LIFETIME) {
									if (message.member?.roles.cache.has(roleGrant.roleId)) {
										hasNoPrefix = true;
										break;
									}
								}
							}
						}
					}
				} catch (err) {
					console.error('[MessageHandler] No-prefix check failed:', err);
				}
			}
		}

		if (!startsWithPrefix && !startsWithMention && !hasNoPrefix) {
			return;
		}

		let withoutPrefix;
		if (startsWithPrefix) {
			withoutPrefix = message.content.slice(prefix.length).trim();
		} else if (startsWithMention) {
			withoutPrefix = message.content.slice(startsWithMention[0].length).trim();
		} else {
			withoutPrefix = message.content.trim();
		}

		if (!withoutPrefix.length) {
			return;
		}

		const args = withoutPrefix.split(/\s+/);
		const invokedName = args.shift().toLowerCase();
		let bestMatch = null;
		let consumedArgs = 0;
		let currentName = invokedName;

		const checkAndSetMatch = (name, consumed) => {
			if (discordClient.prefixCommands.has(name)) {
				bestMatch = { commandName: name, consumed };
				return true;
			}

			if (discordClient.prefixAliases.has(name)) {
				bestMatch = { commandName: discordClient.prefixAliases.get(name), consumed };
				return true;
			}

			return false;
		};

		checkAndSetMatch(currentName, 0);

		for (let i = 0; i < args.length; i += 1) {
			currentName = `${currentName} ${args[i].toLowerCase()}`;
			if (checkAndSetMatch(currentName, i + 1)) {
				consumedArgs = i + 1;
			}
		}

		if (!bestMatch) {

			try {
				const customRoles = guildData?.custom_roles;

				if (customRoles?.aliases && customRoles.aliases[invokedName]) {
					const roleId = customRoles.aliases[invokedName];
					const role = message.guild.roles.cache.get(roleId);

					if (role) {

						let hasPermission = false;
						if (customRoles.reqRole) {
							hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
										  message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
										  message.member.roles.cache.has(customRoles.reqRole);
						} else {
							hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
										  message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
										  message.member.permissions.has(PermissionFlagsBits.ManageRoles);
						}

						if (!hasPermission) {
							const reqRoleName = customRoles.reqRole ? `<@&${customRoles.reqRole}>` : 'Manage Roles';
							const container = new ContainerBuilder();
							container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Permission Denied**`));
							container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
							container.addTextDisplayComponents(td => td.setContent(`You need ${reqRoleName} to use this command.`));
							return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
						}

						let targetMember = message.member;
						const targetInput = args[0];
						if (targetInput) {
							const targetId = targetInput.replace(/\D/g, '');
							if (targetId) {
								try {
									const fetched = await message.guild.members.fetch(targetId);
									if (fetched) targetMember = fetched;
								} catch {}
							}
						}

						if (role.position >= message.guild.members.me.roles.highest.position) {
							const container = new ContainerBuilder();
							container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Hierarchy Error**`));
							container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
							container.addTextDisplayComponents(td => td.setContent('I cannot manage this role as it is higher than my highest role.'));
							return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
						}

						const container = new ContainerBuilder();
						if (targetMember.roles.cache.has(role.id)) {
							await targetMember.roles.remove(role);
							container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Removed **${role.name}** from ${targetMember.user.tag}`));
						} else {
							await targetMember.roles.add(role);
							container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Added **${role.name}** to ${targetMember.user.tag}`));
						}

						return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
					}
				}
			} catch (err) {
				console.error('Custom Role Error:', err);
			}
			return;
		}

		const resolvedCommandName = bestMatch.commandName;
		const command = discordClient.prefixCommands.get(resolvedCommandName);

		if (!command) {

			try {
				const customRoles = guildData?.custom_roles;

					if (customRoles?.aliases && customRoles.aliases[invokedName]) {
						const roleId = customRoles.aliases[invokedName];
						const role = message.guild.roles.cache.get(roleId);

						if (role) {

							let hasPermission = false;
							if (customRoles.reqRole) {

								hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
											  message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
											  message.member.roles.cache.has(customRoles.reqRole);
							} else {

								hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
											  message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
											  message.member.permissions.has(PermissionFlagsBits.ManageRoles);
							}

							if (!hasPermission) {
								const reqRoleName = customRoles.reqRole ? `<@&${customRoles.reqRole}>` : 'Manage Roles';
								const container = new ContainerBuilder();
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Permission Denied**`));
								container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
								container.addTextDisplayComponents(td => td.setContent(`You need ${reqRoleName} to use this command.`));
								return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
							}

							let targetMember = message.member;
							const targetInput = args[0];
							if (targetInput) {
								const targetId = targetInput.replace(/\D/g, '');
								if (targetId) {
									try {
										const fetched = await message.guild.members.fetch(targetId);
										if (fetched) targetMember = fetched;
									} catch {}
								}
							}

							if (role.position >= message.guild.members.me.roles.highest.position) {
								const container = new ContainerBuilder();
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Hierarchy Error**`));
								container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
								container.addTextDisplayComponents(td => td.setContent('I cannot manage this role as it is higher than my highest role.'));
								return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
							}

							const container = new ContainerBuilder();
							if (targetMember.roles.cache.has(role.id)) {
								await targetMember.roles.remove(role);
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Removed **${role.name}** from ${targetMember.user.tag}`));
							} else {
								await targetMember.roles.add(role);
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.success || '✅'} Added **${role.name}** to ${targetMember.user.tag}`));
							}

							return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
						}
					}
			} catch (err) {
				console.error('Custom Role Error:', err);
			}
			return;
		}

		try {

			const moderation = guildData?.moderation || {};

			if (moderation.disabledCommands) {
				const cmdName = command.name.toLowerCase();
				const cmdCat = command.category ? command.category.toLowerCase() : null;
				const shouldReply = moderation.disableNotice !== false;

				const disabledCmd = moderation.disabledCommands[cmdName];
				if (disabledCmd) {
					if (disabledCmd.includes('global') || disabledCmd.includes(message.channel.id)) {
						if (shouldReply) {
							const container = buildNotice(`# ${EMOJIS.error || '❌'} Disabled`, 'This command is disabled in this channel/server.');
							return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
						}
						return;
					}
				}

				if (cmdCat) {
					const disabledCat = moderation.disabledCommands[cmdCat];
					if (disabledCat) {
						if (disabledCat.includes('global') || disabledCat.includes(message.channel.id)) {
							if (shouldReply) {
								const container = buildNotice(`# ${EMOJIS.error || '❌'} Disabled`, `The **${command.category}** module is disabled here.`);
								return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
							}
							return;
						}
					}
				}
			}

			const restricted = moderation.restrictedCommands?.[resolvedCommandName];
			if (Array.isArray(restricted) && restricted.length > 0) {
				const isOwner = message.member.id === message.guild.ownerId;
				const hasAllowedRole = message.member.roles.cache.some(r => restricted.includes(r.id));
				if (!isOwner && !hasAllowedRole) {
					const container = buildNotice(`# ${EMOJIS.error} Restricted`, 'You are not allowed to use this command.');
					return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
				}
			}

			if (command.userPermissions && command.userPermissions.length > 0) {
				const isOwner = message.member.id === message.guild.ownerId;
				const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

				if (!isOwner && !isAdmin) {
					const missingPerms = command.userPermissions.filter(perm => !message.member.permissions.has(perm));

					if (missingPerms.length > 0) {
						const permNames = missingPerms.map(p => {

							const permName = Object.keys(PermissionFlagsBits).find(key => PermissionFlagsBits[key] === p);
							return permName ? permName.replace(/([A-Z])/g, ' $1').trim() : 'Unknown';
						}).join(', ');

						const container = buildNotice(`# ${EMOJIS.error || '❌'} Permission Denied`, `You need **${permNames}** permission to use this command.`);
						return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
					}
				}
			}

			const commandArgs = args.slice(consumedArgs);
			await command.execute(message, commandArgs, discordClient);
		} catch (error) {
			console.error(`Error executing prefix command ${resolvedCommandName}:`, error);

			try {
				await message.reply({
					content: 'Something went wrong while executing that command.',
					allowedMentions: { repliedUser: false }
				}).catch(() => {});
			} catch (replyError) {

			}
		}
	});
}
