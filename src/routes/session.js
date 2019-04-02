const express = require('express');
const { getAllSessions, createSession, getCurrentSessionForEmail, addUserToSession } = require('../controllers/session.controller');
const { authToken } = require('../helpers/firebaseAdmin');
const router = express.Router();

router.get('/sessions/', getAllSessions);

router.get('/sessions/:email', getCurrentSessionForEmail);

router.post('/sessions/:email/create', createSession);

router.post('/sessions/:email/participants/add', addUserToSession);

module.exports = router;
