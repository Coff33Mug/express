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
    console.log("New person connected");
    clientCount++;
    socket.emit('message', 'New person connected');
    
    io.emit('updateClientCount', clientCount);

    // Response for client disconnect
    socket.on('disconnect', () => {
        socket.emit('message', 'A person disconnected');
        clientCount--;
        io.emit('updateClientCount', clientCount);
    });

    // Emits results to all online clients
    socket.on('rollDice', results => {
        console.log(results);
        console.log(rooms);
        io.emit('diceResult', results);
    });

    // Puts client connection into a room
    socket.on('joinRoom', ({username, roomName}) => {
        // Checks for the existence of the room, the if statement
        // checks to see if there was a found room
        // I believe itll act as an object
        let room = rooms.find(r => r.name === roomName);
        if (room) {
            console.log("attempting to join room");
            room.clients.push(username);
            socket.join(roomName);
            socket.emit('redirectToPage', '/test.html');
            socket.emit('updateClientUsernameAndRoom', {username: username, roomName: roomName});
        }
    });

    // Sends room list to client
    socket.on('getRoomList', () => {
        socket.emit('currentRoomList', rooms);
        console.log("Sent rooms to client side");
    });
    
    // Adds a room to the array of rooms
    socket.on('addRoom', roomName => {
        const room = {
            name: roomName,
            clients: []
        }
        rooms.push(room);
        console.log("Room Added");
    });
});

