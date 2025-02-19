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

app.get('/localGame.html', function(req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'html/localGame.html'));
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
    This request comes from game.js after a person joins a room through the 
    confirm button. This sends information that is given through button events
    to game.js to manage the room. 
    
    Recent changes makes the socket join the room. This allows for emit functionality.
    */
    socket.on('requestAllInformation', () => {
        const room = rooms.find(r => r.name === tempRoomName);
        if (room) {
            const onlineUsers = room.clients.length;
            socket.join(tempRoomName);
            socket.emit('updatedInformation', ({room: room, username: tempUsername}));
            io.to(tempRoomName).emit('updateClientCount', ({onlineUsers})); // Sent to game.js
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
    This request comes from game.js after a person leaves. requestAllInformation... should
    update the total amount of users online for the client when someone joins.
    */
    socket.on('updateRoomClientCount', ({roomName}) => {
        const room = rooms.find(r => r.name === roomName);
        if (room) {
            const onlineUsers = room.clients.length;
            io.to(roomName).emit('updateClientCount', ({onlineUsers})); // Sent to game.js
        } else {
            console.log("Room not found in updateRoomClientCount");
        }
    });
    
    socket.on('updateGameInformation', ({roomName}) => {
        const room = rooms.find(r => r.name === roomName);
        if (room) {
            io.to(roomName).emit('updateGameInformation', ({room})); // Sent to game.js
        } else {
            console.log("Room not found in updateGameInformation");
        }
    });
    
    /*  Takes in all the rolled dice, split into three different arrays:
    Result: The 6 dice emitted to all clients
    keptDice: Dice kept by the client
    
    */
    socket.on('rollDice', ({username, roomName, event, result, keptDice, resultForPoints}) => {
        console.log(result);
        let room = rooms.find(r => r.name === roomName);
        
        if (!room) {
            console.log("Room not found in rollDice");
        }

        let points;
        let keptPoints;
        
        switch (event) {
            case ">=500": {
                points = calculatePointsEventBased(resultForPoints).points;
                keptPoints = calculatePointsEventBased(keptDice).points;
            }

            case "allOrNothing": {
                points = calculatePointsEventBased(resultForPoints).points;
                keptPoints = calculatePointsEventBased(keptDice).points;
            }

            default: {
                points = calculatePoints(resultForPoints).points;
                keptPoints = calculatePoints(keptDice).points;
            }
        }

        const userIndex = room.clients.indexOf(username);
        
        // Give up your turn if you bust
        if (points === 0) {
            room.turnNumber++;
            room.turnNumber = room.turnNumber % room.clients.length;
            room.possiblePoints[userIndex] = 0;
            socket.emit('enableKeepDiceButtons');
            io.to(roomName).emit('resetSpecialEventGeneral');
        }
        
        // Sets points for player
        room.possiblePoints[userIndex] = points;
        room.possiblePoints[userIndex] += keptPoints;
        
        io.to(roomName).emit('updateClientDice', ({room, result})); // Sent to game.js
    });
    
    /*  When Keep hand is recieved, update point values for player
    and update every user's event view
    */
    socket.on('keepHand', ({username, roomName, result, Event}) => {
        let room = rooms.find(r => r.name === roomName);
        if (!room) {
            console.log("Room not found in keepHand");
        }

        const userIndex = room.clients.indexOf(username);
        switch (Event) {
            case ">=500": {
                const handFilled = calculatePointsEventBased(result).handFilled;
                if (handFilled === true && room.possiblePoints[userIndex] >= 500) {
                    // Sets points for the player and gives 500 bonus points
                    room.points[userIndex] += room.possiblePoints[userIndex];
                    room.points[userIndex] += 500;
                    room.possiblePoints[userIndex] = 0;
                    
                } else {
                    // Sets points for the player normally given you didn't fill your hand
                    room.points[userIndex] += room.possiblePoints[userIndex];
                    room.possiblePoints[userIndex] = 0;
                    console.log("Bonus points not given");
                }

                // Updates turn and re-enable buttons on player
                room.turnNumber++;
                room.turnNumber = room.turnNumber % room.clients.length;
                io.to(roomName).emit('resetSpecialEvent', (Event));
                break;
            }

            case "retribution": {
                // Gives player their points before checking if they filled their hand.
                room.points[userIndex] += room.possiblePoints[userIndex];
                room.possiblePoints[userIndex] = 0;

                const handFilled = calculatePointsEventBased(result).handFilled;
                // Nothing happens if hand isn't filled.
                if (handFilled !== true) {
                    break;
                }
                
                let largest = 0;
                let retributionUserIndex;
                let users = [];
                /*  Goes through every player to find who has the most points.
                    Given the case that multiple players have the same amount of points,
                    they are added to the users array. All players that have the same amount of points
                    lose 3000 points.
                */  
                for (let i = 0; i < room.clients.length; i++) {
                    if (room.points[i] === 0) {
                        continue;
                    }

                    if (room.points[i] > largest && username !== room.clients[i]) {
                        largest = room.points[i];
                        retributionUserIndex = i;
                        users[0] = i;
                    } else if (room.points[i] === largest && username !== room.clients[i]) {
                        users.push(i);
                    }
                }

                if (users.length === 1) {
                    room.points[retributionUserIndex] -= 3000;
                } else {
                    for (let i = 0; i < users.length; i++) {
                        room.points[users[i]] -= 3000;
                    }
                }

                // Updates turn and re-enable buttons on player
                room.turnNumber++;
                room.turnNumber = room.turnNumber % room.clients.length;
                io.to(roomName).emit('resetSpecialEvent', (Event));
                break;
            }

            case "allOrNothing": {
                const handFilled = calculatePointsEventBased(result).handFilled;

                // If their hand is not filled, they don't get points.
                if (handFilled !== true) {
                    break;
                }

                room.points[userIndex] += room.possiblePoints[userIndex];
                room.possiblePoints[userIndex] = 0;
                break;
            }

            default: {
                // Sets points for the player
                room.points[userIndex] += room.possiblePoints[userIndex];
                room.possiblePoints[userIndex] = 0;

                // Updates turn and re-enable buttons on player
                room.turnNumber++;
                room.turnNumber = room.turnNumber % room.clients.length;
                io.to(roomName).emit('resetSpecialEventGeneral');
            }
        }
        
        // // Updates turn and re-enable buttons on player
        // room.turnNumber++;
        // room.turnNumber = room.turnNumber % room.clients.length;
        socket.emit('enableKeepDiceButtons');
        io.to(roomName).emit('updateGameInformation', ({room})); // Sent to game.js
    });
    
    // Sends out the event type to all users of a room
    socket.on('newSpecialEvent', ({roomName, Event}) => {
        switch (Event) {
            case "extraDice": {
                let dice = Math.floor((Math.random() * 6) + 1);
                
                io.to(roomName).emit('eventExtraDice', ({dice}));
                break;
            }
            
            case "skipTurn": {
                let room = rooms.find(r => r.name === roomName);
                
                if (!room) {
                    console.log("Room not found in newSpecialEvent");
                }
                
                room.turnNumber++;
                room.turnNumber = room.turnNumber % room.clients.length;
                
                io.to(roomName).emit('eventSkipTurn', ({player: room.clients[room.turnNumber]}));
                break;
            }

            case ">=500": {
                io.to(roomName).emit('event>=500');
                break;
            }

            case "retribution": {
                io.to(roomName).emit('eventRetribution');
                break;
            }

            case "allOrNothing": {
                io.to(roomName).emit('eventAllOrNothing');
                break;
            }
        }
    });
    
    // This doesn't seem optimized
    function calculatePoints(result) {
        let points = 0
        let handFilled = true;
        
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
        
        /*  The reason why we check for ones first is because we assume you don't want to add
        a one to a four dice for lower points.
        */
        
        points += frequencyOfNumber[0] * 100;
        frequencyOfNumber[0] = 0;
        
        // Dice adding
        while (frequencyOfNumber[0] >= 1 && frequencyOfNumber[3] >= 1) {
            points += 50;
            frequencyOfNumber[0]--, frequencyOfNumber[3]--;
        }
        
        while(frequencyOfNumber[1] >= 1 && frequencyOfNumber[2] >= 1) {
            points += 50;
            frequencyOfNumber[1]--, frequencyOfNumber[2]--;
        }
        
        // Adds any remaining points for 5s
        points += frequencyOfNumber[4] * 50;
        
        /*  If there are any remaining dice that weren't used towards point calculations,
        their hand was not filled. TODO: not working properly
        Issue with how points are calculated, 
        given we roll a 4 and a 1, 1 dice is eaten up in priority of 100 points over filling hand.
        */

        for (let i = 0; i < frequencyOfNumber.length; i++) {
            if (frequencyOfNumber[i] !== 0) {
                handFilled = false;
            }
        }
        
        const calculatedPoints = {
            points: points,
            handFilled: handFilled
        }
        
        return calculatedPoints;
    }
    
    /*  Calculates points with priority to adding based on event
        Ex. >=500 will always add dice in the case you get a 4 and a 1 where normally they would not 
        add as usually a player will take 100 over 50 points. In the case of an event where the player
        wants to fill, this function is used.
    */
    function calculatePointsEventBased(result) {
        let points = 0
        let handFilled = true;
        
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

        /*  Dice adding is priority given you need to fill your hand
            Dice adding has high priority because it prevents the event where
            the hand is filled in All Or Nothing but triple dice roll take away the
            dice that is being added.
            EX: [ 1, 4, 1, 2, 1, 3 ] where triple 1s are eaten
            and 4 has nothing to add to but locking keep button code thinks it's a fill 
        */  
        while (frequencyOfNumber[0] >= 1 && frequencyOfNumber[3] >= 1) {
            points += 50;
            frequencyOfNumber[0]--, frequencyOfNumber[3]--;
        }
        
        while(frequencyOfNumber[1] >= 1 && frequencyOfNumber[2] >= 1) {
            points += 50;
            frequencyOfNumber[1]--, frequencyOfNumber[2]--;
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

        // Add any remaining points for 1s
        points += frequencyOfNumber[0] * 100;
        frequencyOfNumber[0] = 0;
        // Adds any remaining points for 5s
        points += frequencyOfNumber[4] * 50;
        frequencyOfNumber[4] = 0;
        
        /*  If there are any remaining dice that weren't used towards point calculations,
        their hand was not filled. TODO: not working properly
        Issue with how points are calculated, 
        given we roll a 4 and a 1, 1 dice is eaten up in priority of 100 points over filling hand.
        */
        
        for (let i = 0; i < frequencyOfNumber.length; i++) {
            if (frequencyOfNumber[i] !== 0) {
                handFilled = false;
            }
        }
        
        const calculatedPoints = {
            points: points,
            handFilled: handFilled
        }
        
        return calculatedPoints;
    }
    
    // Room Events
    /*
    This request comes from lobby.js
    Puts client connection into a room, for some reason, emits to anything in
    game.js does not work. So any request for game.js must come from game.js
    */
    socket.on('joinRoom', ({username, roomName}) => {
        // Checks for the existence of the room, the if statement
        // checks to see if there was a found room
        let room = rooms.find(r => r.name === roomName);
        if (room) {
            room.clients.push(username);
            room.points.push(0);
            room.possiblePoints.push(0);
            tempRoomName = roomName;
            tempUsername = username;
            socket.emit('redirectToPage', '/game.html'); // Sent to lobby.js
        }
    });
    
    // Sends room list to client
    socket.on('getRoomList', () => {
        socket.emit('currentRoomList', rooms); // Sent to lobby.js
    });
    
    socket.on('refreshRooms', () => {
        socket.emit('refreshRooms', rooms); // Sent to lobby.js
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

