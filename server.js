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
    res.redirect('/lobby.html');
});

// Responses to links for HTML files
app.get('/game.html', function(req, res, next) { // Path name (...public/html/test.html)
    res.sendFile(path.join(__dirname, 'public', 'html/game.html'));
});

app.get('/lobby.html', function(req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'html/lobby.html'));
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
    
    socket.on('forceDisconnect', () => {
        socket.disconnect();
        console.log("force disconnect done");
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
            socket.emit('updatedInformation', ({room: room, username: tempUsername}));
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
            socket.emit('canYouPlay', ({player}));
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
    
    socket.on('updateGameInformation', ({roomName}) => {
        const room = rooms.find(r => r.name === roomName);
        if (room) {
            io.emit('updateGameInformation', ({room})); // Sent to main.js
        } else {
            console.log("Room not found in updateGameInformation");
        }
    });
    
    // Emits results to all online clients
    socket.on('rollDice', ({username, roomName, result, keptDice, resultForPoints}) => {
        console.log(result);
        console.log(rooms);
        let room = rooms.find(r => r.name === roomName);
        
        if (!room) {
            console.log("Room not found in rollDice");
        }
        
        const userIndex = room.clients.indexOf(username);
        let points = calculatePoints(resultForPoints);
        let keptPoints = calculatePoints(keptDice);
        
        // Give up your turn if you bust
        if (points === 0) {
            room.turnNumber++;
            room.turnNumber = room.turnNumber % room.clients.length;
            room.possiblePoints[userIndex] = 0;
        }
        
        // TODO: Issue with rerolling, kept dice not counting
        room.possiblePoints[userIndex] = points;
        room.possiblePoints[userIndex] += keptPoints;
        
        io.emit('updateClientDice', ({room, result})); // Sent to main.js
    });
    
    socket.on('keepHand', ({username, roomName}) => {
        console.log(rooms);
        let room = rooms.find(r => r.name === roomName);
        if (!room) {
            console.log("Room not found in keepHand");
        }
        
        // Sets points for the player
        const userIndex = room.clients.indexOf(username);
        room.points[userIndex] += room.possiblePoints[userIndex];
        room.possiblePoints[userIndex] = 0;
        // Updates turn
        room.turnNumber++;
        room.turnNumber = room.turnNumber % room.clients.length;
        socket.emit('enableKeepDiceButtons');
        io.emit('updateGameInformation', ({room})); // Sent to main.js
    });
    
    function calculatePoints(result) {
        let points = 0
        
        // Creates an array of the amount of times a roll appears
        const frequencyOfNumber = new Array(6).fill(0);
        for (let i = 0; i < result.length; i++) {
            frequencyOfNumber[result[i]-1]++;
        }

        // Checks for instance of 6 of a kind
        for (let i = 0; i < 6; i++) {
            if (frequencyOfNumber[i] === 6) {
                // If you get six 1's, 5000 points!
                if (i === 0) {
                    points += 5000;
                } else {
                // If you got six x's, you get x * 500 points!
                    points += (i+1) * 500;
                }
                frequencyOfNumber[i] -= 6;
            }
        }

        // Checks for instances of triplet dice roll
        for (let i = 0; i < 6; i++) {
            if (frequencyOfNumber[i] >= 3) {
                // If you got triple ones, 1000 points!
                if (i === 0) {
                    points += 1000;
                } else {
                // If you got triple x's, you get x * 100 points!
                    points += (i+1) * 100;
                }
                frequencyOfNumber[i] -= 3;
            }
        }
        
        // Checks for a straight
        if (frequencyOfNumber.every(num => num === 1)) {
            points += 1500;
            
            for (let i = 0; i < 6; i++) {
                frequencyOfNumber[i]--;
            }
        }
        
        /*
        TODO: remember to add dice adding
        */
        
        // Adds any remaining points for 1s and 5s
        points += frequencyOfNumber[0] * 100;
        points += frequencyOfNumber[4] * 50;
        
        return points;
    }
    
    function checkForBust(result) {
        if (!result.includes(1) && !result.includes(5)) {
            return true;
        } else {
            return false;
        }
    }
    
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
            room.clients.push(username);
            room.points.push(0);
            room.possiblePoints.push(0);
            socket.join(roomName)
            tempRoomName = roomName;
            tempUsername = username;
            // console.log(tempRoomName + " " + tempUsername);  // working properly
            socket.emit('redirectToPage', '/game.html'); // Sent to buttonEvents.js
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
            points: [],
            possiblePoints: [],
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
        
        const userIndex = room.clients.indexOf(username);
        // Removes user from room
        room.clients = room.clients.filter(client => client !== username);
        room.points.splice(userIndex, 1);
        room.possiblePoints.splice(userIndex, 1);
        
        /* Updates turn number to prevent turn softlock
        Ex. It is p2's turn and they leave, nobody can roll now.
        
        Did they have turn? 
        Yes -> 
        turn # = 0 
        No -> Were they behind the player who had the turn? 
        Yes -> turn # - 1 
        No -> do nothing 
        */
        if (userIndex === room.turnNumber) {
            // Basically sets turnNumber to 0
            room.turnNumber = room.turnNumber % room.clients.length;
        } else if (userIndex < room.turnNumber) {
            room.turnNumber--;
        }
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

