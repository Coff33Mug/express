import instance from "./socketManager.js";
const socket = instance;

// images
const images = [
    "../images/cat kaboom.gif",
    "../images/cat.gif", 
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

document.addEventListener('DOMContentLoaded', () => {
    socket.emit('refreshRooms');
});

// Confirm Button
const confirmButton = document.getElementById('confirmButton');
confirmButton.addEventListener('click', function() {
    confirmButton.disabled = true;
    setTimeout(() => confirmButton.disabled = false, 100);
    const username = document.getElementById('usernameInput').value;
    const roomName = document.getElementById('roomInput').value;

    if (!username || !roomName) {
        console.log("bro did not put username or room name");
        return;
    }
    
    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.once('currentRoomList', newRoomList => {
        const room = newRoomList.find(room => room.name === roomName);
        // Checks if room exist
        if (roomName != "" && room && !(room.clients.includes(username))) {
            socket.emit('joinRoom', {username: username, roomName: roomName});
            socket.emit('debugJoinRoom', ({roomName: roomName}));
        } else {
            console.log("Room does not exist or username in use");
        }
    });

});

// Create Room button
document.getElementById('createRoom').addEventListener('click', function() {
    const roomName = document.getElementById('roomInput').value;

    // TODO: Add error message to inform user
    if (roomName.length > 10) {
        return;
    }

    // Request to update room list on client side
    socket.emit('getRoomList');
    socket.once('currentRoomList', newRoomList => {
        // Adds the room given that it doesn't exist
        if (roomName != "" && !(newRoomList.find(room => room.name.includes(roomName)))) {
            socket.emit('addRoom', roomName);
            console.log("Room Created");
        }
    });
});


const refreshRoomsButton = document.getElementById('refreshRoomsButton');
refreshRoomsButton.addEventListener('click', function() {
    // Remove paragraphs not working.
    const roomDisplayBox = document.querySelector('.roomDisplayBox');
    const paragraphs = roomDisplayBox.querySelectorAll('p');

    paragraphs.forEach(paragraph => {
        roomDisplayBox.removeChild(paragraph);
    });

    socket.emit('refreshRooms');
});

socket.on('refreshRooms', rooms => {
    // Checks if rooms exist.
    if (rooms.length === 0) {
        const paragraph = document.createElement('p');
        paragraph.textContent = "No rooms currently online";
        roomDisplayBox.appendChild(paragraph);
    } else {
        for (let i = 0; i < rooms.length; i++) {
            const paragraph = document.createElement('p');
            paragraph.textContent = rooms[i].name + ": " + rooms[i].clients.length + " Online Users";
            roomDisplayBox.appendChild(paragraph);
        }
    }
});

