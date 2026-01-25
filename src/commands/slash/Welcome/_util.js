export function buildMessageFromInteraction(interaction, rawContent = '') {
  const guild = interaction.guild;
  const channel = interaction.channel;
  const member = interaction.member;
  const author = interaction.user;
  const client = interaction.client;
  return {
    guild,
    channel,
    member,
    author,
    client,
    guildId: guild?.id,
    content: rawContent,
    reply: async (options) => {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          components: options.components,
          flags: options.flags,
          content: options.content,
          embeds: options.embeds,
          allowedMentions: options.allowedMentions,
          ephemeral: options.ephemeral || false
        }).catch(() => {});
      } else {
        await interaction.editReply({
          components: options.components,
          content: options.content,
          embeds: options.embeds
        }).catch(() => {});
      }
    }
  };
}
