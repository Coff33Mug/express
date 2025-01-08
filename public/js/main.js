import instance from "./socketManager.js";


const socket = instance;
// const socket = io("http://localhost:3000/");
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
const gameInformationVBox = document.getElementById('gameInformationVBox');
let currentRoom;
let currentRoomName;
let currentUsername;
let currentPlayer;

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
        window.location.href = '/test2.html';
    }
});

window.addEventListener('unload', () => {
    console.log(`${currentUsername} is disconnecting`);
    socket.emit('removeUser', ({username: currentUsername, roomName: currentRoomName}));
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
    socket.emit('updateGameInfomation', ({roomName: currentRoomName}));
});

socket.on('updatedInformation', ({room, username}) => {
    currentUsername = username;
    currentRoomName = room.name;
    currentPlayer = room.turnNumber;
    currentRoom = room;
    clientCountParagraph.innerText = "Current online users: " + room.clients.length;
    socket.emit('updateGameInfomation', ({roomName: currentRoomName}));
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

socket.on('canYouPlay', ({player}) => {
    // Are you the person that should be playing?
    if (currentUsername === player) {
        let result = [];
        for (let i = 1; i <= 6; i++) {
            let dice = Math.floor((Math.random() * 6) + 1);
            document.getElementById(`dice${i}`).innerText = dice;
            result.push(dice);
        }
        socket.emit('rollDice', {username: currentUsername, roomName: currentRoomName, result});
    }
});

socket.on('updateClientDice', ({room, result}) => {
    if (currentRoomName === room.name) {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`dice${i}`).innerText = result[i-1];
        }
        console.log("Got dice results");
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
    window.location.href = '/test2.html';
});

// Dice rolling element
document.getElementById('rollDiceButton').addEventListener('click', function () {
    socket.emit('getPlayer', {roomName: currentRoomName});
});

function updateAllGameInformation(room) {
    gameInformationVBox.innerHTML = '';
    for (let i = 0; i < room.clients.length; i++) {
        const paragraph = document.createElement('p');
        paragraph.id = "player" + i;
        paragraph.textContent = room.clients[i] + "'s points: " + room.points[i];
        gameInformationVBox.appendChild(paragraph);
    }
}




