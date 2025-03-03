import instance from "./socketManager.js";

const socket = instance;
const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
const gameInformationVBox = document.getElementById('gameInformationVBox');
const turnInformation = document.getElementById('turnDisplayParagraph');
const keepDiceArray = new Array(6).fill(false);
const specialEvents = ["extraDice", "skipTurn", ">=500", "retribution", "allOrNothing", "twoForTwo"];
let currentRoom;
let currentRoomName;
let currentUsername;
let currentPlayer;
let currentEvent;
let firstTurn = true;
let firstHandKeep = true;
let prevResult = new Array(6).fill(0);
let prevResultForEvent = new Array(6).fill(0);


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
    if (navigationType === 'reload' || navigationType === 'back_forward') {
        window.location.href = '/lobby.html';
    }
});

window.addEventListener('beforeunload', () => {
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
    currentPlayer = room.clients[room.turnNumber];
    currentRoom = room;
    clientCountParagraph.innerText = "Current online users: " + room.clients.length;
    socket.emit('updateGameInformation', ({roomName: currentRoomName}));
});

// Recieved from server
socket.on('updateGameInformation', ({room}) => {
    updateAllGameInformation(room);
});

/*  Below is responses specifically for updating client side information.

*/
socket.on('updateClientCount', ({onlineUsers}) => {
    clientCountParagraph.innerText = "Current online users: " + onlineUsers;
});

