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

const {processReceipt} = require('../controllers/receipt.controller');

const router = express.Router();

router.get('/sessions/', getAllSessions);

router.get('/sessions/:sessionEmail', getCurrentSessionForEmail);

router.post('/sessions/:sessionEmail/create', createSession);

router.post('/sessions/:sessionEmail/end', endSession);

// change to /sessions/:sesionEmail/participants/:userEmail
router.post('/sessions/:sessionEmail/participants/', addUserToSession);

router.delete('/sessions/:sessionEmail/participants/:userEmail', removeUserFromSession);

//change to PATCH to /sessions/:sessionEmail/participants/:userEmail
router.post('/sessions/:sessionEmail/participants/:userEmail/payment', setUserPayment);

router.get('/users', queryUsers);

router.post('/receipts', processReceipt);

module.exports = router;
