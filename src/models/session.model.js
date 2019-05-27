const mongoose = require('mongoose');

let sessionSchema = new mongoose.Schema({
	creationDate: {
		type: Date,
		default: Date.now
	},
	participants: {
		/* array of objects that contains the userEmail and the ammount that the user has paid */
		type: [
			{
				email: {
					type: String,
					match: /[A-Za-z][a-zA-Z0-9._]+\@[A-Za-z](\.?[a-zA-Z0-9._]+)+/
				},
				profile: Object,
				payed: {
					type: Number,
					default: 0,
					min: 0
				},
				debt: {
					type: Number,
					min: 0,
					default: 0
				}
			}
		],
		default: []
	},
	products: {
		/* array of objects that contains productId, an array of emails of users that contributed to this product, and the price */
		type: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'ProductInstance'
			}
		],
		default: []
	},
	endDate: {
		type: Date,
		default: null
	}
});

sessionSchema.virtual('totalCost').get(function(){
	let sum = 0;
	this.products.forEach((element) => {
		sum += element.unitPrice * element.quantity;
	});
	return sum;
});

sessionSchema.virtual('totalPayed').get(function(){
	let sum = 0;
	this.participants.forEach((element) => {
		sum += element.payed;
	});
	return sum;
});

module.exports = mongoose.model('Session', sessionSchema);
