/**
 * Format detain message with variables
 * @param {string} messageTemplate - Template string with {variable} placeholders
 * @param {Object} variables - Object with variable values
 * @returns {string} Formatted message
 */
export function formatDetainMessage(messageTemplate, variables = {}) {
	let message = messageTemplate;

	// Replace all variables in the format {variableName}
	Object.entries(variables).forEach(([key, value]) => {
		const regex = new RegExp(`\\{${key}\\}`, 'g');
		message = message.replace(regex, String(value || ''));
	});

	// Handle escaped newlines (\n) by converting to actual newlines
	message = message.replace(/\\n/g, '\n');

	return message;
}

/**
 * Get detain messages with defaults
 * @param {Object} guildData - Guild data from database
 * @returns {Object} Messages object with all types
 */
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
