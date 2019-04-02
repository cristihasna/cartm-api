const config = require('./config.json');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const rootRouter = require('./src/routes');
const sessionRouter = require('./src/routes/session')

mongoose.connect(config.connectionString, { useNewUrlParser: true });
const app = express();

app.use(bodyParser.json());

//basic request logger
app.use((req, res, next) => {
	console.log('-------------------');
	console.log(`[${req.method}] ${new Date().toString()} => ${req.originalUrl}`);
	if (Object.keys(req.body).length > 0) console.log('body:', req.body);
	if (Object.keys(req.query).length > 0) console.log('query:', req.query);
	if (Object.keys(req.params).length > 0) console.log('params:', req.params);
	next();
});

app.use(rootRouter);
app.use(sessionRouter);

const port = process.env.PORT || config.port || 3000;
app.listen(port, () => console.log(`server started on ${port}`));
