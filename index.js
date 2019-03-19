const config = require('./config.json');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const rootRouter = require('./src/routes');

mongoose.connect(config.connectionString);
const app = express();

app.use(bodyParser.json());

//basic request logger
app.use((req, res, next) => {
	console.log('-------------------');
	console.log(`[${req.method}] ${new Date().toString()} => ${req.originalUrl}`);
	console.log('body:', req.body);
	next();
});

app.use(rootRouter);

const port = process.env.PORT || config.port || 3000;
app.listen(port, () => console.log(`server started on ${port}`));
