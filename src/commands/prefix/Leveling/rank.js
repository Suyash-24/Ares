import {
	ContainerBuilder,
	SeparatorSpacingSize,
	MessageFlags,
	PermissionFlagsBits
} from 'discord.js';
import { ensureLevelingConfig, getMemberSnapshot, xpToNextLevel, getRankPosition } from '../../../utils/leveling.js';
import { renderRankCard } from '../../../utils/rankCard.js';
import EMOJIS from '../../../utils/emojis.js';

const name = 'rank';
const aliases = ['level', 'profile'];

const requireEnabled = (message, leveling) => {
	if (leveling.enabled) return true;
	const c = new ContainerBuilder();
	c.addTextDisplayComponents(td => td.setContent(`${EMOJIS.error || '❌'} Leveling is disabled here.`));
	message.reply({ components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } }).catch(() => {});
	return false;
};

export const buildProfile = (user, state, config, client) => {
	const needed = xpToNextLevel(state.level, config);
	const { position, total } = getRankPosition(config, user.id);
	const progress = Math.round((state.xp / needed) * 100);

	const container = new ContainerBuilder();
	container.addTextDisplayComponents(td => td.setContent(`## ${user.displayName || user.username}'s Rank Card`));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addSectionComponents(section => {
		section.addTextDisplayComponents(td => td.setContent(
			`**Level:** ${state.level}\n**Server Rank:** #${position || '?'} out of ${total}\n**Experience:** ${state.xp.toLocaleString()}/${needed.toLocaleString()} XP`
		));
		section.setThumbnailAccessory(thumbnail =>
			thumbnail.setURL(user.displayAvatarURL({ size: 128 }))
		);
		return section;
	});
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`**Progress (${progress}%)**\n` +
		`${'█'.repeat(Math.floor(progress / 5))}${'░'.repeat(20 - Math.floor(progress / 5))}`
	));
	container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents(td => td.setContent(
		`${client?.user?.username || 'Bot'} • <t:${Math.floor(Date.now() / 1000)}:R>`
	));

	return container;
};

const getUserFromArgs = async (message, args) => {
	if (!args?.length) return message.member;
	const id = args[0].replace(/\D/g, '');
	if (!id) return message.member;
	try {
		const member = await message.guild.members.fetch(id);
		return member;
	} catch {
		return message.member;
	}
};

async function execute(message, args, client) {
	const leveling = await ensureLevelingConfig(client.db, message.guildId);
	if (!requireEnabled(message, leveling)) return;
	const member = await getUserFromArgs(message, args);
	const state = getMemberSnapshot(leveling, member.id);
	await client.db.updateOne({ guildId: message.guildId }, { $set: { leveling } });

	const nextNeeded = xpToNextLevel(state.level, leveling);
	const { position, total } = getRankPosition(leveling, member.id);
	const buffer = await renderRankCard({ user: member.user, state, leveling, position, nextXp: nextNeeded });

	const container = buildProfile(member.user, state, leveling, client);
	const payload = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } };
	if (buffer) {
		payload.files = [{ attachment: buffer, name: 'rank.png' }];
	}
	await message.reply(payload);
}

const components = [];

export default {
	name,
	category: 'Leveling',
	description: 'View your rank card',
	aliases,
	execute,
	components
};
