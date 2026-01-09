import { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
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

		// Leveling XP accrual for every eligible message (non-bot, guild only)
		try {
			await handleMessageXp(discordClient, message);
		} catch (err) {
			console.error('[Leveling] Message XP handling failed:', err);
		}

		// Stats tracking for every eligible message
		try {
			await handleMessageStats(message, discordClient);
		} catch (err) {
			console.error('[Stats] Message stats handling failed:', err);
		}

		const prefix = discordClient.prefix;

		if (!prefix || !message.content.startsWith(prefix)) {
			return;
		}

		const withoutPrefix = message.content.slice(prefix.length).trim();

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
			// Check for Custom Role Alias
			if (discordClient.db) {
				try {
					const guildData = await discordClient.db.findOne({ guildId: message.guildId });
					const customRoles = guildData?.custom_roles;
					
					// Re-construct invokedName as the first argument since args logic above might have shifted stuff?
					// Actually 'invokedName' variable from line 31 is the first token.
					// If user typed ".vip @user", invokedName is "vip".
					
					if (customRoles?.aliases && customRoles.aliases[invokedName]) {
						const roleId = customRoles.aliases[invokedName];
						const role = message.guild.roles.cache.get(roleId);
						
						if (role) {
							// Permission Check
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

							// Target Member Resolution
							let targetMember = message.member;
							const targetInput = args[0]; // 'args' here is the original split array minus invokedName (shifted in line 31)
							if (targetInput) {
								const targetId = targetInput.replace(/\D/g, '');
								if (targetId) {
									try {
										const fetched = await message.guild.members.fetch(targetId);
										if (fetched) targetMember = fetched;
									} catch {}
								}
							}

							// Check hierarchy
							if (role.position >= message.guild.members.me.roles.highest.position) {
								const container = new ContainerBuilder();
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Hierarchy Error**`));
								container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
								container.addTextDisplayComponents(td => td.setContent('I cannot manage this role as it is higher than my highest role.'));
								return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
							}

							// Toggle Role
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
			}
			return;
		}

		const resolvedCommandName = bestMatch.commandName;
		const command = discordClient.prefixCommands.get(resolvedCommandName);

		if (!command) {
			// Check for Custom Role Alias
			if (discordClient.db) {
				try {
					const guildData = await discordClient.db.findOne({ guildId: message.guildId });
					const customRoles = guildData?.custom_roles;
					
					if (customRoles?.aliases && customRoles.aliases[invokedName]) {
						const roleId = customRoles.aliases[invokedName];
						const role = message.guild.roles.cache.get(roleId);
						
						if (role) {
							// Permission Check
							let hasPermission = false;
							if (customRoles.reqRole) {
								// If ReqRole is set: Admin OR ManageGuild OR ReqRole
								hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) ||
											  message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
											  message.member.roles.cache.has(customRoles.reqRole);
							} else {
								// If ReqRole is NOT set: Admin OR ManageGuild OR ManageRoles
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

							// Target Member Resolution
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

							// Check hierarchy
							if (role.position >= message.guild.members.me.roles.highest.position) {
								const container = new ContainerBuilder();
								container.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} **Hierarchy Error**`));
								container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
								container.addTextDisplayComponents(td => td.setContent('I cannot manage this role as it is higher than my highest role.'));
								return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
							}

							// Toggle Role
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
			}
			return;
		}

		try {
			// Database Check: Disabled & Restricted Commands
			if (discordClient.db) {
				try {
					const guildDoc = await discordClient.db.findOne({ guildId: message.guildId }) || {};
					const moderation = guildDoc.moderation || {};

					// 1. Check Disabled Commands (Global or Channel-specific)
					if (moderation.disabledCommands) {
						const cmdName = command.name.toLowerCase();
						const cmdCat = command.category ? command.category.toLowerCase() : null;
						const shouldReply = moderation.disableNotice !== false; // Default true

						// Check specific command disable
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

						// Check category disable (if command has category)
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

					// 2. Check Restricted Commands (Role-based)
					const restricted = moderation.restrictedCommands?.[resolvedCommandName];
					if (Array.isArray(restricted) && restricted.length > 0) {
						const isOwner = message.member.id === message.guild.ownerId;
						const hasAllowedRole = message.member.roles.cache.some(r => restricted.includes(r.id));
						if (!isOwner && !hasAllowedRole) {
							const container = buildNotice(`# ${EMOJIS.error} Restricted`, 'You are not allowed to use this command.');
							return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
						}
					}
				} catch (dbErr) {
					console.error('Failed to check command config:', dbErr);
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
				});
			} catch (replyError) {
				console.error('Failed to send command error message:', replyError);
			}
		}
	});
}
