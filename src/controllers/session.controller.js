const SessionModel = require('../models/session.model');
const DeviceModel = require('../models/device.model');
const DebtModel = require('../models/debt.model');
const admin = require('../helpers/firebaseAdmin');

const {
	ERR_SESSION_EXISTS,
	ERR_SESSION_NOT_FOUND,
	ERR_FORBIDDEN_FOR_USER,
	ERR_USER_NOT_FOUND,
	ERR_INVALID_VALUE,
	ERR_PAYMENT_INVALID
} = require('../helpers/errors');

const findOpenSessionByEmail = (email) => {
	return SessionModel.findOne({ endDate: null, 'participants.email': email })
		.populate({
			path: 'products',
			populate: {
				path: 'product'
			}
		})
		.exec();
};

const getTotalCost = (email, products) => {
	let totalCost = 0;
	for (let product of products) {
		if (product.participants.length > 0 && product.participants.indexOf(email) > -1)
			totalCost += product.unitPrice * product.quantity / product.participants.length;
	}
	return totalCost;
};

const sendNotificationToUser = async (sender, receiver) => {
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
		const deviceAssoc = await DeviceModel.findOne({ userEmail: receiver }).exec();

		// if the user doesn't have a registrationToken associated return
		if (!deviceAssoc) return;

		const registrationToken = deviceAssoc.registrationToken;
		const notification = {
			title: 'New shopping session',
			body: `${displayName} just added you on his shopping session.`
		};
		await admin.sendNotification(registrationToken, notification, { screen: 'session' });
	} catch (e) {
		console.log(e);
	}
};

const computeDebts = (participants) => {
	let totalDebt = 0;
	let owedParticipants = {};
	let indebtedParticipants = {};
	let debts = [];

	// compute totalDebt and the sets of owed and indebted participants
	for (let p of participants) {
		if (p.payed > p.debt) {
			// p has to receive following amount
			owedParticipants[p.email] = p.payed - p.debt;
			totalDebt += p.payed - p.debt;
		} else if (p.payed < p.debt) {
			// p has to pay following amount
			indebtedParticipants[p.email] = p.debt - p.payed;
		}
	}

	// for every indebted participant create a debt to every owed participant
	for (let p in indebtedParticipants) {
		for (let other in owedParticipants) {
			debts.push({
				owedBy: p,
				owedTo: other,
				amount: owedParticipants[other] / totalDebt * indebtedParticipants[p]
			});
		}
	}
	return debts;
};

const getAllSessions = async (req, res) => {
	try {
		const sessions = await SessionModel.find().exec();
		res.status(200).json(sessions);
	} catch (err) {
		res.status(500).json(err);
	}
};

const createSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	let user = req.user;
	if (sessionEmail !== user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	const creationDate = req.body.creationDate || Date.now();
	const participants = [ { email: sessionEmail, payed: 0 } ];

	try {
		// check if not current session exists for user
		const currentSession = await findOpenSessionByEmail(sessionEmail);
		if (currentSession) return res.status(400).json(ERR_SESSION_EXISTS);
		user = {
			displayName: user.displayName,
			photoURL: user.photoURL,
			email: user.email
		};
		participants[0].profile = user;
		const session = new SessionModel({ creationDate, participants });
		const result = await session.save();
		res.status(201).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

const getCurrentSessionForEmail = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	if (req.user.email !== sessionEmail) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	try {
		const session = await findOpenSessionByEmail(sessionEmail);
		if (!session) res.status(404);
		else res.status(200);
		res.json(session);
	} catch (err) {
		res.status(500).json(err);
	}
};

const addUserToSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	const newUser = req.body.email;
	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json(ERR_SESSION_NOT_FOUND);

		// check if other user exists
		let newUserObj = await admin.getUserByEmail(newUser);
		if (!newUserObj) return res.status(404).json(ERR_USER_NOT_FOUND);

		// check if other user already has an open session
		let otherUserSession = await findOpenSessionByEmail(newUser);
		if (otherUserSession) return res.status(400).json(ERR_SESSION_EXISTS);

		// add the new participant
		newUserObj = {
			displayName: newUserObj.displayName,
			photoURL: newUserObj.photoURL,
			email: newUserObj.email
		};
		currentSession.participants.push({ email: newUser, payed: 0, profile: newUserObj });
		const result = await currentSession.save();
		await sendNotificationToUser(req.user, newUserObj.email);
		req.socketManager.notify(
			currentSession.participants.filter((participant) => participant.email !== req.user.email)
		);

		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

const removeUserFromSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const participantEmail = req.params.userEmail;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json(ERR_SESSION_NOT_FOUND);

		// check if specified participant exists
		const indexOfParticipant = currentSession.participants.findIndex((value) => value.email === participantEmail);
		if (indexOfParticipant === -1) return res.status(404).json(ERR_USER_NOT_FOUND);

		currentSession.participants = currentSession.participants
			.slice(0, indexOfParticipant)
			.concat(currentSession.participants.slice(indexOfParticipant + 1));

		// remove participant from every product
		for (let product of currentSession.products) {
			const indexOfParticipant = product.participants.indexOf(participantEmail);
			if (indexOfParticipant > -1) {
				product.participants = product.participants
					.slice(0, indexOfParticipant)
					.concat(product.participants.slice(indexOfParticipant + 1));
			}
			await product.save();
		}

		// recompute each participant debts
		for (let participant of currentSession.participants)
			participant.debt = getTotalCost(participant.email, currentSession.products);

		let result;
		// check if no other participant remains, in which case to remove the session
		if (currentSession.participants.length === 0)
			result = await SessionModel.findByIdAndDelete(currentSession._id).exec();
		else result = await currentSession.save();
		req.socketManager.notify(
			currentSession.participants
				.concat({ email: participantEmail })
				.filter((participant) => participant.email !== req.user.email)
		);
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

const setUserPayment = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const userEmail = req.params.userEmail;
	const payment = req.body.payment;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	// check if new payment is a valid number
	if (isNaN(payment)) return res.status(400).json(ERR_INVALID_VALUE);

	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json(ERR_SESSION_NOT_FOUND);

		// check if specified participant is in the session
		const participant = currentSession.participants.find((value) => value.email === userEmail);
		if (!participant) return res.status(404).json(ERR_USER_NOT_FOUND);

		// check if new payment is valid
		participant.payed = payment;
		if (currentSession.totalPayed > currentSession.totalCost) return res.status(400).json(ERR_INVALID_VALUE);

		// validate payment
		const result = await currentSession.save();
		req.socketManager.notify(
			currentSession.participants.filter((participant) => participant.email !== req.user.email)
		);
		res.status(200).json(result);
	} catch (err) {
		if (err.name === 'ValidationError') res.status(400).json(err);
		else res.status(500).json(err);
	}
};

const endSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const endDate = Date.parse(req.body.endDate) || Date.now();

	//authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	try {
		// check if not current session exists for user
		const currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json(ERR_SESSION_NOT_FOUND);

		// check if the payment is valid
		if (currentSession.totalPayed.toFixed(2) !== currentSession.totalCost.toFixed(2)) return res.status(400).json(ERR_PAYMENT_INVALID);

		if (endDate < currentSession.creationDate) return res.status(400).json(ERR_INVALID_VALUE);

		// create debts
		const debts = computeDebts(currentSession.participants);

		for (let debt of debts) {
			const newDebt = new DebtModel({
				session: currentSession._id,
				...debt
			});
			await newDebt.save();
		}
		// end session by setting the endDate
		currentSession.endDate = endDate;
		const result = await currentSession.save();
		req.socketManager.notify(
			currentSession.participants.filter((participant) => participant.email !== req.user.email)
		);
		res.status(200).json(result);
	} catch (err) {
		if (err.name === 'ValidationError') res.status(400).json(err);
		res.status(500).json(err);
	}
};

const queryUsers = async (req, res) => {
	const query = req.query.q;
	try {
		const users = await admin.queryUsers(query);
		return res.status(200).json(users);
	} catch (e) {
		return res.status(500).json(e);
	}
};

module.exports = {
	findOpenSessionByEmail,
	getTotalCost,
	getAllSessions,
	createSession,
	getCurrentSessionForEmail,
	addUserToSession,
	removeUserFromSession,
	setUserPayment,
	endSession,
	queryUsers
};
