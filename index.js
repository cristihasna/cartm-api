const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const { rootRouter, debtRouter, deviceRouter, historyRouter, productRouter, sessionRouter } = require('./src/routes');
const admin = require('./src/helpers/firebaseAdmin');
const logger = require('./src/helpers/logger');
const { ERR_IDTOKEN } = require('./src/helpers/errors');
const WebSocket = require('ws');
const http = require('http');

const SocketManager = require('./src/helpers/SocketManager');

// environment variables
require('dotenv').config();

mongoose.connect(process.env.CONNECTION_STRING, { useNewUrlParser: true });
const app = express();

app.use(bodyParser.json());

// basic request logger
app.use(logger);

let socketManager = new SocketManager();

// IDToken authentification
app.use(async (req, res, next) => {
	// get IDToken from Authorization header
	let token = req.headers.authorization || '';
	token = token.replace('Bearer ', '');

	// authenticate user
	let user = await admin.authIDToken(token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });

	// save new user property in request object
	req.user = user;

	// save the socket manager object to notify session participants on changes
	req.socketManager = socketManager;
	next();
});

// make use of the API routers
app.use(rootRouter, sessionRouter, productRouter, debtRouter, historyRouter, deviceRouter);

// initialize server
const server = http.createServer(app);

// initialize web-socket
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
	let user;
	ws.on('message', async (IDToken) => {
		user = await admin.authIDToken(IDToken);
		if (user) socketManager.add(user.email, ws);
	});
	ws.on('close', (code, reason) => {
		if (user) socketManager.remove(user.email);
	});
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`server started on ${port}`));
