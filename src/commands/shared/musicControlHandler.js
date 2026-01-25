import EMOJIS from '../../utils/emojis.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

export default {
	customId: /^music_/,
	async execute(interaction) {
		await interaction.deferUpdate().catch(() => {});

		const action = interaction.customId.replace('music_', '');
		const guildId = interaction.guildId;
		const client = interaction.client;
		const queue = client.queue?.get(guildId);

		if (!queue) {
			await interaction.followUp({
				content: '❌ No active queue in this server.',
				ephemeral: true
			}).catch(() => {});
			return;
		}

		if (!queue.player) {
			await interaction.followUp({
				content: '❌ Player is not active.',
				ephemeral: true
			}).catch(() => {});
			return;
		}

		if (interaction.message && queue.nowPlayingMessageId && interaction.message.id !== queue.nowPlayingMessageId) {
			await disableInteractionMessage(interaction).catch(() => {});
			await interaction.followUp({ content: '⛔ This panel is no longer active.', ephemeral: true }).catch(() => {});
			return;
		}

		try {
			switch (action) {
				case 'previous': {
					if (queue.player?.track) {
						await queue.player.seekTo(0);
						await interaction.followUp({
							content: `${EMOJIS.previous} Restarted current track.`,
							ephemeral: true
						}).catch(() => {});
					} else {
						await interaction.followUp({
							content: '❌ No track currently playing.',
							ephemeral: true
						}).catch(() => {});
					}
					break;
				}

				case 'playpause': {
					if (queue.paused) {
						queue.paused = false;
						await queue.player.setPaused(false);
					} else {
						queue.paused = true;
						await queue.player.setPaused(true);
					}

					await updateControlButtons(interaction, queue).catch(() => {});

					await interaction.followUp({
						content: queue.paused ? `${EMOJIS.pause} Paused playback.` : `${EMOJIS.play} Resumed playback.`,
						ephemeral: true
					}).catch(() => {});
					break;
				}

				case 'next': {
					if (queue.tracks.size === 0) {
						await interaction.followUp({
							content: '❌ No tracks in queue to skip to.',
							ephemeral: true
						}).catch(() => {});
						return;
					}

					await queue.player.stopTrack();
					await interaction.followUp({
						content: `${EMOJIS.next} Skipped to next track.`,
						ephemeral: true
					}).catch(() => {});
					break;
				}

				default:
					await interaction.followUp({
						content: '❌ Unknown music control action.',
						ephemeral: true
					}).catch(() => {});
			}
		} catch (error) {
			console.error('Error in music control handler:', error);
			await interaction.followUp({
				content: '❌ Failed to execute music control.',
				ephemeral: true
			}).catch(() => {});
		}
	}
};

async function updateControlButtons(interaction, queue) {
	const message = interaction.message;
	if (!message) {
		return;
	}

	const buildControlRow = () => new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('music_previous')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(EMOJIS.previous),
		new ButtonBuilder()
			.setCustomId('music_playpause')
			.setStyle(queue.paused ? ButtonStyle.Success : ButtonStyle.Danger)
			.setEmoji(queue.paused ? EMOJIS.play : EMOJIS.pause),
		new ButtonBuilder()
			.setCustomId('music_next')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(EMOJIS.next)
	).toJSON();

	const updatedComponents = message.components?.map((topLevel) => {
		const topJson = topLevel.toJSON ? topLevel.toJSON() : topLevel;

		if (Array.isArray(topJson.components) && topJson.components.some((c) => Array.isArray(c.components))) {
			const newContainer = { ...topJson };
			newContainer.components = topJson.components.map((childRow) => {
				const isMusicRow = childRow.components?.some((comp) => {
					const id = comp.customId ?? comp.custom_id;
					return typeof id === 'string' && id.startsWith('music_');
				});
				if (!isMusicRow) return childRow;
				return buildControlRow();
			});
			return newContainer;
		}

		const isMusicRow = topJson.components?.some((comp) => {
			const id = comp.customId ?? comp.custom_id;
			return typeof id === 'string' && id.startsWith('music_');
		});
		if (!isMusicRow) return topJson;
		return buildControlRow();
	});

	if (updatedComponents) {
		await message.edit({ components: updatedComponents, flags: MessageFlags.IsComponentsV2 });
	}
}

async function disableInteractionMessage(interaction) {
	const message = interaction.message;
	if (!message) return;

	const toJson = (x) => (x?.toJSON ? x.toJSON() : x);
	const isContainer = message.components?.some((top) => {
		const json = toJson(top);
		return Array.isArray(json.components) && json.components.some((c) => Array.isArray(c.components));
	});

	const disableRow = (row) => {
		const json = toJson(row);
		const clone = { ...json };
		if (Array.isArray(clone.components)) {
			clone.components = clone.components.map((comp) => ({ ...comp, disabled: true }));
		}
		return clone;
	};

	const updated = isContainer
		? message.components.map((top) => {
			  const json = toJson(top);
			  const containerClone = { ...json };
			  if (Array.isArray(containerClone.components)) {
				  containerClone.components = containerClone.components.map(disableRow);
			  }
			  return containerClone;
		  })
		: message.components?.map(disableRow);

	if (updated) {
		await message.edit({ components: updated, flags: MessageFlags.IsComponentsV2 });
	}
}
