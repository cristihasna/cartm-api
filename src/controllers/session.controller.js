const sessionModel = require('../models/session.model');
const admin = require('../helpers/firebaseAdmin');

const {
	ERR_SESSION_EXISTS,
	ERR_SESSION_NOT_FOUND,
	ERR_IDTOKEN,
	ERR_FORBIDDEN_FOR_USER,
	ERR_USER_NOT_FOUND,
	ERR_INVALID_VALUE
} = require('../helpers/errors');

const findOpenSessionByEmail = (email) => {
	return sessionModel.findOne({ endDate: null, 'participants.email': email }).populate('products').exec();
};

exports.getAllSessions = async (req, res) => {
	try {
		const sessions = await sessionModel.find().exec();
		res.status(200).json(sessions);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.createSession = async (req, res) => {
	const token = req.query.token;
	const sessionEmail = req.params.sessionEmail;

	//authenticate user
	const user = await admin.authIDToken(token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });
	if (sessionEmail !== user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	const creationDate = req.body.creationDate || Date.now();
	const participants = [ { email: sessionEmail, payed: 0 } ];

	try {
		// check if not current session exists for user
		const currentSession = await findOpenSessionByEmail(sessionEmail);
		if (currentSession) return res.status(400).json({ message: ERR_SESSION_EXISTS });

		const session = new sessionModel({ creationDate, participants });
		const result = await session.save();
		res.status(201).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.getCurrentSessionForEmail = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const token = req.query.token;

	//authenticate user
	const user = await admin.authIDToken(token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });
	if (user.email !== sessionEmail) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		const session = await findOpenSessionByEmail(sessionEmail);
		if (!session) res.status(404);
		else res.status(200);
		res.json(session);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.addUserToSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;

	// authenticate user
	const user = await admin.authIDToken(req.query.token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });
	if (sessionEmail !== user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	const newUser = req.body.email;
	try {
		// check if current session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if other user exists
		const newUserObj = await admin.getUserByEmail(newUser);
		if (!newUserObj) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

		// check if other user already has an open session
		let otherUserSession = await findOpenSessionByEmail(newUser);
		if (otherUserSession) return res.status(400).json({ message: ERR_SESSION_EXISTS });

		// add the new participant
		currentSession.participants.push({ email: newUser, payed: 0 });

		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.setUserPayment = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const userEmail = req.params.userEmail;
	const payment = req.body.payment;

	// authenticate user
	const user = await admin.authIDToken(req.query.token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });
	if (sessionEmail !== user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

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
