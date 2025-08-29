const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Pass `io` to the p2p routes
const p2pRoutes = require('./routes/p2p')(io);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/bets', require('./routes/bets'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/p2p', p2pRoutes); // Use the new p2pRoutes variable
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/games', require('./routes/games'));
app.use('/api/admin', require('./routes/admin'));

// Socket.IO Connection Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (userId) => {
        socket.join(userId.toString());
        console.log(`User ${socket.id} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});