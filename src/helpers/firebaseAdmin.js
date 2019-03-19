var admin = require('firebase-admin');

var serviceAccount = require('./service-account-key.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://cartm-rn.firebaseio.com'
});

const authIDToken = async (IDToken) => {
	try {
		const decoded = await admin.auth().verifyIdToken(IDToken);
		return admin.auth().getUser(decoded.uid);
	} catch (err) {
		return err;
	}
};

module.exports = authIDToken;
