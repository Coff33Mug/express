const catImage = document.getElementById('catImage');
const clientCountParagraph = document.getElementById('clientCount');
const gameInformationVBox = document.getElementById('gameInformationVBox');
const turnInformation = document.getElementById('turnDisplayParagraph');
const specialEventButton = document.getElementById('specialEventButton');
const keepDiceArray = new Array(6).fill(false);
const specialEvents = ["extraDice", "skipTurn", ">=500"];
let previouslyKeptDice = new Array(6).fill(false);
const room = {
    clients: [],
    points: [],
    possiblePoints: [],
    turnNumber: 0
}
let currentPlayer;
let currentEvent;
let firstTurn = true;
let prevResult = new Array(6).fill(0);

document.getElementById('addUserButton').addEventListener('click', function () {
    const username = document.getElementById('addUserInput').value;

    // If there is no input or user already exist, prevent user adding.
    if (username === "" || (room.clients.includes(username))) {
        return;
    }

    document.getElementById('addUserInput').value = "";

    // Push user to room
    room.clients.push(username);
    room.points.push(0);
    room.possiblePoints.push(0);

    // Creates paragraph element and shows creation to user.
    const paragraph = document.createElement('p');
    paragraph.textContent = username + "'s points: 0";
    gameInformationVBox.appendChild(paragraph);
    turnInformation.textContent = `${room.clients[room.turnNumber]}'s turn`;
});

// Dice rolling element. 
document.getElementById('rollDiceButton').addEventListener('click', function () {
    if (room.clients.length === 0) {
        return;
    }

    let result = [];
    let keptDice = [];
    let resultForPoints = [];
    // If it's the player's first turn, roll all the dice.
    if (firstTurn === true) {
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
    }
    
    rollDice(room.clients[room.turnNumber], currentEvent, result, keptDice, resultForPoints);
});

function rollDice (username, event, result, keptDice, resultForPoints) {
    let points;
    let keptPoints;
    
    switch (event) {
        case ">=500": {
            points = calculatePointsEventBased(resultForPoints).points;
            keptPoints = calculatePointsEventBased(keptDice).points;
        }

        default: {
            points = calculatePoints(resultForPoints).points;
            keptPoints = calculatePoints(keptDice).points;
        }
    }

    const userIndex = room.clients.indexOf(username);
    
    // Give up your turn if you bust
    if (points === 0) {
        room.turnNumber++;
        room.turnNumber = room.turnNumber % room.clients.length;
        room.possiblePoints[userIndex] = 0;
        specialEventButton.disabled = false;
        enableKeepDiceButtons();
    }
    
    // Sets points for player
    room.possiblePoints[userIndex] = points;
    room.possiblePoints[userIndex] += keptPoints;

    for (let i = 0; i <= 5; i++) {
        if (keepDiceArray[i] === false) {
            animateDice(result[i], i);
            document.getElementById(`dice${i+1}`).alt = result[i];
        }
    }
    
    updateAllGameInformation(room);
}

document.getElementById('keepHandButton').addEventListener('click', function () {
    // If it's your first turn, stop you from keeping hand
    if (firstTurn === true) {
        return;
    }

    firstTurn = true;
    let result = [];

    for (let i = 0; i <= 5; i++) {
        result[i] = document.getElementById(`dice${i+1}`).alt;
    }
    
    if (currentEvent === "extraDice") {
        result[6] = document.getElementById('dice7').alt;
    }

    keepHand(room.clients[room.turnNumber], result, currentEvent);
});

