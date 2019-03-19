let mongoose = require('mongoose');

let sessionSchema = new mongoose.Schema({
	beginDate: {
		type: Date,
		default: Date.now(),
		required: true
	},
	creatorEmail: {
		type: String,
		required: true
	},
	participants: {
		/* array of objects that contains the userEmail and the ammount that the user has paid */
		type: Array,
		default: [],
		required: true
	},
	products: {
		/* array of objects that contains productId, an array of emails of users that contributed to this product, and the price */
		type: Array,
		default: [],
		required: true
	},
	endDate: {
		type: Date,
		default: null,
		required: true
	}
});

module.exports = mongoose.model('Customer', sessionSchema);
