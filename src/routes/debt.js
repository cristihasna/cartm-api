const express = require('express');
const {
    getDebtsByCriteria,
    getDebtByID
} = require('../controllers/debt.controller');

const router = express.Router();

router.get('/debts/', getDebtsByCriteria);

router.get('/debts/:debtID', getDebtByID);

module.exports = router;