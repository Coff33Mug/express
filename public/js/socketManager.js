const socket = io("http://192.168.0.213:3000/");

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