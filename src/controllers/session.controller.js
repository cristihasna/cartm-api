const sessionModel = require('../models/session.model');
const admin = require('../helpers/firebaseAdmin');

const {
	ERR_SESSION_EXISTS,
	ERR_SESSION_NOT_EXISTS,
	ERR_IDTOKEN,
	ERR_FORBIDDEN_FOR_USER,
	ERR_USER_NOT_EXISTS
} = require('../helpers/errors');

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
	const email = req.params.email;
	const user = await admin.authIDToken(token);
	if (user === null) {
		res.status(401).json({ error: ERR_IDTOKEN });
		return;
	} else if (email !== user.email) {
		res.status(403).json({ error: ERR_FORBIDDEN_FOR_USER });
		return;
	}
	const creationDate = req.body.creationDate || Date.now();
	const participants = [ { email, payed: 0 } ];

	try {
		const currentSession = await sessionModel
			.findOne({
				endDate: null,
				'participants.email': email
			})
			.exec();
		if (currentSession != null) {
			res.status(403).json({ error: ERR_SESSION_EXISTS });
			return;
		}
		const session = new sessionModel({ creationDate, participants });
		const result = await session.save();
		res.status(201).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.getCurrentSessionForEmail = async (req, res) => {
	const email = req.params.email;
	const token = req.query.token;
	const user = await admin.authIDToken(token);
	if (user == null) {
		res.status(401).json({ error: ERR_IDTOKEN });
		return;
	}
	if (user.email !== email) {
		res.status(403).json({ error: ERR_FORBIDDEN_FOR_USER });
		return;
	}
	try {
		const session = await sessionModel
			.findOne({
				endDate: null,
				'participants.email': email
			})
			.exec();
		res.status(200).json(session);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.addUserToSession = async (req, res) => {
	const email = req.params.email;
	// authenticate user
	const user = await admin.authIDToken(req.query.token);
	if (user == null) {
		res.status(401).json({ error: ERR_IDTOKEN });
		return;
	} else if (email !== user.email) {
		res.status(403).json({ error: ERR_FORBIDDEN_FOR_USER });
		return;
	}
	const newUser = req.body.email;
	try {
		// check if current session exists
		let currentSession = await sessionModel
			.findOne({
				endDate: null,
				'participants.email': email
			})
			.exec();
		if (currentSession === null) {
			res.status(404).json({ error: ERR_SESSION_NOT_EXISTS });
			return;
		}
		//check if other user exists 
		if (await admin.getUserByEmail(newUser) === null){
			res.status(404).json({error: ERR_USER_NOT_EXISTS})
			return;
		}
		//check if other use already has an open session
		let otherUserSession = await sessionModel
			.findOne({
				endDate: null,
				'participants.email': newUser
			})
			.exec();
		if (otherUserSession !== null) {
			res.status(403).json({ error: ERR_SESSION_EXISTS });
			return;
		}
		//check if user already exists in current session
		let participants = currentSession.participants.filter((value) => {
			return newUser === value.email;
		});
		if (participants.length === 0) {
			currentSession.participants.push({ email: newUser, payed: 0 });
		}
		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};
