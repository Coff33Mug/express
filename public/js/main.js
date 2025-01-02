import instance from "./socketManager.js";
import Room from "./room.js";

const socket = instance;
// const socket = io("http://localhost:3000/");
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
let currentRoom = new Room();


// Events that respond to server emits
socket.on('message', message => {
    console.log(message);
});

socket.on('updateClientCount', clientCount => {
    clientCountParagraph.innerText = "Current online users: " + clientCount;
});

socket.on('diceResult', resultsObject => {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`dice${i}`).innerText = resultsObject.result[i-1];
    }
    console.log("Got dice results");
});

socket.on('updateClientUsernameAndRoom', information => {
    currentRoom.addClient(information.username);
    currentRoom.updateName(information.roomName);
    console.log("Client Side information updated");
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




