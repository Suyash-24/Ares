import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize, ChannelType } from 'discord.js';
import { Queue } from '../../../utils/Queue.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Join a voice channel')
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('Voice channel to join (defaults to your channel)')
				.setRequired(false)
				.addChannelTypes(ChannelType.GuildVoice)
		),

	async execute(interaction, client) {
		let targetChannel;

		const channelOption = interaction.options.getChannel('channel');

		if (!channelOption) {
			if (!interaction.member?.voice.channel) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ No Channel Specified`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('You must be in a voice channel or specify one.')
				);

				return interaction.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					ephemeral: true
				});
			}
			targetChannel = interaction.member.voice.channel;
		} else {
			targetChannel = channelOption;
		}

		if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Channel`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('The specified channel is not a voice channel.')
			);

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		if (!interaction.guild.members.me?.permissions.has('Connect')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to connect to voice channels.')
			);

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		if (!interaction.guild.members.me?.permissionsIn(targetChannel).has('Connect')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ No Access`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`I don't have permission to connect to **${targetChannel.name}**.`)
			);

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		try {
			let queue = client.queue.get(interaction.guildId);

			if (queue && queue.player) {
				queue.disconnect();
				client.queue.delete(interaction.guildId);
			}

			queue = new Queue({
				client,
				guild: interaction.guild,
				voiceChannel: targetChannel,
				messageChannel: interaction.channel
			});

			await queue.connect();
			client.queue.set(interaction.guildId, queue);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.play} Connected`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Joined **${targetChannel.name}**.`)
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in join command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Failed to join the voice channel.')
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}
	}
};
