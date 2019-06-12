const express = require('express');
const { updateRegistrationToken } = require('../controllers/device.controller');

const router = express.Router();

router.post('/register-device/:userEmail', updateRegistrationToken);

module.exports = router;