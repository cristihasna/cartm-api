const productModel = require('../models/product.model');
const { findOpenSessionByEmail, getTotalCost } = require('./session.controller');

const {
	ERR_SESSION_NOT_FOUND,
	ERR_FORBIDDEN_FOR_USER,
	ERR_USER_NOT_FOUND,
	ERR_INVALID_VALUE,
	ERR_PRODUCT_NOT_FOUND,
	ERR_PARTICIPANT_EXISTS
} = require('../helpers/errors');

exports.addProductToSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	const barcode = req.body.barcode || null;
	const name = req.body.name;
	const quantity = req.body.quantity || 1;
	const participants = req.body.participants || [ req.user.email ];
	const unitPrice = req.body.price;

	try {
		// check if session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// validate participants
		if (participants && !(participants instanceof Array))
			return res.status(400).json({ message: ERR_INVALID_VALUE });
		for (participant of participants) {
			const found = currentSession.participants.find((value) => value.email === participant);
			if (!found) return res.status(400).json({ message: ERR_USER_NOT_FOUND });
		}

		// create new product
		const newProductObj = new productModel({ barcode, name, participants, quantity, unitPrice });
		const newProduct = await newProductObj.save();
		currentSession.products.push(newProduct);

		// add the cost of new product to participants' debt
		for (let participant of currentSession.participants) {
			const cost = getTotalCost(participant.email, currentSession.products);
			console.log(`${participant.email} - ${cost}`);
			participant.debt = cost;
		}

		const result = await currentSession.save();

		res.status(200).json(result.populate());
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.patchProduct = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const productID = req.params.productID;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified product exists in current session
		const indexOfProduct = currentSession.products.findIndex((value) => value._id == productID);
		if (indexOfProduct === -1) return res.status(404).json({ message: ERR_PRODUCT_NOT_FOUND });

		let product = await productModel.findById(productID).exec();
		if (req.body.quantity) product.quantity = req.body.quantity;
		if (req.body.unitPrice) product.unitPrice = req.body.unitPrice;
		if (req.body.name) product.name = req.body.name;
		if (req.body.barcode) product.barcode = req.body.barcode;

		if (req.body.participants) {
			// validate participants list
			for (let participant of req.body.participants) {
				const indexOfParticipant = currentSession.participants.findIndex(
					(value) => value.email === participant
				);
				if (indexOfParticipant === -1) return res.status(404).json({ message: ERR_USER_NOT_FOUND });
			}
			product.participants = req.body.participants;
		}
		await product.save();
		// recompute participants debt
		for (let participant of currentSession.participants)
			participant.debt = getTotalCost(participant.email, currentSession.products);
		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.removeProductFromSession = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const productID = req.params.productID;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified product exists in current session
		const indexOfProduct = currentSession.products.findIndex((value) => value._id == productID);
		if (indexOfProduct === -1) return res.status(404).json({ message: ERR_PRODUCT_NOT_FOUND });

		currentSession.products = currentSession.products
			.slice(0, indexOfProduct)
			.concat(currentSession.products.slice(indexOfProduct + 1));

		await productModel.findByIdAndDelete(productID).exec();

		// recompute participants debt
		for (let participant of currentSession.participants)
			participant.debt = getTotalCost(participant.email, currentSession.products);

		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.addParticipantToProduct = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const productID = req.params.productID;
	const participant = req.body.participant;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified product exists in current session
		const indexOfProduct = currentSession.products.findIndex((value) => value._id == productID);
		if (indexOfProduct === -1) return res.status(404).json({ message: ERR_PRODUCT_NOT_FOUND });

		// check if specified participant already exists at current product
		let product = await productModel.findById(productID).exec();
		if (product.participants.indexOf(participant) > -1)
			return res.status(400).json({ message: ERR_PARTICIPANT_EXISTS });

		// check if participant is valid
		const userIndex = currentSession.participants.findIndex((value) => value.email === participant);
		if (userIndex === -1) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

		product.participants.push(participant);
		await product.save();

		currentSession = await findOpenSessionByEmail(sessionEmail);
		// recompute participants debt
		for (let participant of currentSession.participants)
			participant.debt = getTotalCost(participant.email, currentSession.products);

		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};

exports.removeParticipantFromProduct = async (req, res) => {
	const sessionEmail = req.params.sessionEmail;
	const productID = req.params.productID;
	const participant = req.params.participantEmail;

	// authenticate user
	if (sessionEmail !== req.user.email) return res.status(403).json({ message: ERR_FORBIDDEN_FOR_USER });

	try {
		// check if session exists
		let currentSession = await findOpenSessionByEmail(sessionEmail);
		if (!currentSession) return res.status(404).json({ message: ERR_SESSION_NOT_FOUND });

		// check if specified product exists in current session
		const indexOfProduct = currentSession.products.findIndex((value) => value._id == productID);
		if (indexOfProduct === -1) return res.status(404).json({ message: ERR_PRODUCT_NOT_FOUND });

		// check if specified participant exists at current product
		let product = await productModel.findById(productID).exec();
		const indexOfParticipant = product.participants.indexOf(participant);
		if (indexOfParticipant === -1) return res.status(404).json({ message: ERR_USER_NOT_FOUND });

		// remove participant
		product.participants = product.participants
			.slice(0, indexOfParticipant)
			.concat(product.participants.slice(indexOfParticipant + 1));

		await product.save();
		// recompute participants debt
		currentSession = await findOpenSessionByEmail(sessionEmail);
		for (let participant of currentSession.participants)
			participant.debt = getTotalCost(participant.email, currentSession.products);
		const result = await currentSession.save();
		res.status(200).json(result);
	} catch (err) {
		res.status(500).json(err);
	}
};
