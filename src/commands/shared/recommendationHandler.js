
import { recommendationCache, expiredRecommendations } from '../../utils/shoukakuManager.js';
import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../utils/emojis.js';

export default {
	customId: /^recommend_/,
	async execute(interaction) {

		await interaction.deferReply({ ephemeral: false }).catch(() => {});

		const guildId = interaction.guildId;
		const client = interaction.client;
		const queue = client.queue?.get(guildId);

		if (!queue) {
			await interaction.editReply({
				content: '❌ No active queue in this server.'
			});
			return;
		}

		if (interaction.message && queue.nowPlayingMessageId && interaction.message.id !== queue.nowPlayingMessageId) {
			await disableInteractionMessage(interaction).catch(() => {});
			await interaction.editReply({
				content: '⛔ This recommendation panel is no longer active. Please use the current Now Playing message.',
				ephemeral: false
			});
			return;
		}

		const recommendations = recommendationCache.get(interaction.customId);

		if (expiredRecommendations.has(interaction.customId)) {
			await interaction.editReply({
				content: '❌ Recommendations have expired. Please play a new song to get fresh recommendations.'
			});
			return;
		}

		if (!recommendations) {
			await interaction.editReply({
				content: '❌ Recommendations have expired. Please play a new song.'
			});
			return;
		}

		const selectedIndex = parseInt(interaction.values[0].split('_')[1]);
		const selectedTrack = recommendations[selectedIndex];

		if (!selectedTrack) {
			await interaction.editReply({
				content: '❌ Selected recommendation not found.'
			});
			return;
		}

		const { uri, title, author } = selectedTrack;

		try {

			const node = client.shoukaku?.getIdealNode();
			if (!node) {
				await interaction.editReply({
					content: '❌ No Lavalink nodes available.'
				});
				return;
			}

			let track = null;

			if (uri) {

				const result = await node.rest.resolve(uri);
				if (result?.data?.[0]) {
					track = result.data[0];
				}
			}

			if (!track) {

				const result = await node.rest.resolve(`ytsearch:${title} ${author}`);
				if (!result?.data?.[0]) {
					await interaction.editReply({
						content: `❌ Could not find track: **${title}**`
					});
					return;
				}
				track = result.data[0];
			}

			const userTrack = {
				...track,
				userId: interaction.user.id
			};
			queue.addTrack(userTrack);

			const container = new ContainerBuilder();

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS?.success || '✅'} | Track Added`)
			);

			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			let displayTitle = title.includes('|')
				? title.split('|')[0].trim()
				: title;

			const parenIndex = displayTitle.indexOf('(');
			const bracketIndex = displayTitle.indexOf('[');

			let trimIndex = -1;
			if (parenIndex !== -1 && bracketIndex !== -1) {
				trimIndex = Math.min(parenIndex, bracketIndex);
			} else if (parenIndex !== -1) {
				trimIndex = parenIndex;
			} else if (bracketIndex !== -1) {
				trimIndex = bracketIndex;
			}

			const finalTitle = trimIndex !== -1
				? displayTitle.substring(0, trimIndex).trim()
				: displayTitle;

			const thumbnailUrl = track.info?.artworkUrl ||
				(uri?.includes('youtube.com') || uri?.includes('youtu.be')
					? `https://img.youtube.com/vi/${extractYouTubeId(uri)}/mqdefault.jpg`
					: null);

			container.addSectionComponents((section) => {
				const trackInfo =
					`**${EMOJIS?.ytmusic || '✅'} [${finalTitle}](${uri || 'https://unknown'})**\n` +
					`**via ➜ ${author}**\n\n` +
					`Duration: \`${formatTime(track.info?.length)}\`\n` +
					`Added by recommendation for: ${interaction.user.toString()}`;

				section.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(trackInfo)
				);

				if (thumbnailUrl) {
					section.setThumbnailAccessory((thumbnail) =>
						thumbnail.setURL(thumbnailUrl).setDescription('Track artwork')
					);
				}

				return section;
			});

			await interaction.editReply({
				content: null,
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});

			if (!queue.player?.track && !queue.paused) {
				await queue.play();
			}
		} catch (error) {
			console.error('Recommendation handler error:', error);
			await interaction.editReply({
				content: '❌ Failed to add track to queue.'
			});
		}
	}
};

function formatTime(ms) {
	if (!ms || ms < 0) return '0:00';
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function extractYouTubeId(url) {
	if (!url) return null;
	const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
	return match ? match[1] : null;
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
