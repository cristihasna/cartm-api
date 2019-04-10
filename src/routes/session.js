const express = require('express');
const {
	getAllSessions,
	createSession,
	getCurrentSessionForEmail,
	addUserToSession,
	setUserPayment
} = require('../controllers/session.controller');
const {
	addProductToSession,
	patchProduct,
	removeProductFromSession,
	addParticipantToProduct,
	removeParticipantFromProduct
} = require('../controllers/product.controller');
const router = express.Router();

router.get('/sessions/', getAllSessions);

router.get('/sessions/:sessionEmail', getCurrentSessionForEmail);

router.post('/sessions/:sessionEmail/create', createSession);

router.post('/sessions/:sessionEmail/products', addProductToSession);

router.patch('/sessions/:sessionEmail/products/:productID', patchProduct);

router.delete('/sessions/:sessionEmail/products/:productID', removeProductFromSession);

router.post('/sessions/:sessionEmail/products/:productID/participants/', addParticipantToProduct);

router.delete(
	'/sessions/:sessionEmail/products/:productID/participants/:participantEmail',
	removeParticipantFromProduct
);

router.post('/sessions/:sessionEmail/participants/', addUserToSession);

router.post('/sessions/:sessionEmail/participants/:userEmail/payment', setUserPayment);

module.exports = router;
