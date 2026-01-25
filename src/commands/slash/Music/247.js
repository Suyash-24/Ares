import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import { Queue } from '../../../utils/Queue.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('247')
		.setDescription('Toggle 24/7 mode - bot stays in voice channel indefinitely'),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const userChannel = interaction.member.voice.channel;
		let queue = client.queue.get(interaction.guildId);

		if (!queue || !queue.player) {
			if (!interaction.guild.members.me?.permissions.has('Connect')) {
				return interaction.reply({
					content: '❌ I don\'t have permission to connect to your voice channel.',
					ephemeral: true
				});
			}

			try {
				queue = new Queue({
					client,
					guild: interaction.guild,
					voiceChannel: userChannel,
					messageChannel: interaction.channel
				});

				await queue.connect();
				client.queue.set(interaction.guildId, queue);
			} catch (error) {
				console.error('Error connecting to voice channel:', error);
				return interaction.reply({
					content: '❌ Failed to connect to your voice channel.',
					ephemeral: true
				});
			}
		} else if (interaction.member.voice.channelId !== queue.voiceChannel.id) {
			return interaction.reply({
				content: '❌ You must be in the same voice channel as me.',
				ephemeral: true
			});
		}

		try {
			queue.is247 = !queue.is247;

			const container = new ContainerBuilder();
			const status = queue.is247 ? 'Enabled' : 'Disabled';
			const emoji = queue.is247 ? EMOJIS.success : EMOJIS.error;
			const description = queue.is247
				? 'Bot will stay in voice channel indefinitely.\nMusic will stop, but bot won\'t leave.'
				: 'Bot will not stay in voice channel for 24/7.';

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${emoji} 24/7 Mode ${status}`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(description)
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in 247 command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while toggling 24/7 mode.')
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}
	}
};
