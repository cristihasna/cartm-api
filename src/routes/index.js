const express = require('express');
const router = express.Router();

const { authToken } = require('../helpers/firebaseAdmin');

/*
* ping route
* returns 200 OK and the current version of the API
*/
router.get('/', (req, res) => {
	res.status(200).json({
		status: 'ok',
		version: '1.0.0'
	});
});

/*
* IDToken validation and testing route
* accepts json that contains 'token' key and verifies the token using firebase admin
* sends back the result
*/

router.post('/', (req, res) => {
	body = req.body;
	idToken = body.token;
	authToken(idToken)
		.then((data) => {
			res.status(200).json(data);
		})
		.catch((err) => {
			res.status(500).json(err);
		});
});

module.exports = router;
