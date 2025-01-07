import instance from "./socketManager.js";
const socket = instance;

// images
const images = [
    "../cat kaboom.gif",
    "../cat.gif", 
];

// Value that iterates through images
let index = 0;

// Events that respond to server emits
// Redirects user to game page.
socket.on('redirectToPage', url => {
    window.location.href = url;
});

socket.on('message', message => {
    console.log(message);
});

// Change Cat Button 
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

// Confirm Button
document.getElementById('confirmButton').addEventListener('click', function() {
    const username = document.getElementById('usernameInput').value;
    const roomName = document.getElementById('roomInput').value;

    if (!username || !roomName) {
        console.log("bro did not put username or room name");
        return;
    }
    
    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.on('currentRoomList', newRoomList => {
        const room = newRoomList.find(room => room.name === roomName);
        // Checks if room exist
        if (roomName != "" && room && !(room.clients.includes(username))) {
            socket.emit('joinRoom', {username: username, roomName: roomName});
        } else {
            console.log("Room does not exist or username in use");
        }
    });

});

// Create Room button
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('roomInput').value;
    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.on('currentRoomList', newRoomList => {
        // Adds the room given that it doesn't exist
        if (roomName != "" && !(newRoomList.find(room => room.name.includes(roomName)))) {
            socket.emit('addRoom', roomName);
            console.log("Room Created");
        }
    });
});