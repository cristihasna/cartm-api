const SessionModel = require('../models/session.model');
const DeviceModel = require('../models/device.model');
const ProductInstanceModel = require('../models/productInstance.model');
const DebtModel = require('../models/debt.model');
const admin = require('../helpers/firebaseAdmin');

const { ERR_USER_NOT_FOUND, ERR_INVALID_VALUE, ERR_PAYMENT_INVALID } = require('../helpers/errors');

const { getProductObj } = require('./product.controller');

const getTotalCost = (email, products) => {
	let totalCost = 0;
	for (let product of products) {
		if (product.participants.length > 0 && product.participants.indexOf(email) > -1)
			totalCost += product.unitPrice * product.quantity / product.participants.length;
	}
	return totalCost;
};

const sendNotificationToUser = async (sender, receiver) => {
	try {
		let displayName = sender.displayName;
		if (!displayName) {
			let emailID = sender.email.split('@')[0];
			emailID = emailID.replace(/[0-9]+/, '');
			const emailComponents = emailID.split(/[._]/);
			let name = emailComponents[0].slice(0, 1).toUpperCase() + emailComponents[0].slice(1).toLowerCase();

			if (emailComponents.length > 1)
				name += ' ' + emailComponents[1].slice(0, 1).toUpperCase() + emailComponents[1].slice(1).toLowerCase();
			displayName = name;
		}
		const deviceAssoc = await DeviceModel.findOne({ userEmail: receiver.email || receiver }).exec();

		// if the user doesn't have a registrationToken associated return
		if (!deviceAssoc) return;

		const registrationToken = deviceAssoc.registrationToken;
		const notification = {
			title: 'A Lannister always pays his debts!',
			body: `${displayName} says you owe them money.`
		};
		await admin.sendNotification(registrationToken, notification, { screen: 'debts' });
	} catch (e) {
		console.log(e);
	}
};

const computeDebts = (participants) => {
	let totalDebt = 0;
	let owedParticipants = {};
	let indebtedParticipants = {};
	let debts = [];

	// compute totalDebt and the sets of owed and indebted participants
	for (let p of participants) {
		if (p.payed > p.debt) {
			// p has to receive following amount
			owedParticipants[p.email] = p.payed - p.debt;
			totalDebt += p.payed - p.debt;
		} else if (p.payed < p.debt) {
			// p has to pay following amount
			indebtedParticipants[p.email] = p.debt - p.payed;
		}
	}

	// for every indebted participant create a debt to every owed participant
	for (let p in indebtedParticipants) {
		for (let other in owedParticipants) {
			debts.push({
				owedBy: p,
				owedTo: other,
				amount: owedParticipants[other] / totalDebt * indebtedParticipants[p]
			});
		}
	}
	return debts;
};

const processReceipt = async (req, res) => {
	const rParticipants = req.body.participants;
	const rProducts = req.body.products;

	// check if participants and products are valid arrays
	if (!Array.isArray(rParticipants) || !Array.isArray(rProducts))
		return res.status(400).json(Object.assign(ERR_INVALID_VALUE, { message: `No products or participants array` }));

	try {
		// check if participants exist
		let participants = [];
		for (let participant of rParticipants) {
			let userObject = await admin.getUserByEmail(participant.email);
			if (!userObject) return res.status(404).json(ERR_USER_NOT_FOUND);
			participants.push({
				email: userObject.email,
				payed: participant.payed,
				debt: participant.debt,
				profile: {
					displayName: userObject.displayName,
					photoURL: userObject.photoURL,
					email: userObject.email
				}
			});
		}
		let products = [];
		for (let product of rProducts) {
			// if product object is malformed, return invalid value error
			if (!product.product)
				return res
					.status(400)
					.json(Object.assign(ERR_INVALID_VALUE, { message: 'Product instance has no product info' }));
			// check if product participants exist
			if (!Array.isArray(product.participants))
				return res.status(400).json(
					Object.assign(ERR_INVALID_VALUE, {
						message: `Product ${product.product.name} has no participants array`
					})
				);
			for (let participant of product.participants) {
				if (!participants.find((other) => other.email === participant))
					return res.status(404).json(ERR_USER_NOT_FOUND);
			}
			// get product object by name
			const productObj = await getProductObj(undefined, product.product.name);
			const newProduct = await new ProductInstanceModel({
				product: productObj,
				quantity: product.quantity,
				unitPrice: product.unitPrice,
				participants: product.participants
			}).save();
			products.push(newProduct);
		}

		// compute debts for each participant (we don't trust front-end data)
		for (let participant of participants) {
			participant.debt = getTotalCost(participant.email, products);
		}
		// create session object
		let receiptSession = new SessionModel({
			products,
			participants,
			creationDate: new Date(),
			endDate: new Date()
		});

		// check if receipt cost equals the payment
		if (receiptSession.totalCost !== receiptSession.totalPayed) return res.status(400).json(ERR_PAYMENT_INVALID);

		// construct debts
		const debts = computeDebts(participants);
		for (let debt of debts) {
			const newDebt = new DebtModel({
				session: receiptSession._id,
				...debt
			});

			// notify user that they have a new debt
			newDebt.save().then(() => {});
			const owedTo = participants.find((other) => other.email === debt.owedTo);
			const owedBy = participants.find((other) => other.email === debt.owedBy);
			sendNotificationToUser(owedTo, owedBy).then(() => {});
		}

		const result = await receiptSession.save();
		res.status(200).json(result);
	} catch (err) {
		if (err.name === 'ValidationError') res.status(400).json(err);
		res.status(500).json(err);
	}
};

module.exports = {
	processReceipt
};
