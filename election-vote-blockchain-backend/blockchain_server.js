/**
 * @fileoverview Main entry point for the Node.js Election Blockchain API server.
 * This file sets up Express.js and orchestrates the interaction
 * between the blockchain core logic, Firebase Firestore persistence, and API routes.
 */

import express from 'express';
import cors from 'cors';
import { Blockchain } from './src/core/blockchain.js'; // Updated import path
import { initializeFirebaseAndFirestore } from './src/config/firebaseConfig.js'; // Updated import path
import { createApiRouter } from './src/api/index.js'; // Import the new API router creator

// --- API Setup using Express.js ---
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Create the blockchain instance
const myBlockchain = new Blockchain();

// --- Server Startup Sequence ---
(async () => {
    try {
        // Initialize Firebase and load blockchain state
        await initializeFirebaseAndFirestore();
        await myBlockchain.loadChainAndElectionStateFromDatabase();

        // Create and mount the API router AFTER blockchain is loaded
        // All API routes will be accessible relative to the root '/' path
        app.use('/', createApiRouter(myBlockchain));

        // Start the Express server
        app.listen(PORT, () => {
            console.log(`Election Blockchain API listening on port ${PORT}`);
            console.log('Access the API at: http://localhost:3001');
            console.log('Firebase and Election Blockchain loaded successfully!');
        });
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1); // Exit process if startup fails
    }
})();