/*  Recieved by every client in a room to update both the dice 
alongside clientside game info
*/
socket.on('updateClientDice', ({room, result}) => {
    for (let i = 0; i <= 5; i++) {
        if (keepDiceArray[i] === false) {
            animateDice(result[i], i);
            document.getElementById(`dice${i+1}`).alt = result[i];
        }
    }
    updateAllGameInformation(room);
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
    "../images/cat kaboom.gif",
    "../images/cat.gif", 
];

document.getElementById('changeCatButton').addEventListener('click', function() {
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

// Dice rolling element. 
document.getElementById('rollDiceButton').addEventListener('click', function () {
    socket.emit('getPlayer', {roomName: currentRoomName});
});


const specialEventButton = document.getElementById('specialEventButton');
specialEventButton.addEventListener('click', function () {
    if (currentUsername !== currentPlayer) {
        return;
    }

    let randomNumber = Math.floor((Math.random() * 6));
    const Event = specialEvents[randomNumber];
    currentEvent = Event;
    specialEventButton.disabled = true;
    socket.emit('newSpecialEvent', {roomName: currentRoomName, Event});
});

/*  Below is the list of every possible special event and their responses.
*/

socket.on('eventExtraDice', ({dice}) => {
    // Changes Event title to tell user that they got extra dice, makes it visible, and 
    // changes extra dice value.
    document.getElementById('specialEventStrong').innerHTML = "Extra Dice!";
    document.getElementById('extraDiceBox').style.display = "flex";
    document.getElementById('dice7').alt = dice;
    animateDice(dice, 6);
});

socket.on('eventSkipTurn', ({player}) => {
    document.getElementById('specialEventStrong').innerHTML = "Lost your turn!";
    currentPlayer = player;
    resetDice();
    resetExtraDice();
    specialEventButton.disabled = false;
    turnInformation.textContent = `${player}'s turn`;
});

socket.on('event>=500', () => {
    document.getElementById('specialEventStrong').innerHTML = "Fill with over 500 for 500+ points!";
});

socket.on('eventRetribution', () => {
    document.getElementById('specialEventStrong').innerHTML = "Retribution!";
});

socket.on('eventAllOrNothing', () => {
    document.getElementById('specialEventStrong').innerHTML = "All or Nothing!";
});

socket.on('eventTwoForTwo', () => {
    document.getElementById('specialEventStrong').innerHTML = "Two for Two!";
});


/*  On top of resetting everything special event related, now resets the dice.
*/
socket.on('resetSpecialEvent', (Event) => {
    switch (Event) {
        case "extraDice": {
            let extraDice = document.getElementById('dice7');
            extraDice.alt = "";
            document.getElementById('extraDiceBox').style.display = "none";
            break;
        }

        default: {
            break;
        }
    }

    document.getElementById('specialEventStrong').innerHTML = "Special Event";
    resetDice();
    currentEvent = undefined;
    specialEventButton.disabled = false;
});

socket.on('resetSpecialEventGeneral' ,() => {
    document.getElementById('specialEventStrong').innerHTML = "Special Event";
    resetDice();
    currentEvent = undefined;
    specialEventButton.disabled = false;
});

/*  Socket event that recieves the player from the server, checks if you're the player,
    then updates dice based on what is kept and sends the results to the server 
    to broadcast to everyone in the room.

    Results is the dice that is shown to the client
    Previous results is to make sure the results sent to the server accounts for 
    any kept dice. Without it, the results sent would only contain the newly rolled dice.

    Kept dice is to calculate the points of what you previously had
    resultsForPoints is to calculate the new dice you just rolled
*/
socket.on('canYouPlay', ({player}) => {
    // Are you the person that should be playing?
    if (currentUsername !== player) {
        return;
    }

    let result = [];
    let keptDice = [];
    let resultForPoints = [];
    // If it's the player's first turn, roll all the dice.
    if (firstTurn === true) {
        currentPlayer = player;
        for (let i = 1; i <= 6; i++) {
            let dice = Math.floor((Math.random() * 6) + 1);
            document.getElementById(`dice${i}`).alt = dice;
            
            animateDice(dice, i-1);
            
            result.push(dice);
            resultForPoints.push(dice);
        }
        prevResult = result;
        firstTurn = false;
    } else {
        // If it isn't your first turn, check whatever hasn't been kept and reroll
        resultForPoints = [];
        currentPlayer = player;
        result = prevResult;
        for (let i = 0; i <= 5; i++) {
            if (keepDiceArray[i] === false) {
                // Results is the dice that is shown to the client
                let dice = Math.floor((Math.random() * 6) + 1);
                document.getElementById(`dice${i+1}`).alt = dice;
                animateDice(dice, i);
                result[i] = dice;
                resultForPoints.push(dice);
            } else{
                // Kept dice is to calculate the points of what you previously had
                keptDice.push(result[i]);
            }
        }

        prevResult = result;
        disableKeepDiceButtons(keepDiceArray);
    }

    // Events
    switch (currentEvent) {
        // Given extra dice event, add it to results.
        case "extraDice": {
            resultForPoints.push(Number(document.getElementById('dice7').alt));
            break;
        }

        /*  The purpose of this event case is to lock dice of value given
            the event All or Nothing
        */
        case "allOrNothing": {
            /*  Creates a frequency list of the rolls. */
            let frequencyOfNumber = new Array(6).fill(0);

            for (let i = 0; i < 6; i++) {
                frequencyOfNumber[document.getElementById(`dice${i+1}`).alt - 1]++;
            }


            // If there is 6 of a kind, lock everything and set frequency to 0.
            if (frequencyOfNumber.includes(6)) {
                for (let i = 0; i < 6; i++) {
                    keepDiceArray[i] = true;
                    const keepButton = document.getElementById(`keepDiceButton${i+1}`);
                    keepButton.style.backgroundColor = '#FFCCCB';
                    keepButton.disabled = true;
                }
                frequencyOfNumber[frequencyOfNumber.indexOf(6)] = 0;
            }

            // Locks every instance of dice adding. Specifically 1 + 4 and 2 + 3.
            while (frequencyOfNumber[0] >= 1 && frequencyOfNumber[3] >= 1) {
                lockKeepButtonForDice(1, 1);
                lockKeepButtonForDice(4, 1);
                frequencyOfNumber[0]--, frequencyOfNumber[3]--;
            }
            
            while (frequencyOfNumber[1] >= 1 && frequencyOfNumber[2] >= 1) {
                lockKeepButtonForDice(2, 1);
                lockKeepButtonForDice(3, 1);
                frequencyOfNumber[1]--, frequencyOfNumber[2]--;
            }

            // If a dice appears 3 times, lock them.
            for (let i = 0; i < frequencyOfNumber.length; i++) {
                if (frequencyOfNumber[i] >= 3) {
                    lockKeepButtonForDice(i+1, 3);
                    frequencyOfNumber[i] -= 3;
                }
            }

            // Lock every instance of 1 and 5.
            if (frequencyOfNumber[0] > 0) {
                lockKeepButtonForDice(1, frequencyOfNumber[0]);
                frequencyOfNumber[0] = 0;
            }

            if (frequencyOfNumber[4] > 0) {
                lockKeepButtonForDice(5, frequencyOfNumber[4]);
                frequencyOfNumber[0] = 0;
            }

            break;
        }
    }

    console.log(prevResultForEvent);
    console.log(prevResult);
    
    
    socket.emit('rollDice', {
        username: currentUsername, 
        roomName: currentRoomName,
        event: currentEvent, 
        result, 
        keptDice,
        resultForPoints});
});

/*  This function looks through every dice for a specific number and 
    locks that dice's keep button and locks the specific amount "Count" 
*/
function lockKeepButtonForDice(number, count) {
    let counter = 0;
    for (let i = 0; i < 6; i++) {
        /*  if the dice isn't already locked, is the right number, 
            and you haven't found the right amount, lock it.
        */

        let diceValue = parseInt(document.getElementById(`dice${i+1}`).alt);
        if (keepDiceArray[i] === false && diceValue === number && counter < count) {
            keepDiceArray[i] = true;
            const keepButton = document.getElementById(`keepDiceButton${i+1}`);
            keepButton.style.backgroundColor = '#FFCCCB';
            keepButton.disabled = true;
            counter++;
        }
    }
}
function animateDice(dice, index) {
    let delay = 15;
    let delayIncrement = 50;

    function switchDice() {
        if (delay < 400) {
            delay += delayIncrement;
            delayIncrement += 50;
            let randomDice = Math.floor((Math.random() * 6) + 1);
            document.getElementById(`dice${index+1}`).src = `../images/dice${randomDice}.png`
            setTimeout(switchDice, delay);
        } else {
            document.getElementById(`dice${index+1}`).src = `../images/dice${dice}.png`
        }
    }

    switchDice();
}

function resetDice() {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`dice${i}`).src = `../images/defaultDice.png`
    }
}

function resetExtraDice() {
    let extraDice = document.getElementById('dice7');
    extraDice.alt = "";
    document.getElementById('extraDiceBox').style.display = "none";
}

// Event listener for keep hand, tells server to update user points.
document.getElementById('keepHandButton').addEventListener('click', function () {
    // If you aren't the player or it's your first turn, stop you from keeping hand
    if ((currentUsername !== currentPlayer) || firstTurn === true) {
        return;
    }

    firstTurn = true;
    let result = [];

    for (let i = 0; i <= 5; i++) {
        result[i] = document.getElementById(`dice${i+1}`).alt;
    }

    switch (currentEvent) {
        case "extraDice": {
            result[6] = document.getElementById('dice7').alt;

            console.log(result);
            socket.emit('keepHand', {
                username: currentUsername, 
                roomName: currentRoomName, 
                result,
                Event:currentEvent});

            break;
        } 

        case "twoForTwo": {
            // If it's the players first hand that they kept, keep what they kept.
            if (firstHandKeep === true) {
                firstHandKeep = false;
                prevResultForEvent = prevResult.slice();
                resetDice();
                enableKeepDiceButtons();
            } else {
                firstHandKeep = true;
                socket.emit('keepHandTwoForTwo', {
                    username: currentUsername, 
                    roomName: currentRoomName, 
                    result,
                    prevResult: prevResultForEvent});
                prevResultForEvent.fill(0);
                console.log(prevResultForEvent);
            }
            break;
        }

        default: {
            console.log(result);
            socket.emit('keepHand', {
                username: currentUsername, 
                roomName: currentRoomName, 
                result,
                Event:currentEvent});
        }
    }
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

function disableKeepDiceButtons(keepDiceArray) {
    for (let i = 0; i <= 5; i++) {
        const keepButton = document.getElementById(`keepDiceButton${i+1}`);
        if (keepDiceArray[i] === true) {
            keepButton.disabled = true;
        }
    }
}

function enableKeepDiceButtons() {
    for (let i = 0; i <= 5; i++) {
        const keepButton = document.getElementById(`keepDiceButton${i+1}`);
        if (keepDiceArray[i] === true) {
            keepButton.disabled = false;
            keepDiceArray[i] = false;
            keepButton.style.backgroundColor = 'LightGray';
        }
    }
}

// Enables all the keep dice buttons after player's turn ends
socket.on('enableKeepDiceButtons', () => {
    enableKeepDiceButtons();
});

function updateAllGameInformation(room) {
    gameInformationVBox.innerHTML = '';
    for (let i = 0; i < room.clients.length; i++) {
        const paragraph = document.createElement('p');
        paragraph.id = "player" + i;
        paragraph.textContent = room.clients[i] + "'s points: " + room.points[i];
        gameInformationVBox.appendChild(paragraph);
    }
    turnInformation.textContent = `${room.clients[room.turnNumber]}'s turn`;
    currentPlayer = room.clients[room.turnNumber];
}