function keepHand(username, result, Event) {
    const userIndex = room.clients.indexOf(username);
    
    switch (Event) {
        case ">=500": {
            const handFilled = calculatePointsEventBased(result).handFilled;
            if (handFilled === true && room.possiblePoints[userIndex] >= 500) {
                // Sets points for the player and gives 500 bonus points
                room.points[userIndex] += room.possiblePoints[userIndex];
                room.points[userIndex] += 500;
                room.possiblePoints[userIndex] = 0;
                
            } else {
                // Sets points for the player normally given you didn't fill your hand
                room.points[userIndex] += room.possiblePoints[userIndex];
                room.possiblePoints[userIndex] = 0;
            }
            break;
        }

        default: {
            // Sets points for the player
            room.points[userIndex] += room.possiblePoints[userIndex];
            room.possiblePoints[userIndex] = 0;
        }
    }
    
    // Updates turn and re-enable buttons on player
    room.turnNumber++;
    room.turnNumber = room.turnNumber % room.clients.length;
    enableKeepDiceButtons();
    resetSpecialEvent(Event);
    updateAllGameInformation(room);
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

function calculatePoints(result) {
    let points = 0
    let handFilled = true;
    
    // Creates an array of the amount of times a roll appears
    const frequencyOfNumber = new Array(6).fill(0);
    for (let i = 0; i < result.length; i++) {
        frequencyOfNumber[result[i]-1]++;
    }
    
    // Checks for instance of 6 of a kind
    for (let i = 0; i < 6; i++) {
        if (frequencyOfNumber[i] === 6) {
            // If you get six 1's, 5000 points!
            if (i === 0) {
                points += 5000;
            } else {
                // If you got six x's, you get x * 500 points!
                points += (i+1) * 500;
            }
            frequencyOfNumber[i] -= 6;
        }
    }
    
    // Checks for instances of triplet dice roll
    for (let i = 0; i < 6; i++) {
        if (frequencyOfNumber[i] >= 3) {
            // If you got triple ones, 1000 points!
            if (i === 0) {
                points += 1000;
            } else {
                // If you got triple x's, you get x * 100 points!
                points += (i+1) * 100;
            }
            frequencyOfNumber[i] -= 3;
        }
    }
    
    // Checks for a straight
    if (frequencyOfNumber.every(num => num === 1)) {
        points += 1500;
        
        for (let i = 0; i < 6; i++) {
            frequencyOfNumber[i]--;
        }
    }
    
    /*  The reason why we check for ones first is because we assume you don't want to add
    a one to a four dice for lower points.
    */
    
    points += frequencyOfNumber[0] * 100;
    frequencyOfNumber[0] = 0;
    
    // Dice adding
    while (frequencyOfNumber[0] >= 1 && frequencyOfNumber[3] >= 1) {
        points += 50;
        frequencyOfNumber[0]--, frequencyOfNumber[3]--;
    }
    
    while(frequencyOfNumber[1] >= 1 && frequencyOfNumber[2] >= 1) {
        points += 50;
        frequencyOfNumber[1]--, frequencyOfNumber[2]--;
    }
    
    // Adds any remaining points for 5s
    points += frequencyOfNumber[4] * 50;
    
    /*  If there are any remaining dice that weren't used towards point calculations,
    their hand was not filled. TODO: not working properly
    Issue with how points are calculated, 
    given we roll a 4 and a 1, 1 dice is eaten up in priority of 100 points over filling hand.
    */

    for (let i = 0; i < frequencyOfNumber.length; i++) {
        if (frequencyOfNumber[i] !== 0) {
            handFilled = false;
        }
    }
    
    const calculatedPoints = {
        points: points,
        handFilled: handFilled
    }
    
    return calculatedPoints;
}

/*  Calculates points with priority to adding based on event
    Ex. >=500 will always add dice in the case you get a 4 and a 1 where normally they would not 
    add as usually a player will take 100 over 50 points. In the case of an event where the player
    wants to fill, this function is used.
*/
function calculatePointsEventBased(result) {
    let points = 0
    let handFilled = true;
    
    // Creates an array of the amount of times a roll appears
    const frequencyOfNumber = new Array(6).fill(0);
    for (let i = 0; i < result.length; i++) {
        frequencyOfNumber[result[i]-1]++;
    }
    
    // Checks for instance of 6 of a kind
    for (let i = 0; i < 6; i++) {
        if (frequencyOfNumber[i] === 6) {
            // If you get six 1's, 5000 points!
            if (i === 0) {
                points += 5000;
            } else {
                // If you got six x's, you get x * 500 points!
                points += (i+1) * 500;
            }
            frequencyOfNumber[i] -= 6;
        }
    }
    
    // Checks for instances of triplet dice roll
    for (let i = 0; i < 6; i++) {
        if (frequencyOfNumber[i] >= 3) {
            // If you got triple ones, 1000 points!
            if (i === 0) {
                points += 1000;
            } else {
                // If you got triple x's, you get x * 100 points!
                points += (i+1) * 100;
            }
            frequencyOfNumber[i] -= 3;
        }
    }
    
    // Checks for a straight
    if (frequencyOfNumber.every(num => num === 1)) {
        points += 1500;
        
        for (let i = 0; i < 6; i++) {
            frequencyOfNumber[i]--;
        }
    }
    
    // Dice adding is priority given you need to fill your hand
    while (frequencyOfNumber[0] >= 1 && frequencyOfNumber[3] >= 1) {
        points += 50;
        frequencyOfNumber[0]--, frequencyOfNumber[3]--;
    }
    
    while(frequencyOfNumber[1] >= 1 && frequencyOfNumber[2] >= 1) {
        points += 50;
        frequencyOfNumber[1]--, frequencyOfNumber[2]--;
    }

    // Add any remaining points for 1s
    points += frequencyOfNumber[0] * 100;
    frequencyOfNumber[0] = 0;
    // Adds any remaining points for 5s
    points += frequencyOfNumber[4] * 50;
    frequencyOfNumber[4] = 0;
    
    /*  If there are any remaining dice that weren't used towards point calculations,
    their hand was not filled. TODO: not working properly
    Issue with how points are calculated, 
    given we roll a 4 and a 1, 1 dice is eaten up in priority of 100 points over filling hand.
    */
    
    for (let i = 0; i < frequencyOfNumber.length; i++) {
        if (frequencyOfNumber[i] !== 0) {
            handFilled = false;
        }
    }
    
    const calculatedPoints = {
        points: points,
        handFilled: handFilled
    }
    
    return calculatedPoints;
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

function disableKeepDiceButtons(keepDiceArray) {
    for (let i = 0; i <= 5; i++) {
        const keepButton = document.getElementById(`keepDiceButton${i+1}`);
        if (keepDiceArray[i] === true) {
            keepButton.disabled = true;
        }
    }
}

// Special Event stuff
specialEventButton.addEventListener('click', function () {
    let randomNumber = Math.floor((Math.random() * 3));
    const Event = specialEvents[randomNumber];
    currentEvent = Event;
    specialEventButton.disabled = true;
    newSpecialEvent(Event);
});

function newSpecialEvent(Event) {
    switch (Event) {
        case "extraDice": {
            let dice = Math.floor((Math.random() * 6) + 1);
            document.getElementById('specialEventStrong').innerHTML = "Extra Dice!";
            document.getElementById('extraDiceBox').style.display = "flex";
            document.getElementById('dice7').alt = dice;
            animateDice(dice, 6);
            break;
        }
        
        case "skipTurn": {
            room.turnNumber++;
            room.turnNumber = room.turnNumber % room.clients.length;
            
            document.getElementById('specialEventStrong').innerHTML = "Lost your turn!";
            currentPlayer = player;
            resetDice();
            resetExtraDice();
            specialEventButton.disabled = false;
            turnInformation.textContent = `${player}'s turn`;
            break;
        }

        case ">=500": {
            document.getElementById('specialEventStrong').innerHTML = "Fill with over 500 for 500+ points!";
            break;
        }
    }
}

/*  On top of resetting everything special event related, now resets the dice.
*/
function resetSpecialEvent (Event) {
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
    specialEventButton.disabled = false;
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