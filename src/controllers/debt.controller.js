const DebtModel = require('../models/debt.model');
const DeviceModel = require('../models/device.model');
const { sendNotification } = require('../helpers/firebaseAdmin');

const { ERR_DEBT_NOT_FOUND, ERR_FORBIDDEN_FOR_USER, ERR_INVALID_VALUE } = require('../helpers/errors');

const sendNotificationToUser = async (sender, receiver, deadline) => {
	try {
		let displayName = sender.displayName;
		if (!displayName) {
			let emailID = sender.email.split('@')[0];
			emailID = emailID.replace(/[0-9]+/, '');
			const emailComponents = emailID.split(/[._]/);
			let name = emailComponents[0].slice(0, 1).toUpperCase() + emailComponents[0].slice(1).toLowerCase();

			if (emailComponents.length > 1)
				name += ' ' + emailComponents[1].slice(0, 1).toUpperCase() + emailComponents[1].slice(1).toLowerCase();
			displayName = name;
		}

		const date = new Date(deadline);
		const now = new Date();
		const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
		const month = [ 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC' ][
			date.getMonth()
		];
		const year = date.getFullYear();
		let timeline = `${day} - ${month} - ${year}`;
		if (now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()) {
			if (date.getDate() - now.getDate() === 1) timeline = 'tomorow';
		}

		const deviceAssoc = await DeviceModel.findOne({ userEmail: receiver }).exec();
		
		// if the user doesn't have a registrationToken associated return
		if (!deviceAssoc) return;

		const registrationToken = deviceAssoc.registrationToken;
		const notification = {
			title: 'Payment deadline',
			body: `${displayName} wants you to pay until ${timeline}`
		};
		await sendNotification(registrationToken, notification);
	} catch (e) {
		console.log(e);
	}
};

const getDebtsByCriteria = async (req, res) => {
	const startDate = Date.parse(req.query.begin);
	const endDate = Date.parse(req.query.end);

	let criteria = {};
	if (startDate) criteria.$gte = startDate;
	if (endDate) criteria.$lte = endDate;

	// agregate query function to populate the session object, used for filtering
	const agregate = (query) =>
		query.populate({
			path: 'session',
			populate: {
				path: 'products',
				populate: {
					path: 'product'
				}
			},
			match: {
				...(Object.keys(criteria).length > 0 ? { creationDate: criteria } : null)
			}
		});

	try {
		// get the debts that the user owes
		const owedBy = await agregate(
			DebtModel.find({
				owedBy: req.user.email,
				payed: null
			})
		);

		// get the debts that the user is being owed
		const owedTo = await agregate(
			DebtModel.find({
				owedTo: req.user.email,
				payed: null
			})
		);

		const getUserFromSession = (session, email) => {
			const user = session.participants.find((participant) => participant.email === email);
			return user.profile;
		};

		// filter the results where no session object is found (matches no criteria)
		res.status(200).json({
			owedBy: owedBy.filter((debt) => debt.session !== null).map((debt) => {
				const owedTo = getUserFromSession(debt.session, debt.owedTo);
				const owedBy = getUserFromSession(debt.session, debt.owedBy);
				return Object.assign({}, debt.toJSON(), { owedBy, owedTo });
			}),
			owedTo: owedTo.filter((debt) => debt.session !== null).map((debt) => {
				const owedTo = getUserFromSession(debt.session, debt.owedTo);
				const owedBy = getUserFromSession(debt.session, debt.owedBy);
				return Object.assign({}, debt.toJSON(), { owedBy, owedTo });
			})
		});
	} catch (err) {
		console.log(err);
		res.status(500).json(err);
	}
};

const getDebtByID = async (req, res) => {
	const debtID = req.params.debtID;

	try {
		// find debt by ID
		const debt = await DebtModel.findById(debtID).populate('session').exec();
		if (!debt) return res.status(404).json(ERR_DEBT_NOT_FOUND);

		// check if authenticated user has access to specified debt
		if (req.user.email !== debt.owedBy && req.user.email !== debt.owedTo)
			return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

		res.status(200).json(debt);
	} catch (err) {
		return res.status(500).json(err);
	}
};

const patchDebt = async (req, res) => {
	const debtID = req.params.debtID;
	const newDeadline = Date.parse(req.body.deadline);
	const payedDate = Date.parse(req.body.payed);

	try {
		let debt = await DebtModel.findById(debtID).populate('session').exec();
		if (!debt) return res.status(404).json(ERR_DEBT_NOT_FOUND);

		// check if authenticated user is the one being owed
		if (req.user.email !== debt.owedTo) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

		// if new deadline is new from the request body, remove the deadline
		if (req.body.deadline === null) debt.deadline = null;
		// set new deadline
		if (newDeadline) {
			if (newDeadline > Date.now()) {
				debt.deadline = newDeadline;
				await sendNotificationToUser(req.user, debt.owedBy, debt.deadline);
			} else return res.status(400).json(ERR_INVALID_VALUE);
		}
		// set pay date
		if (payedDate) {
			if (payedDate <= Date.now()) debt.payed = payedDate;
			else return res.status(400).json(ERR_INVALID_VALUE);
		}
		await debt.save();
		res.status(200).json(debt);
	} catch (err) {
		console.log(err);
		res.status(500).json(err);
	}
};

module.exports = {
	getDebtsByCriteria,
	getDebtByID,
	patchDebt
};
