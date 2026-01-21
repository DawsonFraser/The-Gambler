const express = require('express');
const http = require('http'); // Required for socket.io
const cors = require('cors');
const helmet = require('helmet');
const { initializeSocket } = require('./socketManager'); // Import socket manager

// Route imports
const authRoutes = require('./routes/auth');
const betRoutes = require('./routes/bets');
const friendRoutes = require('./routes/friends'); // Import new friend routes

// --- Initialize Express App & HTTP Server ---
const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
require('dotenv').config();
const PORT = process.env.PORT || 3001;

// --- Initialize Socket.IO Server ---
const io = initializeSocket(server);
// Make io accessible to our routes (e.g., for sending notifications)
app.set('io', io);

// --- Security Middleware ---
app.use(helmet()); 
app.use(cors()); 
app.use(express.json()); 

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/friends', friendRoutes);

// A simple protected route to test our authentication
const authMiddleware = require('./middleware/authMiddleware');
app.get('/api/protected-test', authMiddleware, (req, res) => {
    res.json({ msg: `Welcome user ${req.user.id}! You can see this because you are authenticated.` });
});


// --- Start Server ---
// Use server.listen() instead of app.listen() to start both HTTP and WebSocket servers
server.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});