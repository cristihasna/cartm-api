const express = require('express');
const {
	getAllSessions,
	createSession,
	getCurrentSessionForEmail,
	addUserToSession,
	setUserPayment,
	endSession,
	removeUserFromSession
} = require('../controllers/session.controller');
const {
	addProductToSession,
	patchProductInstance,
	removeProductFromSession,
	addParticipantToProduct,
	removeParticipantFromProduct
} = require('../controllers/product.controller');
const router = express.Router();

router.get('/sessions/', getAllSessions);

router.get('/sessions/:sessionEmail', getCurrentSessionForEmail);

router.post('/sessions/:sessionEmail/create', createSession);

router.post('/sessions/:sessionEmail/end', endSession);

router.post('/sessions/:sessionEmail/products', addProductToSession);

router.patch('/sessions/:sessionEmail/products/:productID', patchProductInstance);

router.delete('/sessions/:sessionEmail/products/:productID', removeProductFromSession);

router.post('/sessions/:sessionEmail/products/:productID/participants/', addParticipantToProduct);

router.delete(
	'/sessions/:sessionEmail/products/:productID/participants/:participantEmail',
	removeParticipantFromProduct
);

router.post('/sessions/:sessionEmail/participants/', addUserToSession);

router.delete('/sessions/:sessionEmail/participants/:userEmail', removeUserFromSession);

router.post('/sessions/:sessionEmail/participants/:userEmail/payment', setUserPayment);

module.exports = router;
