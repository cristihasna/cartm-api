const DeviceModel = require('../models/device.model');

const { ERR_FORBIDDEN_FOR_USER, ERR_INVALID_VALUE } = require('../helpers/errors');

const updateRegistrationToken = async (req, res) => {
	const userEmail = req.params.userEmail;
	let user = req.user;
	// check if user has access to specified history
	if (userEmail !== user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	const registrationToken = req.body.registrationToken;
	if (!registrationToken) return res.status(400).json(ERR_INVALID_VALUE);
	try {
		let deviceAssoc = await DeviceModel.findOne({ userEmail });
		if (!deviceAssoc) deviceAssoc = await new DeviceModel({ userEmail, registrationToken }).save();
		else deviceAssoc = await deviceAssoc.set('registrationToken', registrationToken).save();
		return res.status(200).json(deviceAssoc);
	} catch (e) {
		res.status(500).json(err);
	}
};

module.exports = {
	updateRegistrationToken
};
