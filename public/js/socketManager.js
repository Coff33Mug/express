const socket = io("https://fill-or-bust-g21zrzms0-coff33mugs-projects.vercel.app/");

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