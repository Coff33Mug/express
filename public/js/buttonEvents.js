import instance from "./socketManager.js";
import Room from "./room.js";
const socket = instance;

// images
const images = [
    "../cat kaboom.gif",
    "../cat.gif", 
];

// Value that iterates through images
let index = 0;
let currentRoom = new Room();

// Events that respond to server emits
// Redirects user to game page.
socket.on('redirectToPage', url => {
    window.location.href = url;
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
    
    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.on('currentRoomList', newRoomList => {
        // Checks if room exist
        // Look at conditional statements to see if it's getting from array properly
        if (roomName != "" && newRoomList.find(room => room.name === roomName)) {
            currentRoom.updateName(roomName);
            currentRoom.addClient(username);

            // Changed parameter to send an object
            // Emit below is not working.
            socket.emit('joinRoom', {username: username, roomName: roomName});
            console.log("Room Created");
        } else {
            console.log("Room does not exist");
        }
    });

});

// Create Room button
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('roomInput').value;
    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.on('currentRoomList', newRoomList => {
        // Adds the room
        if (roomName != "" && !(newRoomList.find(room => room.name.includes(roomName)))) {
            // let room = new Room(roomName);
            socket.emit('addRoom', roomName);
        }
    });
});