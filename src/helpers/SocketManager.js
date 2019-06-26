/*
module that handles connected web-sockets
and dispatching messages to session participants
*/

module.exports = class SocketManager {
	constructor() {
		this.socketDict = {};
		setInterval(() => {
			for (let key in this.socketDict) {
				if (!this.socketDict[key].isAlive) {
					this.socketDict[key].terminate();
					delete this.socketDict[key];
				}
				this.socketDict[key].ping(null, false, true);
			}
		}, 5000);
	}

	add(userEmail, socket) {
		this.socketDict[userEmail] = socket;
		this.socketDict[userEmail].isAlive = true;
		this.socketDict[userEmail].on('pong', () => {
			this.socketDict[userEmail].isAlive = true;
		})
        console.log(`adding ${userEmail} to the party`);
	}

	remove(userEmail) {
		this.socketDict[userEmail].terminate();
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
