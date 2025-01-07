// Requirements for Express
const express = require('express');
const path = require('path');
const app = express();
// Check for enviornment port or default to port 3000
const port = 3000 || process.env.port;
// Requirements for Socket.io 
const socketio = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const io = socketio(server);

// Makes public folder the static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// Website variables
let clientCount = 0;
// Consider making this an object
let tempUsername = "ahhh";
let tempRoomName = "awesomeRoomName";
let rooms = [];

// Server side connection sending html files
app.get('/', function(req, res, next) {
    res.redirect('/test2.html');
});

// Responses to links for HTML files
app.get('/test.html', function(req, res, next) { // Path name (...public/html/test.html)
    res.sendFile(path.join(__dirname, 'public', 'html/test.html'));
});

app.get('/test2.html', function(req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'html/test2.html'));
});

// Server's connection to port
server.listen(port, () => {
    console.log(`Connection for port ${port} successful`);
}); 

// Client side events
io.on('connection', socket => {
    // Response for client disconnect
    socket.on('disconnect', () => {
        io.emit('message', 'A person disconnected');
    });

    /* // Game events
        This request comes from main.js after a person joins a room through the 
        confirm button. This sends information that is given through button events
        to main.js to manage the room.
    */
    socket.on('requestAllInformation', () => {
        const room = rooms.find(r => r.name === tempRoomName);
        if (room) {
            const onlineUsers = room.clients.length;
            let player = room.clients[room.turnNumber];
            socket.emit('updatedInformation', ({username: tempUsername, roomName: tempRoomName, onlineUsers: onlineUsers, player}));
            io.emit('updateClientCount', ({roomName: tempRoomName, onlineUsers})); // Sent to main.js
        } else {
            // Still runs when the last person in the room leaves
            console.log("Room not found in requestAllInformation");
        }
    });

    socket.on('getPlayer', ({roomName}) => {
        let room = rooms.find(r => r.name === roomName);
        if (room) {
            let player = room.clients[room.turnNumber];
            socket.emit('updatedPlayer', ({player}));
        }
    });

    /*
        This request comes from main.js after a person leaves. requestAllInformation... should
        update the total amount of users online for the client when someone joins.
    */
    socket.on('updateRoomClientCount', ({roomName}) => {
        const room = rooms.find(r => r.name === roomName);
        if (room) {
            const onlineUsers = room.clients.length;
            io.emit('updateClientCount', ({roomName, onlineUsers})); // Sent to main.js
        } else {
            console.log("Room not found in updateRoomClientCount");
        }
    });

    // Emits results to all online clients
    socket.on('rollDice', ({roomName, result}) => {
        console.log(result);
        console.log(rooms);
        let room = rooms.find(r => r.name === roomName);
        if (room) {
            room.turnNumber++;
            room.turnNumber = room.turnNumber % room.clients.length;
            io.emit('diceResult', ({roomName, result})); // Sent to main.js
        } else {
            console.log("Room not found in rollDice");
        }
    });

    // Room Events
    /*
        This request comes from buttonEvents.js
        Puts client connection into a room, for some reason, emits to anything in
        main.js does not work. So any request for main.js must come from main.js
    */
    socket.on('joinRoom', ({username, roomName}) => {
        // Checks for the existence of the room, the if statement
        // checks to see if there was a found room
        let room = rooms.find(r => r.name === roomName);
        if (room) {
            console.log("attempting to join room");
            room.clients.push(username);
            socket.join(roomName)
            tempRoomName = roomName;
            tempUsername = username;
            // console.log(tempRoomName + " " + tempUsername);  // working properly
            socket.emit('redirectToPage', '/test.html'); // Sent to buttonEvents.js
        }
    });

    // Sends room list to client
    socket.on('getRoomList', () => {
        socket.emit('currentRoomList', rooms); // Sent to buttonEvents.js
    });
    
    // Adds a room to the array of rooms
    socket.on('addRoom', roomName => {
        const room = {
            name: roomName,
            clients: [],
            turnNumber: 0
        }
        rooms.push(room);
        console.log(`The room ${roomName} was added`);
    });

    socket.on('removeUser', ({username, roomName}) => {
        const room = rooms.find(r => r.name === roomName);
        
        // if room doesn't exist, throw an error
        if (!room) {
            console.log("Can't find room to remove client");
            return;
        }
        
        // Removes user from room
        room.clients = room.clients.filter(client => client !== username);
        io.emit('updateClientCount', room.clients.length);
        console.log(`${username} was removed from ${roomName}`);
        
        // If the room has nobody in it, delete the room.
        if (room.clients.length === 0) {
            const index = rooms.findIndex(room => room.name === roomName);
            if (index !== -1) {
                rooms.splice(index, 1);
            }
        }
    });

});

