import instance from "./socketManager.js";

const socket = instance;
// const socket = io("http://localhost:3000/");
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
let currentRoomName;
let currentUsername;

// Events that respond to server emits

/* 
    The two events below fire off upon connection and disconnection via browser closing
    On connection, request room information from the server. On disconnect, request to remove
    the user and update the amount of clients online.
*/
socket.on('connect', () => {
    socket.emit('requestAllInformation');
});

window.addEventListener('unload', () => {
    console.log(`${currentUsername} is disconnecting`);
    socket.emit('removeUser', ({username: currentUsername, roomName: currentRoomName}));
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
});

socket.on('updatedInformation', ({username, roomName, onlineUsers}) => {
    currentUsername = username;
    currentRoomName = roomName;
    clientCountParagraph.innerText = "Current online users: " + onlineUsers;
    socket.emit('updateRoomClientCount', ({roomName: currentRoomName}));
});


socket.on('updateClientCount', ({roomName, onlineUsers}) => {
    if (roomName === currentRoomName) {
        clientCountParagraph.innerText = "Current online users: " + onlineUsers;
    }
});

socket.on('message', message => {
    console.log(message);
});

socket.on('diceResult', resultsObject => {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`dice${i}`).innerText = resultsObject.result[i-1];
    }
    console.log("Got dice results");
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
document.getElementById('rollDice').addEventListener('click', function () {
    let sum = 0;
    let result = [];
    for (let i = 1; i <= 6; i++) {
        let dice = Math.floor((Math.random() * 6) + 1);
        document.getElementById(`dice${i}`).innerText = dice;
        result.push(dice);
        sum += dice;
    }

    socket.emit('rollDice', {result: result});
});




