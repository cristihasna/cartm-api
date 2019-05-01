const express = require('express');
const {
    getDebtsByCriteria,
    getDebtByID,
    patchDebt
} = require('../controllers/debt.controller');

const router = express.Router();

router.get('/debts/', getDebtsByCriteria);

router.get('/debts/:debtID', getDebtByID);

router.patch('/debts/:debtID', patchDebt);

module.exports = router;