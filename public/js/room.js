class Room {
    constructor(name) {
        this.name = name;
        this.clients = [];
    }

    updateName(newName) {
        this.name = newName;
    }

    addClient(client) {
        this.clients.push(client);
    }    
    removeClient(client) {
        // Removes client name;
        this.clients = this.clients.filter(c => c !== client);
    }
    getClientCount() {
        return this.clients.length;
    }
    getName() {
        return this.name;
    }
}

export default Room;