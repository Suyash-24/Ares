import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig, formatNumber, formatVoiceTime } from '../../../utils/statsManager.js';

const name = 'resetvoice';
const aliases = ['clearvoice', 'resetvc'];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	// Check permissions
	if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} You need **Administrator** permission to use this command.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	const container = new ContainerBuilder();
	const botName = client.user.username;

	// Target user or server-wide
	const targetUser = message.mentions.users.first();
	
	try {
		const stats = await ensureStatsConfig(client.db, message.guildId);
		
		if (targetUser) {
			// Reset for specific user
			if (stats.users[targetUser.id] && stats.users[targetUser.id].voice?.length > 0) {
				const oldMinutes = stats.users[targetUser.id].voice.reduce((sum, v) => sum + (v.mins || 0), 0);
				stats.users[targetUser.id].voice = [];  // Clear the voice array
				await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });
				
				container.addTextDisplayComponents(td => td.setContent(
					`# ${EMOJIS.check || '✅'} Voice Stats Reset\n\n` +
					`Reset voice time for <@${targetUser.id}>.\n` +
					`Cleared **${formatVoiceTime(oldMinutes)}** of voice time.`
				));
			} else {
				container.addTextDisplayComponents(td => td.setContent(
					`${EMOJIS.error || '❌'} No voice data found for **${targetUser.username}**.`
				));
			}
		} else {
			// Reset all voice for server
			let totalMinutes = 0;
			for (const userId of Object.keys(stats.users || {})) {
				if (stats.users[userId].voice?.length > 0) {
					totalMinutes += stats.users[userId].voice.reduce((sum, v) => sum + (v.mins || 0), 0);
					stats.users[userId].voice = [];  // Clear voice array
				}
			}
			
			// Clear daily voice counts
			for (const day of Object.keys(stats.daily || {})) {
				if (stats.daily[day].voice) {
					stats.daily[day].voice = 0;
				}
			}
			
			// Clear channel voice stats
			for (const chId of Object.keys(stats.channels || {})) {
				if (stats.channels[chId].voice?.length > 0) {
					stats.channels[chId].voice = [];
				}
			}
			
			await client.db.updateOne({ guildId: message.guildId }, { $set: { stats } });
			
			container.addTextDisplayComponents(td => td.setContent(
				`# ${EMOJIS.check || '✅'} All Voice Stats Reset\n\n` +
				`Reset all voice statistics for **${message.guild.name}**.\n` +
				`Cleared **${formatVoiceTime(totalMinutes)}** of voice time.`
			));
		}
	} catch (error) {
		console.error('[ResetVoice] Error:', error);
		container.addTextDisplayComponents(td => td.setContent(
			`${EMOJIS.error || '❌'} An error occurred while resetting voice data.`
		));
	}

	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(`${botName} • Admin command`));

	await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
}

export default {
	name,
	aliases,
	execute
};
