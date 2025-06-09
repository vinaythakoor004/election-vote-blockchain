/**
 * @fileoverview Defines API routes for administrative tasks related to the election blockchain.
 * These routes would typically be secured in a production environment.
 */

import { Router } from 'express';

const router = Router();

/**
 * Creates and exports Express router with admin-specific API endpoints.
 * @param {object} blockchainInstance - The instance of the Blockchain class.
 * @returns {Router} An Express router configured with admin routes.
 */
export const createAdminRoutes = (blockchainInstance) => {
    // Register a voter ID
    router.post('/register-voter', async (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading. Please try again shortly.' }); }
        const { voterId } = req.body;
        try {
            const registered = await blockchainInstance.registerVoter(voterId);
            if (registered) {
                res.status(200).json({ message: `Voter '${voterId}' registered successfully.` });
            } else {
                res.status(409).json({ message: `Voter '${voterId}' is already registered.` });
            }
        } catch (error) {
            console.error("Error registering voter:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // Set election status (open/close)
    router.post('/set-election-status', async (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { isOpen } = req.body; // Expects `true` or `false`
        try {
            await blockchainInstance.setElectionStatus(isOpen);
            res.status(200).json({ message: `Election status set to: ${isOpen ? 'Open' : 'Closed'}.` });
        } catch (error) {
            console.error("Error setting election status:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // Get current election status
    router.get('/election-status', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json({ isElectionOpen: blockchainInstance.isElectionOpen });
    });

    // Get list of registered voters
    router.get('/registered-voters', (req, res) => {
        if (!blockchainInstance.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(Array.from(blockchainInstance.registeredVoters));
    });

    return router;
};
