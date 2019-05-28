const DebtModel = require('../models/debt.model');

const { 
	ERR_DEBT_NOT_FOUND, 
	ERR_FORBIDDEN_FOR_USER,
	ERR_INVALID_VALUE 
} = require('../helpers/errors');

const getDebtsByCriteria = async (req, res) => {
	const startDate = Date.parse(req.query.begin);
	const endDate = Date.parse(req.query.end);

	let criteria = {};
	if (startDate) criteria.$gte = startDate;
	if (endDate) criteria.$lte = endDate;

	// agregate query function to populate the session object, used for filtering
	const agregate = (query) =>
		query.populate({
			path: 'session',
			match: {
				...(Object.keys(criteria).length > 0 ? { creationDate: criteria } : null)
			}
		});

	try {
		// get the debts that the user owes
		const owedBy = await agregate(
			DebtModel.find({
				owedBy: req.user.email,
				payed: null
			})
		);

		// get the debts that the user is being owed
		const owedTo = await agregate(
			DebtModel.find({
				owedTo: req.user.email,
				payed: null
			})
		);

		// filter the results where no session object is found (matches no criteria)
		res.status(200).json({
			owedBy: owedBy.filter((debt) => debt.session !== null),
			owedTo: owedTo.filter((debt) => debt.session !== null)
		});
	} catch (err) {
		res.status(500).json(err);
	}
};

const getDebtByID = async (req, res) => {
	const debtID = req.params.debtID;

	try {
		// find debt by ID
		const debt = await DebtModel.findById(debtID).populate('session').exec();
		if (!debt) return res.status(404).json(ERR_DEBT_NOT_FOUND);

		// check if authenticated user has access to specified debt
		if (req.user.email !== debt.owedBy && req.user.email !== debt.owedTo)
			return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

		res.status(200).json(debt);
	} catch (err) {
		return res.status(500).json(err);
	}
};

const patchDebt = async (req, res) => {
	const debtID = req.params.debtID;
	const newDeadline = Date.parse(req.body.deadline);
	const payedDate = Date.parse(req.body.payed);

	try {
		let debt = await DebtModel.findById(debtID).populate('session').exec();
		if (!debt) return res.status(404).json(ERR_DEBT_NOT_FOUND);

		// check if authenticated user is the one being owed
		if (req.user.email !== debt.owedTo)
			return res.status(403).json(ERR_FORBIDDEN_FOR_USER);

		// set new deadline
		if (newDeadline) {
			if (newDeadline > Date.now()) debt.deadline = newDeadline;
			else return res.status(400).json(ERR_INVALID_VALUE);
		}
		// set pay date 
		if (payedDate) {
			if (payedDate <= Date.now()) debt.payed = payedDate;
			else return res.status(400).json(ERR_INVALID_VALUE);
		}
		await debt.save();
		res.status(200).json(debt);
	} catch (err) {
		res.status(500).json(err);
	}
};

module.exports = {
	getDebtsByCriteria,
	getDebtByID,
	patchDebt
};
