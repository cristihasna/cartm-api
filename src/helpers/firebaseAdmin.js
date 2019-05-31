const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

const serviceAccount = {
	type: process.env.TYPE,
	project_id: process.env.PROJECT_ID,
	private_key_id: process.env.PRIVATE_KEY_ID,
	private_key: process.env.NODE_ENV === 'production' ? JSON.parse(process.env.PRIVATE_KEY) : process.env.PRIVATE_KEY,
	client_email: process.env.CLIENT_EMAIL,
	client_id: process.env.CLIENT_ID,
	auth_uri: process.env.AUTH_URI,
	token_uri: process.env.TOKEN_URI,
	auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
	client_x509_cert_url: process.env.CLIENT_X509_CERT_URL
};

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://cartm-rn.firebaseio.com'
});

const authIDToken = async (IDToken) => {
	const tokens = {
		token_user_1: 'cristian.hasna@gmail.com',
		token_user_2: 'cristihasna@mail.com',
		token_user_3: 'cristi@mail.com'
	};

	try {
		const decoded = await admin.auth().verifyIdToken(IDToken);
		return admin.auth().getUser(decoded.uid);
		// if (!tokens.hasOwnProperty(IDToken)) return null;
		// else return await getUserByEmail(tokens[IDToken]);
	} catch (e) {
		return null;
	}
};

const getUserByEmail = async (email) => {
	try {
		return await admin.auth().getUserByEmail(email);
	} catch (err) {
		return null;
	}
};

const queryUsers = async (query) => {
	let regex;
	try {
		regex = new RegExp(query.replace(/\s/g, '.'), 'i');
	} catch (e) {
		return Promise.resolve([]);
	}
	return new Promise((resolve, reject) => {
		const listAllUsers = async (nextPageToken, users = []) => {
			// List batch of users, 1000 at a time.
			try {
				let found = [];
				let listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
				listUsersResult.users.forEach((userRecord) => {
					// check if the display name or email matches the query
					const displayNameTest = regex.test(userRecord.displayName);
					const emailTest = regex.test(userRecord.email);
					if (displayNameTest || emailTest)
						found.push({
							displayName: userRecord.displayName,
							email: userRecord.email,
							photoURL: userRecord.photoURL
						});
					if (users.length + found.length > (parseInt(process.env.MAX_USERS_RESULT) || 10))
						resolve(users.concat(found));
				});
				if (listUsersResult.pageToken) {
					listAllUsers(listUsersResult.pageToken, users.concat(found));
				} else {
					resolve(users);
				}
			} catch (e) {
				console.log(e);
				reject(e);
			}
		};
		// Start listing users from the beginning, 1000 at a time.
		listAllUsers();
	});
};

module.exports = { authIDToken, getUserByEmail, queryUsers };
