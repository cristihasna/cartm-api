const express = require('express');
const {
	addProductToSession,
	patchProductInstance,
	removeProductFromSession,
	addParticipantToProduct,
	removeParticipantFromProduct,
	searchProductByName,
	getProductByID
} = require('../controllers/product.controller');

const router = express.Router();

router.post('/sessions/:sessionEmail/products', addProductToSession);

router.patch('/sessions/:sessionEmail/products/:productID', patchProductInstance);

router.delete('/sessions/:sessionEmail/products/:productID', removeProductFromSession);

router.post('/sessions/:sessionEmail/products/:productID/participants/', addParticipantToProduct);

router.delete(
	'/sessions/:sessionEmail/products/:productID/participants/:participantEmail',
	removeParticipantFromProduct
);

router.get('/products', searchProductByName);

router.get('/products/:productID', getProductByID);

module.exports = router;