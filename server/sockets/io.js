import { games } from '../server.js';

const actions = [
    'rematchRequest',
    'rematchReject',
    'rematch',
    'drawRequest',
    'drawReject',
    'draw',
    'resign'
];

const myIo = (io) => {
    io.on('connection', socket => {
        
        console.log('New socket connection');
        let currentCode = null;

        socket.on('move', function(move) {          
            io.to(currentCode).emit('newMove', move);
        });
        
        socket.on('joinGame', function(data) {
            currentCode = data.code;
            socket.join(currentCode);
            if (!games[currentCode]) {
                games[currentCode] = true;
                return;
            }
            
            io.to(currentCode).emit('startGame');
        });

        socket.on('disconnect', function() {
            if (currentCode){
                io.to(currentCode).emit('gameOverDisconnect');
                delete games[currentCode];
            }
        });

        actions.forEach((action) => {
            if (action === 'draw' || action === 'resign') {            
                socket.on(action, () => {
                    emitSocketAndDelete(currentCode, action);
                });
            }
            else {
                socket.on(action, () => {
                    emitSocket(currentCode, action);
                });
            }
        });
        
        const emitSocket = (currentCode, socket) => {
            if (currentCode){
                io.to(currentCode).emit(socket);
            }
        }

        const emitSocketAndDelete = (currentCode, socket) => {
            if (currentCode){
                io.to(currentCode).emit(socket);
                delete games[currentCode];
            }
        }
    });   
};

export default myIo;