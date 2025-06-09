/**
 * @fileoverview Defines publicly accessible API routes for the election blockchain.
 * These routes allow users to interact with the voting system.
 */

import { Router } from 'express';

const router = Router();

/**
 * Creates and exports Express router with public-facing API endpoints.
 * @param {object} blockchainInstance - The instance of the Blockchain class.
 * @returns {Router} An Express router configured with public routes.
 */
export const createPublicRoutes = (blockchainInstance) => {
    // Get the entire blockchain
    router.get('/blockchain', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading. Please try again shortly.' }); }
        res.json(blockchainInstance.chain);
    });

    // Get pending transactions (votes)
    router.get('/transactions/pending', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading. Please try again shortly.' }); }
        res.json(blockchainInstance.pendingTransactions);
    });

    // Endpoint for casting a vote - now triggers immediate background mining
    router.post('/vote', async (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading. Please try again shortly.' }); }
        const { voterId, candidateId } = req.body;
        try {
            blockchainInstance.createVote({ voterId, candidateId }); // This adds to pending list

            // Immediately trigger mining in the background.
            // DO NOT await this call, so the API response is sent quickly.
            if (blockchainInstance.pendingTransactions.length > 0) {
                console.log(`Triggering immediate background mining for ${blockchainInstance.pendingTransactions.length} pending vote(s)...`);
                blockchainInstance.minePendingTransactions('election-authority-miner')
                    .then(result => console.log('Background mining complete:', result.message))
                    .catch(error => console.error('Background mining failed:', error.message));
            }

            res.status(201).json({ message: 'Vote accepted. Mining in progress to record it permanently.' });
        } catch (error) {
            console.error("Error casting vote:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // Endpoint to trigger mining of pending votes (can still be used manually if needed)
    router.post('/mine', async (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { minerAddress } = req.body; // Optional: Miner address for reward
        try {
            const result = await blockchainInstance.minePendingTransactions(minerAddress);
            res.status(200).json(result);
        } catch (error) {
            console.error("Mining error:", error);
            res.status(500).json({ message: 'Error during mining.', error: error.message });
        }
    });

    // Get current election results
    router.get('/election/results', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const results = blockchainInstance.getElectionResults();
        res.json(results);
    });

    // Get list of candidates
    router.get('/candidates', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(blockchainInstance.getCandidates());
    });

    // Get list of voted users (for debugging/verification, not for public display in production)
    router.get('/voted-users', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(Array.from(blockchainInstance.votedUsers));
    });

    // Check if the chain is valid
    router.get('/blockchain/isvalid', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const isValid = blockchainInstance.isChainValid();
        res.json({ isValid });
    });

    return router;
};
