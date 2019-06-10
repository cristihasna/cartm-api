const SessionModel = require('../models/session.model');
const ProductInstanceModel = require('../models/productInstance.model');

const { ERR_FORBIDDEN_FOR_USER, ERR_INVALID_VALUE } = require('../helpers/errors');

const getSessionsHistory = async (req, res) => {
	const historyEmail = req.params.historyEmail;
	let user = req.user;
	// check if user has access to specified history
	if (historyEmail !== user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	const beginDate = Date.parse(req.query.beginDate);
	const endDate = Date.parse(req.query.endDate);
	const limit = parseInt(req.query.limit);

	// construct history endDate criteria
	let criteria = {
		$ne: null,
		...(beginDate && { $gte: beginDate }),
		...(endDate && { $lte: endDate })
	};
	// constructing the query
	const query = SessionModel.find({ 'participants.email': historyEmail, endDate: criteria }, null, {
		sort: '-endDate',
		...(limit != NaN && { limit })
	}).populate({
		path: 'products',
		populate: {
			path: 'product'
		}
	});
	try {
		const sessions = await query.exec();
		return res.status(200).json(sessions);
	} catch (e) {
		res.status(500).json(err);
	}
};

const getProductsByDate = async (historyEmail, criteria, limit) => {
	// constructing the query
	const query = SessionModel.find({ 'participants.email': historyEmail, endDate: criteria }, 'products endDate', {
		sort: '-endDate'
	}).populate({
		path: 'products',
		populate: {
			path: 'product'
		}
	});
	let products = [];
	// get sessions
	const sessions = await query.exec();
	for (let session of sessions) {
		// get products from each session
		for (let product of session.products) {
			// check if there is a limit and it's not crossed
			if (!isNaN(limit) && products.length >= limit) return products;
			// skip if the user is not a participant of this product
			if (!product.participants.includes(historyEmail)) continue;
			let newProduct = Object.assign({}, product.toJSON(), {
				date: session.endDate,
				sessionID: session._id
			});
			products.push(newProduct);
		}
	}
	return products;
};

const getProductsByPrice = async (historyEmail, criteria, limit) => {
	// constructing the query
	const query = SessionModel.find(
		{ 'participants.email': historyEmail, endDate: criteria },
		'products endDate'
	).populate({
		path: 'products',
		populate: {
			path: 'product'
		}
	});
	let products = [];
	// get sessions
	const sessions = await query.exec();
	for (let session of sessions) {
		// get products from each session
		for (let product of session.products) {
			// skip if the user is not a participant of this product
			if (!product.participants.includes(historyEmail)) continue;
			let newProduct = Object.assign({}, product.toJSON(), {
				date: session.endDate,
				sessionID: session._id
			});
			products.push(newProduct);
		}
	}
	products.sort((a, b) => (a.unitPrice > b.unitPrice ? -1 : a.unitPrice < b.unitPrice ? 1 : 0));
	if (!isNaN(limit) && products.length > limit) products = products.slice(0, limit);
	return products;
};

const getProductsByPopularity = async (historyEmail, criteria, limit) => {
	// constructing the query
	const query = SessionModel.find(
		{ 'participants.email': historyEmail, endDate: criteria },
		'products endDate'
	).populate({
		path: 'products',
		populate: {
			path: 'product'
		}
	});
	// each key in the products object is the Product ObjectId of each product.
	// the value is an object that contains the Product document and a counter
	let products = {};
	// get sessions
	const sessions = await query.exec();
	for (let session of sessions) {
		// get products from eacth session
		for (let productInstance of session.products) {
			// skip if user is not a participant of this productInstance
			if (!productInstance.participants.includes(historyEmail)) continue;
			// if the product already exists in the products object, increase the counter
			if (products.hasOwnProperty(productInstance.product._id)) products[productInstance.product._id].counter++;
			else
				products[productInstance.product._id] = Object.assign({}, productInstance.product.toJSON(), {
					counter: 1
				});
		}
	}
	// extract the products array
	products = Object.values(products);
    products.sort((a, b) => (a.counter > b.counter ? -1 : a.counter < b.counter ? 1 : 0));
    if (!isNaN(limit) && products.length > limit) products = products.slice(0, limit);
    return products;
};

const getProductsHistory = async (req, res) => {
	const historyEmail = req.params.historyEmail;
	let user = req.user;
	// check if user has access to specified history
	if (historyEmail !== user.email) return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

	const beginDate = Date.parse(req.query.beginDate);
	const endDate = Date.parse(req.query.endDate);
	const limit = parseInt(req.query.limit);
	const sort = (req.query.sort || 'date').toLowerCase();

	// construct history criteria
	let criteria = {
		$ne: null,
		...(beginDate && { $gte: beginDate }),
		...(endDate && { $lte: endDate })
	};

	// check if sort is invalid
	if (![ 'date', 'price', 'popular' ].includes(sort)) return res.status(400).json(ERR_INVALID_VALUE);

	try {
		let products;
		switch (sort) {
			case 'date':
				products = await getProductsByDate(historyEmail, criteria, limit);
				break;
			case 'price':
				products = await getProductsByPrice(historyEmail, criteria, limit);
				break;
			case 'popular':
				products = await getProductsByPopularity(historyEmail, criteria, limit);
				break;
		}
		return res.status(200).json(products);
	} catch (err) {
		console.log(err);
		res.status(500).json(err);
	}
};

module.exports = {
	getSessionsHistory,
	getProductsHistory
};
