import { Events } from 'discord.js';

export default function registerInteractionHandler(discordClient) {
	discordClient.on(Events.InteractionCreate, async (interaction) => {
		if (interaction.isChatInputCommand()) {
			const command = discordClient.commands.get(interaction.commandName);

			if (!command) {
				await interaction.reply({ content: 'Command not found.', ephemeral: true });
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing /${interaction.commandName}:`, error);

				const errorReply = {
					content: 'Something went wrong while executing this command.',
					ephemeral: true
				};

				if (interaction.deferred || interaction.replied) {
					await interaction.followUp(errorReply);
				} else {
					await interaction.reply(errorReply);
				}
			}

			return;
		}

		if (interaction.isAutocomplete()) {
			const command = discordClient.commands.get(interaction.commandName);

			if (!command?.autocomplete) {
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(`Autocomplete handler failed for /${interaction.commandName}:`, error);
			}

			return;
		}

		if (interaction.isMessageComponent()) {
			let handler = discordClient.components.get(interaction.customId);

			if (!handler) {
				for (const [key, value] of discordClient.components) {
					if (key instanceof RegExp && key.test(interaction.customId)) {
						handler = value;
						break;
					}
				}
			}

			if (!handler) {
				console.log(`[InteractionHandler] No handler found for component: ${interaction.customId}`);
				return;
			}

			try {
				await handler.execute(interaction);
			} catch (error) {
				console.error(`Component handler failed for ${interaction.customId}:`, error);

				if (!interaction.deferred && !interaction.replied) {
					await interaction.reply({ content: 'Component failed. Please try again.', ephemeral: true });
				}
			}
		}
	});
}
