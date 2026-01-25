import { createCanvas, loadImage } from '@napi-rs/canvas';

const WIDTH = 800;
const HEIGHT = 250;
const AVATAR_SIZE = 170;
const PADDING = 30;

const drawRoundedRect = (ctx, x, y, w, h, r) => {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + w - radius, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
	ctx.lineTo(x + w, y + h - radius);
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
	ctx.lineTo(x + radius, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
};

export async function renderRankCard({
	user,
	state,
	leveling,
	position,
	nextXp,
	bgColor = '#0f172a',
	accent = '#22c55e'
}) {
	try {
		const canvas = createCanvas(WIDTH, HEIGHT);
		const ctx = canvas.getContext('2d');

		const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
		gradient.addColorStop(0, '#0b1220');
		gradient.addColorStop(1, '#111827');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);

		ctx.fillStyle = '#0f172a';
		drawRoundedRect(ctx, PADDING, PADDING, WIDTH - PADDING * 2, HEIGHT - PADDING * 2, 20);
		ctx.fill();

		const avatarUrl = user.displayAvatarURL({ size: 256, extension: 'png' });
		const avatar = await loadImage(avatarUrl);
		const avatarX = PADDING * 2;
		const avatarY = HEIGHT / 2 - AVATAR_SIZE / 2;
		ctx.save();
		ctx.beginPath();
		ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
		ctx.restore();

		ctx.fillStyle = '#fff';
		ctx.font = '32px "Segoe UI", "Arial"';
		ctx.fillText(user.username || 'User', avatarX + AVATAR_SIZE + 24, avatarY + 40);
		ctx.fillStyle = '#9ca3af';
		ctx.font = '20px "Segoe UI", "Arial"';
		ctx.fillText(`#${user.discriminator ?? '0000'}`, avatarX + AVATAR_SIZE + 24, avatarY + 70);

		ctx.fillStyle = '#fff';
		ctx.font = '24px "Segoe UI", "Arial"';
		ctx.fillText(`Rank #${position ?? '-'}`, avatarX + AVATAR_SIZE + 24, avatarY + 105);

		const barX = avatarX + AVATAR_SIZE + 24;
		const barY = avatarY + 170;
		const barWidth = WIDTH - barX - PADDING * 1.5;
		const barHeight = 26;
		const progress = Math.max(0, Math.min(1, state.xp / Math.max(1, nextXp)));

		ctx.fillStyle = '#1f2937';
		drawRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
		ctx.fill();

		ctx.fillStyle = accent;
		drawRoundedRect(ctx, barX, barY, barWidth * progress, barHeight, barHeight / 2);
		ctx.fill();

		ctx.fillStyle = '#fff';
		ctx.font = '20px "Segoe UI", "Arial"';
		ctx.fillText(`Level ${state.level}`, barX, barY - 12);
		ctx.textAlign = 'right';
		ctx.fillText(`${Math.floor(state.xp)}/${nextXp} XP`, barX + barWidth, barY - 12);
		ctx.textAlign = 'left';

		return canvas.toBuffer('image/png');
	} catch (err) {
		console.error('[RankCard] render failed:', err);
		return null;
	}
}
