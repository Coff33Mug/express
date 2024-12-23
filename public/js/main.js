// DOMContentLoaded makes the browser load everything before allowing anything to be modified
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const catImage = document.getElementById('catImage');
    const clientCountParagraph = document.getElementById('clientCount');
    
    socket.on('message', message => {
        console.log(message);
    });
    
    socket.on('updateClientCount', clientCount => {
        clientCountParagraph.innerText = "Current online users: " + clientCount;
    });
});
