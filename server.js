// Requirements for Express
const express = require('express');
const path = require('path');
const app = express();
// Check for enviornment port or default to port 3000
const port = 3000 || process.env.port;
// Requirements for Socket.io 
const socketio = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const io = socketio(server);

// Makes public folder the static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// Website variables
let clientCount = 0;


// Server side connection sending html files
app.get('/', function(req, res, next) {
    res.redirect('/test.html');
});

// Responses to links for HTML files
app.get('/test.html', function(req, res, next) { // Path name (...public/html/test.html)
    res.sendFile(path.join(__dirname, 'public', 'html/test.html'));
});

app.get('/test2.html', function(req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'html/test2.html'));
});

// Server's connection to port
server.listen(port, () => {
    console.log(`Connection for port ${port} successful`);
}); 

// Client side events
io.on('connection', socket => {
    console.log("New person connected");
    clientCount++;
    socket.emit('message', 'New person connected');
    io.emit('updateClientCount', clientCount);

    // Response for client disconnect
    socket.on('disconnect', () => {
        socket.emit('message', 'A person disconnected');
        clientCount--;
        io.emit('updateClientCount', clientCount);
    });

    // Emits results to all online clients
    socket.on('rollDice', results => {
        console.log(results);
        io.sockets.emit('diceResult', results);
    });
});

