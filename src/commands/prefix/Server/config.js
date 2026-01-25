import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'config',
	description: 'Configure bot settings for your server',
	usage: 'config <set|view> [setting] [value]',
	category: 'Server',

	async execute(message, args, client) {

		const isOwner = message.author.id === message.guild.ownerId;
		const isAdmin = message.member.permissions.has('Administrator');

		if (!isOwner && !isAdmin) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Only the server owner or administrators can use this command.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ⚙️ Config Command`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(`**Usage:** \`${client.prefix}config <set|view> [setting] [value]\`\n\n**Settings:**\n• \`support\` - Support role\n• \`mod\` - Moderator role\n• \`headmod\` - Head Moderator role\n• \`detainrole\` - Detain role\n• \`detainchannel\` - Detain notifications channel\n• \`detainmode\` - Remove roles (true/false) when detaining`)
		);			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const action = args[0].toLowerCase();

		if (action === 'view') {
			try {
				const guildData = await client.db.findOne({ guildId: message.guildId });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ⚙️ Server Configuration`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

			const moderation = guildData?.moderation || {};
			const supportRoles = moderation.supportRoles || [];
			const modRoles = moderation.modRoles || [];
			const headmodRoles = moderation.headmodRoles || [];
			const detainRole = moderation.detainRole;
			const detainChannel = moderation.detainChannel;
			const detainMode = moderation.detainMode !== undefined ? moderation.detainMode : true;

			const formatRoles = (roleIds) => {
				if (!roleIds.length) return 'Not set';
				return roleIds.map(id => {
					const role = message.guild.roles.cache.get(id);
					return role ? role.name : `Unknown (${id})`;
				}).join(', ');
			};

			let config = `**Support Roles:** ${formatRoles(supportRoles)}\n`;
			config += `**Mod Roles:** ${formatRoles(modRoles)}\n`;
			config += `**Head Mod Roles:** ${formatRoles(headmodRoles)}\n`;

			if (detainRole) {
				const role = message.guild.roles.cache.get(detainRole);
				config += `**Detain Role:** ${role ? role.name : `Unknown (${detainRole})`}\n`;
			} else {
				config += `**Detain Role:** Not set\n`;
			}

			if (detainChannel) {
				const channel = message.guild.channels.cache.get(detainChannel);
				config += `**Detain Channel:** ${channel ? channel.toString() : `Unknown (${detainChannel})`}\n`;
			} else {
				config += `**Detain Channel:** Not set\n`;
			}

			config += `**Detain Mode (Remove Roles):** ${detainMode ? 'Enabled ✅' : 'Disabled ❌'}`;				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(config)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error viewing config:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while retrieving configuration.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} else if (action === 'set') {
			if (args.length < 2) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Missing Arguments`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Please specify a setting and a role.\nUsage: \`${client.prefix}config set <support|mod|headmod> <@role or role name>\``)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

		const setting = args[1].toLowerCase();
		const validSettings = ['support', 'mod', 'headmod', 'detainrole', 'detainchannel', 'detainmode'];

		if (!validSettings.includes(setting)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Invalid Setting`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Valid settings: ${validSettings.join(', ')}`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

		if (setting === 'detainchannel') {
			let channel = null;

			if (message.mentions.channels.size > 0) {
				channel = message.mentions.channels.first();
			} else {

				const channelInput = args.slice(2).join(' ').replace(/[#<>]/g, '');
				channel = message.guild.channels.cache.find(ch =>
					ch.id === channelInput || ch.name.toLowerCase() === channelInput.toLowerCase()
				);
			}

			if (!channel) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Channel Not Found`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Could not find the channel: ${args.slice(2).join(' ')}`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			if (!channel.isTextBased()) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Invalid Channel Type`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('The channel must be a text channel, thread, or forum channel.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			try {
				let guildData = await client.db.findOne({ guildId: message.guildId });

				if (!guildData) {
					guildData = {
						guildId: message.guildId,
						moderation: {
							supportRoles: [],
							modRoles: [],
							headmodRoles: [],
							detainChannel: channel.id
						}
					};
				}

				if (!guildData.moderation) {
					guildData.moderation = {
						supportRoles: [],
						modRoles: [],
						headmodRoles: [],
						detainChannel: channel.id
					};
				}

				guildData.moderation.detainChannel = channel.id;
				await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ Configuration Updated`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Set detain channel to ${channel}.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error updating detain channel:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while updating configuration.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

		if (setting === 'detainmode') {
			const modeValue = args[2]?.toLowerCase();

			if (!modeValue || !['true', 'false', 'on', 'off', 'enable', 'disable'].includes(modeValue)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Invalid Value`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`**Usage:** \`${client.prefix}config set detainmode <true|false>\`\n\n• \`true\` - Remove roles when detaining (default)\n• \`false\` - Keep roles when detaining`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			try {
				let guildData = await client.db.findOne({ guildId: message.guildId });

				if (!guildData) {
					guildData = {
						guildId: message.guildId,
						moderation: {
							supportRoles: [],
							modRoles: [],
							headmodRoles: [],
							detainMode: ['true', 'on', 'enable'].includes(modeValue)
						}
					};
				}

				if (!guildData.moderation) {
					guildData.moderation = {
						supportRoles: [],
						modRoles: [],
						headmodRoles: [],
						detainMode: ['true', 'on', 'enable'].includes(modeValue)
					};
				}

				guildData.moderation.detainMode = ['true', 'on', 'enable'].includes(modeValue);
				await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ Configuration Updated`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				const status = guildData.moderation.detainMode ? 'Enabled ✅' : 'Disabled ❌';
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Detain mode (remove roles) has been ${status}`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error updating detain mode:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while updating configuration.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

			if (setting === 'detainrole') {
				let role = null;
				const roleInput = args.slice(2).join(' ');

				if (message.mentions.roles.size > 0) {
					role = message.mentions.roles.first();
				} else {

					role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
				}

				if (!role) {
					const container = new ContainerBuilder();
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ❌ Role Not Found`)
					);
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`Could not find the role: ${roleInput}`)
					);

					return message.reply({
						components: [container],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { repliedUser: false }
					});
				}

				try {
					let guildData = await client.db.findOne({ guildId: message.guildId });

					if (!guildData) {
						guildData = {
							guildId: message.guildId,
							moderation: {
								supportRoles: [],
								modRoles: [],
								headmodRoles: [],
								detainRole: role.id
							}
						};
					}

					if (!guildData.moderation) {
						guildData.moderation = {
							supportRoles: [],
							modRoles: [],
							headmodRoles: [],
							detainRole: role.id
						};
					}

					guildData.moderation.detainRole = role.id;
					await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

					const container = new ContainerBuilder();
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ✅ Configuration Updated`)
					);
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`Set detain role to ${role.name}.`)
					);

					return message.reply({
						components: [container],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { repliedUser: false }
					});
				} catch (error) {
					console.error('Error updating detain role:', error);
					const container = new ContainerBuilder();
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ❌ Error`)
					);
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent('An error occurred while updating configuration.')
					);

					return message.reply({
						components: [container],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { repliedUser: false }
					});
				}
			}

			let role = null;
			const roleInput = args.slice(2).join(' ');

			if (message.mentions.roles.size > 0) {
				role = message.mentions.roles.first();
			} else {

				role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
			}

			if (!role) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Role Not Found`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Could not find the role: ${roleInput}`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			try {
				let guildData = await client.db.findOne({ guildId: message.guildId });

				if (!guildData) {
					guildData = {
						guildId: message.guildId,
						moderation: {
							supportRoles: [],
							modRoles: [],
							headmodRoles: [],
							warnings: []
						}
					};
				}

				if (!guildData.moderation) {
					guildData.moderation = {
						supportRoles: [],
						modRoles: [],
						headmodRoles: [],
						warnings: []
					};
				}

				const fieldMap = {
					support: 'supportRoles',
					mod: 'modRoles',
					headmod: 'headmodRoles'
				};

				const field = fieldMap[setting];
				const roles = guildData.moderation[field] || [];

				if (roles.includes(role.id)) {
					guildData.moderation[field] = roles.filter(id => id !== role.id);
				} else {
					guildData.moderation[field] = [...roles, role.id];
				}

				await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ Configuration Updated`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

				const action = roles.includes(role.id) ? 'Removed' : 'Added';
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${action} ${role.name} as a **${setting}** role.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error updating config:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while updating configuration.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} else {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Action`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Valid actions: \`set\`, \`view\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};
