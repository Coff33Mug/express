const socket = io("https://fill-or-bust.vercel.app/");

let connection = null;
class socketManager {
    constructor() {
        if (!connection) {
            connection = socket;
        }
        return connection; // Return the existing instance
    }

    getSocket() {
        return connection;
    }
}

const instance = new socketManager();

export default instance;