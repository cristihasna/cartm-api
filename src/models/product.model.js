const mongoose = require('mongoose');

let productSchema = mongoose.Schema({
	barcode: {
		type: String,
		required: false
	},
	name: {
		type: String,
		required: true
	}
});

productSchema.virtual('openFoodFactsData').get(function() {
	const productData = {};
	if (this.barcode === null) return {};
	return fetch(`https://ssl-api.openfoodfacts.org/api/v0/product/${this.barcode}.json`)
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
			return {};
		});
});

module.exports = mongoose.model('Product', productSchema);
