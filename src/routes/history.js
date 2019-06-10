const express = require('express');
const { getSessionsHistory, getProductsHistory } = require('../controllers/history.controller');

const router = express.Router();

router.get('/history/:historyEmail/sessions', getSessionsHistory);

router.get('/history/:historyEmail/products', getProductsHistory);

module.exports = router;
