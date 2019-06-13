/*
module that handles connected web-sockets
and dispatching messages to session participants
*/

module.exports = class SocketManager {
	constructor() {
		this.socketDict = {};
	}

	add(userEmail, socket) {
        this.socketDict[userEmail] = socket;
        console.log(`adding ${userEmail} to the party`);
	}

	remove(userEmail) {
        delete this.socketDict[userEmail];
        console.log(`removing ${userEmail} from the party`);
	}

	notify(users) {
		for (let user of users) {
			if (user.email in this.socketDict) {
                this.socketDict[user.email].send(JSON.stringify({ type: 'fetch' }));
                console.log('notifying', user.email);
			}
		}
    }
    toString() {
        return `${Object.keys(this.socketDict)}`;
    }
};
