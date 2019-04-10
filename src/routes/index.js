const express = require('express');
const router = express.Router();

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

module.exports = router;
