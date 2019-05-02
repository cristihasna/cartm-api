const config = require('./config.json');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const rootRouter = require('./src/routes');
const sessionRouter = require('./src/routes/session');
const debtRouter = require('./src/routes/debt');

mongoose.connect(config.connectionString, { useNewUrlParser: true });
const app = express();

app.use(bodyParser.json());

//basic request logger
app.use((req, res, next) => {
	const getFormattedValue = (value) => {
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

app.use(rootRouter);
app.use(sessionRouter);
app.use(debtRouter);

const port = process.env.PORT || config.port || 3000;
app.listen(port, () => console.log(`server started on ${port}`));
