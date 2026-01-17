import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags
} from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { ensureStatsConfig } from '../../../utils/statsManager.js';

const name = 'debugstats';
const aliases = ['statstatus', 'checkstats'];

async function execute(message, args, client) {
	if (!message.guild) {
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} This command can only be used in a server.`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	}

	try {
		const container = new ContainerBuilder();
		
		// Get raw guild data
		const guildData = await client.db.findOne({ guildId: message.guildId }) || {};
		const stats = guildData?.stats;
		
		container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.gear || '⚙️'} Stats Debug — ${message.guild.name}`));
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		
		if (!stats) {
			container.addTextDisplayComponents(td => td.setContent('**⚠️ Stats object is null/undefined!**'));
			container.addTextDisplayComponents(td => td.setContent('This means stats tracking has never been initialized for this server.'));
		} else {
			// Stats status
			container.addTextDisplayComponents(td => td.setContent(`### Stats Configuration`));
			container.addTextDisplayComponents(td => td.setContent([
				`**Enabled:** ${stats.enabled ? '✅ Yes' : '❌ No'}`,
				`**Lookback:** ${stats.lookback || 14} days`,
				`**Track Messages:** ${stats.tracking?.messages !== false ? '✅' : '❌'}`,
				`**Track Voice:** ${stats.tracking?.voice !== false ? '✅' : '❌'}`,
				`**Track Joins:** ${stats.tracking?.joins !== false ? '✅' : '❌'}`
			].join('\n')));
			
			container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
			
			// User data summary
			const userCount = Object.keys(stats.users || {}).length;
			const channelCount = Object.keys(stats.channels || {}).length;
			const dailyDays = Object.keys(stats.daily || {}).length;
			
			container.addTextDisplayComponents(td => td.setContent(`### Data Summary`));
			container.addTextDisplayComponents(td => td.setContent([
				`**Users tracked:** ${userCount}`,
				`**Channels tracked:** ${channelCount}`,
				`**Days with daily data:** ${dailyDays}`
			].join('\n')));
			
			// Sample user data (new counter-based format)
			if (userCount > 0) {
				const userIds = Object.keys(stats.users);
				const sampleUserId = userIds[0];
				const sampleUser = stats.users[sampleUserId];
				
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`### Sample User Data`));
				
				// Check format (old array-based vs new counter-based)
				const isOldFormat = Array.isArray(sampleUser?.messages);
				
				if (isOldFormat) {
					container.addTextDisplayComponents(td => td.setContent([
						`**User ID:** ${sampleUserId}`,
						`**Format:** ⚠️ OLD (array-based) - will be migrated`,
						`**Messages stored:** ${sampleUser?.messages?.length || 0} entries`,
						`**Voice sessions:** ${sampleUser?.voice?.length || 0} entries`
					].join('\n')));
				} else {
					container.addTextDisplayComponents(td => td.setContent([
						`**User ID:** ${sampleUserId}`,
						`**Format:** ✅ NEW (counter-based)`,
						`**Messages:** ${sampleUser?.messages || 0}`,
						`**Voice Minutes:** ${sampleUser?.voiceMinutes || 0}`,
						`**Last Active:** ${sampleUser?.lastActive ? new Date(sampleUser.lastActive).toISOString() : 'N/A'}`
					].join('\n')));
				}
			} else {
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`### ⚠️ No Users Found`));
				container.addTextDisplayComponents(td => td.setContent('The stats.users object is empty. Messages will be tracked as activity occurs.'));
			}
			
			// Daily data check
			if (dailyDays > 0) {
				const dailyKeys = Object.keys(stats.daily).sort();
				container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
				container.addTextDisplayComponents(td => td.setContent(`### Daily Data Range`));
				container.addTextDisplayComponents(td => td.setContent([
					`**Earliest day:** ${dailyKeys[0]}`,
					`**Latest day:** ${dailyKeys[dailyKeys.length - 1]}`
				].join('\n')));
				
				// Today's data
				const today = new Date().toISOString().split('T')[0];
				const todayData = stats.daily[today];
				if (todayData) {
					container.addTextDisplayComponents(td => td.setContent([
						`**Today (${today}):** ${todayData.messages || 0} msgs, ${todayData.voice || 0} voice mins`
					].join('\n')));
				} else {
					container.addTextDisplayComponents(td => td.setContent(`**Today's data:** Not found (no activity today yet)`));
				}
			}
		}
		
		// Database type
		const dbManager = await import('../../../utils/DatabaseManager.js');
		const dbType = dbManager.default.getType();
		container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
		container.addTextDisplayComponents(td => td.setContent(`-# Database type: ${dbType} | Stats v2 (counter-based)`));
		
		await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false, parse: [] } });
	} catch (error) {
		console.error('[DebugStats] Error:', error);
		const c = new ContainerBuilder();
		c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Error: ${error.message}`));
		return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
	}
}

export default {
	name,
	category: 'Stats',
	description: 'Debug stats data for this server',
	aliases,
	execute
};
