const socket = io();
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');

// Events that respond to server emits
socket.on('message', message => {
    console.log(message);

});

socket.on('updateClientCount', clientCount => {
    clientCountParagraph.innerText = "Current online users: " + clientCount;
});

socket.on('diceResult', results => {
    document.getElementById('dice1').innerText = results[0];
    document.getElementById('dice2').innerText = results[1];
    console.log("Got dice results");
});

// Events that send emits to server
// Dice rolling element
document.getElementById('rollDice').addEventListener('click', function () {
    let sum = 0;
    let dice1 = Math.floor((Math.random() * 6) + 1);
    document.getElementById('dice1').innerText = dice1;
    sum += dice1;

    let dice2 = Math.floor((Math.random() * 6) + 1);
    document.getElementById('dice2').innerText = dice2;
    sum += dice2;
    const result = [dice1, dice2];
    socket.emit('rollDice', result);
});




