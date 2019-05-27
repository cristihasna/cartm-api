const sessionModel = require('../models/session.model');
const debtModel = require('../models/debt.model');
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
	return sessionModel.findOne({ endDate: null, 'participants.email': email }).populate({ 
		path: 'products',
		populate: {
			path: 'product'
		}
	}).exec();
};

const getTotalCost = (email, products) => {
	let totalCost = 0;
	for (let product of products) {
		if (product.participants.length > 0 && product.participants.indexOf(email) > -1)
			totalCost += product.unitPrice * product.quantity / product.participants.length;
	}
	return totalCost;
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
		const sessions = await sessionModel.find().exec();
		res.status(200).json(sessions);
	} catch (err) {
		res.status(500).json(err);
	}
};

const createSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	let user = req.user;
	if (sessionEmail !== user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	const creationDate = req.body.creationDate || Date.now();
	const participants = [ { email: sessionEmail, payed: 0 } ];

	try {
		// check if not current session exists for user
		const currentSession = await findOpenSessionByEmail(sessionEmail);
		if (currentSession) return res.status(400).json({ message: ERR_SESSION_EXISTS });
		user = {
			displayName: user.displayName,
			photoURL: user.photoURL,
			email: user.email
		};
		participants[0].profile = user;
		const session = new sessionModel({ creationDate, participants });
		const result = await session.save();
		res.status(201).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

const getCurrentSessionForEmail = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	if (req.user.email !== sessionEmail) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

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
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	const newUser = req.body.email;
	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if other user exists
		let newUserObj = await admin.getUserByEmail(newUser);
		if (!newUserObj) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

		// check if other user already has an open session
		let otherUserSession = await findOpenSessionByEmail(newUser);
		if (otherUserSession) return res.status(400).json({ message: ERR_SESSION_EXISTS });

		// add the new participant
		newUserObj = {
			displayName: newUserObj.displayName,
			photoURL: newUserObj.photoURL,
			email: newUserObj.email
		};
		currentSession.participants.push({ email: newUser, payed: 0, profile: newUserObj });

		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

const removeUserFromSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const participantEmail = req.params.userEmail;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified participant exists
		const indexOfParticipant = currentSession.participants.findIndex((value) => value.email === participantEmail);
		if (indexOfParticipant === -1) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

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
			result = await sessionModel.findByIdAndDelete(currentSession._id).exec();
		else result = await currentSession.save();
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
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	// check if new payment is a valid number
	if (isNaN(payment)) return res.status(400).json({ message: ERR_INVALID_VALUE });

	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified participant is in the session
		const participant = currentSession.participants.find((value) => value.email === userEmail);
		if (!participant) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

		// check if new payment is valid
		participant.payed = payment;
		if (currentSession.totalPayed > currentSession.totalCost)
			return res.status(400).json({ message: ERR_INVALID_VALUE });

		// validate payment
		const result = await currentSession.save();
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
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if not current session exists for user
		const currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if the payment is valid
		if (currentSession.totalPayed !== currentSession.totalCost)
			return res.status(400).json({ message: ERR_PAYMENT_INVALID });

		if (endDate < currentSession.creationDate) return res.status(400).json({ message: ERR_INVALID_VALUE });

		// create debts
		const debts = computeDebts(currentSession.participants);

		for (let debt of debts) {
			const newDebt = new debtModel({
				session: currentSession._id,
				...debt
			});
			await newDebt.save();
		}
		// end session by setting the endDate
		currentSession.endDate = endDate;
		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		if (err.name === 'ValidationError') res.status(400).json(err);
		res.status(500).json(err);
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
	endSession
};
