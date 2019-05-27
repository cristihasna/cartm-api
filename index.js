const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const rootRouter = require('./src/routes');
const sessionRouter = require('./src/routes/session');
const debtRouter = require('./src/routes/debt');
const admin = require('./src/helpers/firebaseAdmin');
const { ERR_IDTOKEN } = require('./src/helpers/errors');

// environment variables
require('dotenv').config();

mongoose.connect(process.env.CONNECTION_STRING, { useNewUrlParser: true });
const app = express();

app.use(bodyParser.json());

// basic request logger
app.use((req, res, next) => {
	const getFormattedValue = (value) => {
		value = value.toString();
		if (value.length <= 50) return value;
		return value.substr(0, 40) + '...' + value.substr(value.length - 7);
	};
	console.log('-------------------');
	console.log(`[${req.method}] => ${req.originalUrl.split('?')[0]}\n\t(${new Date().toString()})`);
	if (Object.keys(req.body).length > 0) {
		console.log('Body:');
		for (const key of Object.keys(req.body)) console.log('   ' + key + ' -> ' + getFormattedValue(req.body[key]));
	}
	if (Object.keys(req.query).length > 0) {
		console.log('Query:');
		for (const key of Object.keys(req.query)) console.log('   ' + key + ' -> ' + getFormattedValue(req.query[key]));
	}
	next();
});

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
	
	next();
});

app.use(rootRouter);
app.use(sessionRouter);
app.use(debtRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server started on ${port}`));
