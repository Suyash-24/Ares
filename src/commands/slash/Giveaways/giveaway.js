import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import prefix from '../../prefix/Giveaways/giveaway.js';

function buildMessageFromInteraction(interaction) {
	const guild = interaction.guild;
	const channel = interaction.channel;
	const member = interaction.member;
	const author = interaction.user;
	const client = interaction.client;

	const mentions = {
		channels: new Map(),
		roles: new Map(),
		users: new Map()
	};

	const targetChannel = interaction.options.getChannel('channel');
	if (targetChannel) {
		mentions.channels.set(targetChannel.id, targetChannel);
	}

	const reqRole = interaction.options.getRole('requiredrole');
	const prizeRole = interaction.options.getRole('prizerole');
	if (reqRole) mentions.roles.set(reqRole.id, reqRole);
	if (prizeRole) mentions.roles.set(prizeRole.id, prizeRole);

	const host = interaction.options.getUser('host');
	if (host) mentions.users.set(host.id, host);

	return {
		guild,
		channel,
		member,
		author,
		client,
		guildId: guild?.id,
		mentions: {
			channels: { first: () => targetChannel },
			roles: {
				first: () => null,
				map: (fn) => {
					const roles = [];
					if (reqRole) roles.push(reqRole);
					if (prizeRole) roles.push(prizeRole);
					return roles.map(fn);
				}
			},
			users: { first: () => host }
		},
		reply: async (options) => {
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					components: options.components,
					flags: options.flags,
					content: options.content,
					allowedMentions: options.allowedMentions,
					ephemeral: options.ephemeral || false
				}).catch(() => {});
			} else {
				await interaction.editReply({
					components: options.components,
					content: options.content
				}).catch(() => {});
			}
		}
	};
}

export default {
	data: new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Create and manage giveaways')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand(sub => sub
			.setName('start')
			.setDescription('Start a new giveaway')
			.addChannelOption(opt => opt
				.setName('channel')
				.setDescription('Channel to host the giveaway')
				.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
				.setRequired(true))
			.addStringOption(opt => opt
				.setName('duration')
				.setDescription('Duration (e.g., 1d, 2h30m, 1d12h)')
				.setRequired(true))
			.addIntegerOption(opt => opt
				.setName('winners')
				.setDescription('Number of winners (1-50)')
				.setMinValue(1)
				.setMaxValue(50)
				.setRequired(true))
			.addStringOption(opt => opt
				.setName('prize')
				.setDescription('The prize to give away')
				.setRequired(true))
			.addStringOption(opt => opt
				.setName('description')
				.setDescription('Description for the giveaway')
				.setRequired(false))
			.addStringOption(opt => opt
				.setName('color')
				.setDescription('Accent color (hex, e.g., #8A5FFF)')
				.setRequired(false))
			.addStringOption(opt => opt
				.setName('image')
				.setDescription('Image URL for the giveaway')
				.setRequired(false))
			.addStringOption(opt => opt
				.setName('thumbnail')
				.setDescription('Thumbnail URL for the giveaway')
				.setRequired(false))
			.addRoleOption(opt => opt
				.setName('requiredrole')
				.setDescription('Role required to enter')
				.setRequired(false))
			.addRoleOption(opt => opt
				.setName('prizerole')
				.setDescription('Role given to winners')
				.setRequired(false))
			.addIntegerOption(opt => opt
				.setName('minlevel')
				.setDescription('Minimum level to enter')
				.setMinValue(0)
				.setRequired(false))
			.addIntegerOption(opt => opt
				.setName('maxlevel')
				.setDescription('Maximum level to enter')
				.setMinValue(0)
				.setRequired(false))
			.addIntegerOption(opt => opt
				.setName('minage')
				.setDescription('Minimum account age in days')
				.setMinValue(0)
				.setRequired(false))
			.addIntegerOption(opt => opt
				.setName('minstay')
				.setDescription('Minimum server stay in days')
				.setMinValue(0)
				.setRequired(false))
			.addUserOption(opt => opt
				.setName('host')
				.setDescription('Custom host for the giveaway')
				.setRequired(false))
		)
		.addSubcommand(sub => sub
			.setName('end')
			.setDescription('End a giveaway early')
			.addStringOption(opt => opt
				.setName('message_id')
				.setDescription('Message ID or link of the giveaway')
				.setRequired(true))
		)
		.addSubcommand(sub => sub
			.setName('reroll')
			.setDescription('Reroll winners for an ended giveaway')
			.addStringOption(opt => opt
				.setName('message_id')
				.setDescription('Message ID or link of the giveaway')
				.setRequired(true))
			.addIntegerOption(opt => opt
				.setName('winners')
				.setDescription('Number of winners to reroll')
				.setMinValue(1)
				.setMaxValue(50)
				.setRequired(false))
		)
		.addSubcommand(sub => sub
			.setName('cancel')
			.setDescription('Cancel a giveaway')
			.addStringOption(opt => opt
				.setName('message_id')
				.setDescription('Message ID or link of the giveaway')
				.setRequired(true))
		)
		.addSubcommand(sub => sub
			.setName('list')
			.setDescription('List all giveaways in this server')
		),

	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const message = buildMessageFromInteraction(interaction);

		if (subcommand === 'start') {
			const channel = interaction.options.getChannel('channel');
			const duration = interaction.options.getString('duration');
			const winners = interaction.options.getInteger('winners');
			const prize = interaction.options.getString('prize');

			let args = ['start', `<#${channel.id}>`, duration, winners.toString(), prize];

			const description = interaction.options.getString('description');
			const color = interaction.options.getString('color');
			const image = interaction.options.getString('image');
			const thumbnail = interaction.options.getString('thumbnail');
			const reqRole = interaction.options.getRole('requiredrole');
			const prizeRole = interaction.options.getRole('prizerole');
			const minLevel = interaction.options.getInteger('minlevel');
			const maxLevel = interaction.options.getInteger('maxlevel');
			const minAge = interaction.options.getInteger('minage');
			const minStay = interaction.options.getInteger('minstay');
			const host = interaction.options.getUser('host');

			if (description) args.push('--desc', description);
			if (color) args.push('--color', color);
			if (image) args.push('--image', image);
			if (thumbnail) args.push('--thumb', thumbnail);
			if (reqRole) args.push('--reqroles', `<@&${reqRole.id}>`);
			if (prizeRole) args.push('--roles', `<@&${prizeRole.id}>`);
			if (minLevel !== null) args.push('--minlevel', minLevel.toString());
			if (maxLevel !== null) args.push('--maxlevel', maxLevel.toString());
			if (minAge !== null) args.push('--age', minAge.toString());
			if (minStay !== null) args.push('--stay', minStay.toString());
			if (host) args.push('--host', `<@${host.id}>`);

			await prefix.execute(message, args, interaction.client);
		} else if (subcommand === 'end') {
			const messageId = interaction.options.getString('message_id');
			await prefix.execute(message, ['end', messageId], interaction.client);
		} else if (subcommand === 'reroll') {
			const messageId = interaction.options.getString('message_id');
			const winners = interaction.options.getInteger('winners');
			const args = ['reroll', messageId];
			if (winners) args.push(winners.toString());
			await prefix.execute(message, args, interaction.client);
		} else if (subcommand === 'cancel') {
			const messageId = interaction.options.getString('message_id');
			await prefix.execute(message, ['cancel', messageId], interaction.client);
		} else if (subcommand === 'list') {
			await prefix.execute(message, ['list'], interaction.client);
		}
	}
};
