const express = require('express');
const {
	getAllSessions,
	createSession,
	getCurrentSessionForEmail,
	addUserToSession,
	setUserPayment,
	endSession,
	removeUserFromSession,
	queryUsers
} = require('../controllers/session.controller');
const router = express.Router();

router.get('/sessions/', getAllSessions);

router.get('/sessions/:sessionEmail', getCurrentSessionForEmail);

router.post('/sessions/:sessionEmail/create', createSession);

router.post('/sessions/:sessionEmail/end', endSession);

router.post('/sessions/:sessionEmail/participants/', addUserToSession);

router.delete('/sessions/:sessionEmail/participants/:userEmail', removeUserFromSession);

router.post('/sessions/:sessionEmail/participants/:userEmail/payment', setUserPayment);

router.get('/users', queryUsers);

module.exports = router;
