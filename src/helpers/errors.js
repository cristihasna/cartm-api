exports.ERR_SESSION_EXISTS = {
	name: 'SessionError',
	message: 'An open session already exists for specified user'
};
exports.ERR_SESSION_NOT_FOUND = {
	name: 'SessionError',
	message: 'No session exists for specified user'
};
exports.ERR_PAYMENT_INVALID = {
	name: 'SessionError',
	message: 'Invalid payment. The amount payed must be equal to the total cost'
};
exports.ERR_IDTOKEN = {
	name: 'AuthorizationError',
	message: 'Could not verify IDToken or IDToken invalid'
};
exports.ERR_FORBIDDEN_FOR_USER = {
	name: 'AuthorizationError',
	message: 'Forbidden for current authenticated user'
};
exports.ERR_USER_NOT_FOUND = {
	name: 'AuthorizationError',
	message: 'Specified user not found, or could not be selecteed'
};
exports.ERR_INVALID_VALUE = {
	name: 'ValueError',
	message: 'Invalid value'
};
exports.ERR_PRODUCT_NOT_FOUND = {
	name: 'ValueError',
	message: 'Specified product not found'
};
exports.ERR_PARTICIPANT_EXISTS = {
	name: 'ValueError',
	message: 'Specified participant already exists'
};
exports.ERR_DEBT_NOT_FOUND = {
	name: 'ValueError',
	message: 'No debt found for specified ID'
};
