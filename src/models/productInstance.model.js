const mongoose = require('mongoose');

let productInstanceSchema = mongoose.Schema({
	// product ID can be either a barcode or a name
	product:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Product'
	},
	participants: {
		type: [ String ],
		required: true
	},
	quantity: {
		type: Number,
		required: false,
		default: 1
	},
	unitPrice: {
		type: Number,
		required: true,
		min: 0
	}
});

productInstanceSchema.virtual('totalPrice').get(function() {
	return this.unitPrice * this.quantity;
});

module.exports = mongoose.model('ProductInstance', productInstanceSchema);
