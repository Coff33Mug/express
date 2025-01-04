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
    // console.log("New person connected");
    // io.emit('message', 'New person connected'); // Sent to main.js

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
            socket.emit('updatedInformation', ({username: tempUsername, roomName: tempRoomName, onlineUsers: onlineUsers}));
            io.emit('updateClientCount', ({roomName: tempRoomName, onlineUsers})); // Sent to main.js
        } else {
            console.log("Room not found");
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
            console.log("Room not found");
        }
    });

    socket.on('removeUser', ({username, roomName}) => {
        console.log("Attempting to remove user");
        const room = rooms.find(r => r.name === roomName);
        
        // if room doesn't exist, throw an error
        if(room) {
            room.clients = room.clients.filter(client => client !== username);
            io.emit('updateClientCount', room.clients.length);
            console.log(`${username} was removed from ${roomName}`);
        } else {
            console.log("Can't find room to remove client");
        }
    });

    // Emits results to all online clients
    socket.on('rollDice', results => {
        console.log(results);
        console.log(rooms);
        io.emit('diceResult', results); // Sent to main.js
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
            socket.join(roomName);
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
            clients: []
        }
        rooms.push(room);
        console.log(`The room ${roomName} was added`);
    });

    // socket.on('removeUser', ({username, roomName}) => {
    //     console.log("Attempting to remove user");
    //     const room = rooms.find(r => r.name === roomName);
        
    //     // if room doesn't exist, throw an error
    //     if(room) {
    //         room.clients = room.clients.filter(client => client !== username);
    //         io.emit('updateClientCount', room.clients.length);
    //         console.log(`${username} was removed from ${roomName}`);
    //     } else {
    //         console.log("Can't find room to remove client");
    //     }
    // });
});

