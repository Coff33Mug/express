import instance from "./socketManager.js";


const socket = instance;
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
const gameInformationVBox = document.getElementById('gameInformationVBox');
const turnInformation = document.getElementById('turnDisplayParagraph');
const keepDiceArray = new Array(6).fill(false);
let currentRoom;
let currentRoomName;
let currentUsername;
let currentPlayer;
let firstTurn = true;
let prevResult = new Array(6).fill(0);

// Events that respond to server emits

/*  The two events below fire off upon connection and disconnection via browser closing
On connection, request room information from the server. On disconnect, request to remove
the user and update the amount of clients online. On reload, redirect the user to the lobby
*/
socket.on('connect', () => {
    socket.emit('requestAllInformation');
});

window.addEventListener('load', () => {
    // Checks for if the user reloaded webpage
    const navigationType = performance.getEntriesByType("navigation")[0].type;
    if (navigationType === 'reload') {
        window.location.href = '/lobby.html';
    }
});

window.addEventListener('unload', () => {
    console.log(`${currentUsername} is disconnecting`);
    socket.emit('removeUser', ({username: currentUsername, roomName: currentRoomName}));
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
    socket.emit('updateGameInformation', ({roomName: currentRoomName}));
});

/* Request from server to update all client side information. 
This includes information about the game to other clients in the room
*/ 
socket.on('updatedInformation', ({room, username}) => {
    currentUsername = username;
    currentRoomName = room.name;
    currentPlayer = room.turnNumber;
    currentRoom = room;
    clientCountParagraph.innerText = "Current online users: " + room.clients.length;
    socket.emit('updateGameInformation', ({roomName: currentRoomName}));
});

// Recieved from server
socket.on('updateGameInformation', ({room}) => {
    if (room.name === currentRoomName) {
        updateAllGameInformation(room);
    }
});

/*  Below is responses specifically for updating client side information.

*/
socket.on('updateClientCount', ({roomName, onlineUsers}) => {
    if (roomName === currentRoomName) {
        clientCountParagraph.innerText = "Current online users: " + onlineUsers;
    }
});

/*  Recieved by every client in a room to update both the dice 
alongside clientside game info
*/
socket.on('updateClientDice', ({room, result}) => {
    if (currentRoomName === room.name) {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`dice${i}`).innerText = result[i-1];
        }
        console.log("Got dice results and possible points");
        updateAllGameInformation(room);
    }
});

socket.on('message', message => {
    console.log(message);
});

socket.on('joinedRoom', username => {
    console.log(username + " has joined.");
});


// Events that send emits to server
// Change cat button
let index = 0;
const images = [
    "../cat kaboom.gif",
    "../cat.gif", 
];

document.getElementById('changeCatButton').addEventListener('click', function() {
    console.log("button pressed");
    if (index < images.length - 1) {
        document.getElementById('catImage').src = images[index]; 
        index++;
    } else {
        document.getElementById('catImage').src = images[index];
        index = 0;
    }
});

// Leave room button
document.getElementById('leaveRoomButton').addEventListener('click', function () {
    window.location.href = '/lobby.html';
});

// Dice rolling element
document.getElementById('rollDiceButton').addEventListener('click', function () {
    socket.emit('getPlayer', {roomName: currentRoomName});
});

/*  Socket event that recieves the player from the server, checks if you're the player,
    then updates dice based on what is kept and sends the results to the server 
    to broadcast to everyone in the room.
*/
socket.on('canYouPlay', ({player}) => {
    // Are you the person that should be playing?
    if (currentUsername !== player) {
        return;
    }
    
    let result = [];
    let resultForPoints = [];
    // If it's the player's first turn, roll all the dice.
    if (firstTurn === true) {
        currentPlayer = player;
        for (let i = 1; i <= 6; i++) {
            let dice = Math.floor((Math.random() * 6) + 1);
            document.getElementById(`dice${i}`).innerText = dice;
            result.push(dice);
            resultForPoints.push(dice);
        }
        prevResult = result;
        firstTurn = false;
    } else {
        resultForPoints = [];
        currentPlayer = player;
        result = prevResult;
        for (let i = 0; i <= 5; i++) {
            if (keepDiceArray[i] === false) {
                let dice = Math.floor((Math.random() * 6) + 1);
                document.getElementById(`dice${i+1}`).innerText = dice;
                result[i] = dice;
                resultForPoints.push(dice);
            }
        }
        prevResult = result;
    }
    
    socket.emit('rollDice', {
        username: currentUsername, 
        roomName: currentRoomName, 
        result, 
        resultForPoints});
});

document.getElementById('keepHandButton').addEventListener('click', function () {
    socket.emit('keepHand', {username: currentUsername, roomName: currentRoomName});
});

/*  Event listener for the buttons that allow you to keep dice.
Will only allow you to keep dice if it's not your first roll
*/
for (let i = 0; i <= 5; i++) {
    const keepButton = document.getElementById(`keepDiceButton${i+1}`);
    keepButton.addEventListener('click', function () {
        if (firstTurn === true) {
            return;
        }
        
        if(keepDiceArray[i] === false) {
            keepDiceArray[i] = true;
            keepButton.style.backgroundColor = '#FFCCCB';
        } else {
            keepDiceArray[i] = false;
            keepButton.style.backgroundColor = 'LightGray';
        }
    });
}

function updateAllGameInformation(room) {
    gameInformationVBox.innerHTML = '';
    for (let i = 0; i < room.clients.length; i++) {
        const paragraph = document.createElement('p');
        paragraph.id = "player" + i;
        paragraph.textContent = room.clients[i] + "'s points: " + room.points[i];
        gameInformationVBox.appendChild(paragraph);
    }
    turnInformation.textContent = `${room.clients[room.turnNumber]}'s turn`;
}




