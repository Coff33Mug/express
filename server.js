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


// Response to connection
io.on('connection', socket => {
    console.log('New person connected');
    socket.emit('New person connected');
});

// Server's connection to port
server.listen(port, () => {
    console.log(`Connection for port ${port} successful`);
}); 