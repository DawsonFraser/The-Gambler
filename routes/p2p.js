const express = require('express');
const router = express.Router();
const p2pController = require('../controllers/p2pController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = function(io) {
    // We create the controller instance and pass io to it
    const controller = p2pController(io);

    router.post('/challenge', authMiddleware, controller.createChallenge);
    router.get('/challenges', authMiddleware, controller.getPendingChallenges);
    router.put('/accept/:id', authMiddleware, controller.acceptChallenge);
    router.get('/my-bets', authMiddleware, controller.getMyBets);
    router.post('/settle/:id', authMiddleware, controller.settleBet);
    
    return router;
};