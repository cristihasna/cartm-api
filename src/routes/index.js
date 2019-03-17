const express = require('express');
const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: '1.0.0'
    });
})

router.post("/", (req, res) => {
    res.status(400).send();
})

module.exports = router;