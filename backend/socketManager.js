const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');

// This object will store the mapping of userId to their socketId for online status
const connectedUsers = {};

function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "*", // In production, restrict this to your front-end URL
            methods: ["GET", "POST"]
        }
    });

    // Middleware to authenticate socket connections using the access token
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
            socket.user = decoded.user;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected via WebSocket: ${socket.id} (User ID: ${socket.user.id})`);
        connectedUsers[socket.user.id] = socket.id;

        // Notify friends that this user is online (logic to be added)

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            delete connectedUsers[socket.user.id];
            // Notify friends that this user is offline (logic to be added)
        });

        // Listen for a private message from a client
        socket.on('private_message', ({ recipientId, message }) => {
            const recipientSocketId = connectedUsers[recipientId];
            if (recipientSocketId) {
                // Send the message only to the specific recipient
                io.to(recipientSocketId).emit('new_message', {
                    senderId: socket.user.id,
                    message: message
                });
            }
        });
    });

    return io;
}

module.exports = { initializeSocket, connectedUsers };