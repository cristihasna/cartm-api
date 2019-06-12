const express = require('express');
const rootRouter = express.Router();
const debtRouter = require('./debt');
const deviceRouter = require('./device');
const historyRouter = require('./history');
const productRouter = require('./product');
const sessionRouter = require('./session');

/*
* ping route
* returns 200 OK and the current version of the API
*/
rootRouter.get('/', (req, res) => {
	res.status(200).json({
		status: 'ok',
		version: '1.0.0'
	});
});

module.exports = {
	rootRouter,
	debtRouter,
	deviceRouter,
	historyRouter,
	productRouter,
	sessionRouter
};
