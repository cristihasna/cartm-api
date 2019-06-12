/*
basic request logger
will print headers, query, params and body
*/

module.exports = (req, res, next) => {
	const getFormattedValue = (value) => {
		if (value === null) return null;
		value = value.toString();
		if (value.length <= 50) return value;
		return value.substr(0, 40) + '...' + value.substr(value.length - 7);
	};
	console.log('-------------------');
	console.log(`[${req.method}] => ${req.originalUrl.split('?')[0]}\n\t(${new Date().toString()})`);
	if (Object.keys(req.headers).length > 0) {
		console.log('Headers:');
		for (const key of Object.keys(req.headers))
			console.log('   ' + key + ' -> ' + getFormattedValue(req.headers[key]));
	}
	if (Object.keys(req.body).length > 0) {
		console.log('Body:');
		for (const key of Object.keys(req.body)) console.log('   ' + key + ' -> ' + getFormattedValue(req.body[key]));
	}
	if (Object.keys(req.query).length > 0) {
		console.log('Query:');
		for (const key of Object.keys(req.query)) console.log('   ' + key + ' -> ' + getFormattedValue(req.query[key]));
	}
	next();
};
