

export function formatDetainMessage(messageTemplate, variables = {}) {
	let message = messageTemplate;

	Object.entries(variables).forEach(([key, value]) => {
		const regex = new RegExp(`\\{${key}\\}`, 'g');
		message = message.replace(regex, String(value || ''));
	});

	message = message.replace(/\\n/g, '\n');

	return message;
}

export function getDetainMessages(guildData) {
	const defaultMessages = {
		detain: 'You have been detained for {duration}. Reason: {reason}',
		release: 'You have been released from detention.',
		response: '{user} has been detained for {duration}. Reason: {reason}'
	};

	const customMessages = guildData?.moderation?.detainMessages || {};

	return {
		detain: customMessages.detain || defaultMessages.detain,
		release: customMessages.release || defaultMessages.release,
		response: customMessages.response || defaultMessages.response
	};
}
