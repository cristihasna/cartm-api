const debtModel = require('../models/debt.model');
const admin = require('../helpers/firebaseAdmin');

const getDebtsByCriteria = async (req, res) => {
	const token = req.query.token;
	const startDate = Date.parse(req.query.begin);
	const endDate = Date.parse(req.query.end);

	//authenticate user
	const user = await admin.authIDToken(token);
	if (!user) return res.status(401).json({ message: ERR_IDTOKEN });
	let criteria = {};
	if (startDate) criteria.$gte = startDate;
	if (endDate) criteria.$lte = endDate;

	const agregate = (query) =>
		query.populate({
			path: 'session',
			match: {
				...(Object.keys(criteria).length > 0 ? { creationDate: criteria } : null)
			}
		});

	try {
		const owedBy = await agregate(
			debtModel.find({
				owedBy: user.email,
				payed: null
			})
		);
		const owedTo = await agregate(
			debtModel.find({
				owedTo: user.email,
				payed: null
			})
		);
		res.status(200).json({
            owedBy: owedBy.filter(debt => debt.session !== null),
            owedTo: owedTo.filter(debt => debt.session !== null)
        });
	} catch (err) {
		res.status(500).json(err);
	}
};

const getDebtByID = async (req, res) => {
	res.status(200).json({ message: 'ok' });
};

module.exports = {
	getDebtsByCriteria,
	getDebtByID
};
