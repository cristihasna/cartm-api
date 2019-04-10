const mongoose = require('mongoose');

let productSchema = mongoose.Schema({
	// product ID can be either a barcode or a name
	barcode: {
		type: String,
		required: false,
		default: null
	},
	name: {
		type: String,
		required: true
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

productSchema.virtual('totalPrice').get(function() {
	return this.unitPrice * this.quantity;
});

productSchema.virtual('openFoodFactsData').get(function() {
	const barcode = this.product.barcode;
	if (barcode === null) return null;
	const productData = {};
	return fetch(`https://ssl-api.openfoodfacts.org/api/v0/product/${barcode}.json`)
		.then((data) => data.json())
		.then((data) => {
			if (data.status === 0) return null;
			if (data.product.product_name) productData.name = data.product.product_name;
			if (data.product.nova_group) productData.nova_group = data.product.nova_group;
			if (data.product.nutrition_grades) productData.nutrition_grade = data.product.nutrition_grades;
			if (data.product.nutrient_levels) productData.nutrient_levels = data.product.nutrient_levels;
			if (data.product.allergens) productData.allergens = data.product.allergens;
			if (data.product.quantity) productData.quantity = data.product.quantity;
			return productData;
		})
		.catch((err) => {
			console.log(err);
			return null;
		});
});

module.exports = mongoose.model('Product', productSchema);
