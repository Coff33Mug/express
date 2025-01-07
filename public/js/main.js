import instance from "./socketManager.js";


const socket = instance;
// const socket = io("http://localhost:3000/");
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
let currentRoomName;
let currentUsername;
let updatedPlayer = false;
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
    const navigationType = performance.getEntriesByType("navigation")[0].type;
    if (navigationType === 'reload') {
        window.location.href = '/test2.html';
    }
});

window.addEventListener('unload', () => {
    console.log(`${currentUsername} is disconnecting`);
    socket.emit('removeUser', ({username: currentUsername, roomName: currentRoomName}));
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
});

socket.on('updatedInformation', ({username, roomName, onlineUsers, player}) => {
    currentUsername = username;
    currentRoomName = roomName;
    this.player = player;
    clientCountParagraph.innerText = "Current online users: " + onlineUsers;
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
});

/*  Below is responses specifically for updating client side information.

*/
socket.on('updateClientCount', ({roomName, onlineUsers}) => {
    if (roomName === currentRoomName) {
        clientCountParagraph.innerText = "Current online users: " + onlineUsers;
    }
});

socket.on('updatedPlayer', ({player}) => {
    currentPlayer = player;
    // Are you the person that should be playing?
    if (currentUsername === player) {
        let sum = 0;
        let result = [];
        for (let i = 1; i <= 6; i++) {
            let dice = Math.floor((Math.random() * 6) + 1);
            document.getElementById(`dice${i}`).innerText = dice;
            result.push(dice);
            sum += dice;
        }
        socket.emit('rollDice', {roomName: currentRoomName, result});
    }
});

socket.on('message', message => {
    console.log(message);
});

socket.on('diceResult', ({roomName, result}) => {
    if (currentRoomName === roomName) {
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`dice${i}`).innerText = result[i-1];
        }
        console.log("Got dice results");
    }
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

// Dice rolling element
document.getElementById('rollDiceButton').addEventListener('click', function () {
    socket.emit('getPlayer', {roomName: currentRoomName});
});




