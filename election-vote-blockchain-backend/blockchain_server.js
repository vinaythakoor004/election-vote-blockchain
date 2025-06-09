/**
 * @fileoverview A blockchain implementation in Node.js for election voting with Firestore persistence.
 * This version enhances the system with voter registration, election open/close states,
 * and clear prevention of double-voting, reflecting a more realistic election process.
 * Votes are now automatically mined into a block immediately after being cast, without a manual trigger.
 */

// Core blockchain dependencies
import SHA256 from 'crypto-js/sha256.js';
import express from 'express';
import cors from 'cors';

// Firebase Firestore dependencies
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, getDoc } from 'firebase/firestore';

// --- Global variables provided by the Canvas environment (DO NOT MODIFY THESE) ---
// These variables are injected at runtime and are crucial for Firebase connectivity.
// For local development, you MUST manually set `firebaseConfig` to your actual Firebase project config.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Use your actual Firebase projectId for consistency locally
// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {}; // REPLACE {} with your actual Firebase config object for local dev
const firebaseConfig = {
  apiKey: "AIzaSyCp1Y27wd2aQOCYWtT7tN_uHtGM_Qkr8eM",
  authDomain: "app-blockchain-68830.firebaseapp.com",
  projectId: "app-blockchain-68830",
  storageBucket: "app-blockchain-68830.firebasestorage.app",
  messagingSenderId: "735879037645",
  appId: "1:735879037645:web:67a2da4c4629dc3f785f84",
  measurementId: "G-BPLBY9SFCV"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Initialization Variables ---
let firebaseApp;
let db;
let auth;
let blocksCollection;     // Firestore collection for blockchain blocks
let electionStateDocRef;  // Firestore document for storing election-specific state (voted users, candidates, registered users, election status)

/**
 * Initializes Firebase and sets up Firestore.
 * This function handles Firebase app initialization, authentication, and
 * establishes references to the necessary Firestore collections/documents.
 */
async function initializeFirebaseAndFirestore() {
    try {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            console.error('Firebase config is missing or empty. Please ensure __firebase_config is provided (or manually set for local dev).');
            throw new Error('Firebase configuration missing.');
        }

        firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);

        // Authenticate with Firebase. Use custom token if provided, otherwise sign in anonymously.
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log('Firebase authenticated with custom token.');
        } else {
            await signInAnonymously(auth);
            console.log('Firebase signed in anonymously.');
        }

        // Define Firestore collection paths for public data as per guidelines:
        // /artifacts/{appId}/public/data/{your_collection_name}
        blocksCollection = collection(db, `artifacts/${appId}/public/data/election_blockchain_blocks`);
        electionStateDocRef = doc(db, `artifacts/${appId}/public/data/election_state/current`); // Single doc for overall state

        console.log(`Firestore block collection path: artifacts/${appId}/public/data/election_blockchain_blocks`);
        console.log(`Firestore election state document path: artifacts/${appId}/public/data/election_state/current`);

    } catch (error) {
        console.error('Failed to initialize Firebase or authenticate:', error);
        process.exit(1); // Exit if Firebase initialization fails
    }
}


/**
 * Represents a single block in the blockchain.
 * Each block contains an index, timestamp, data (transactions),
 * a hash of the previous block, its own hash, and a nonce for proof-of-work.
 */
class Block {
    /**
     * @param {number} index - The index of the block in the chain.
     * @param {string} timestamp - The time the block was created (e.g., ISO string).
     * @param {any} data - The data stored in the block (e.g., vote transactions).
     * @param {string} previousHash - The hash of the previous block in the chain.
     * @param {number} nonce - The nonce value used for mining (default to 0 for new blocks).
     * @param {string} hash - The calculated hash of the block (default to null for new blocks).
     */
    constructor(index, timestamp, data, previousHash = '', nonce = 0, hash = null) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Array of transactions
        this.previousHash = previousHash;
        this.nonce = nonce;
        this.hash = hash || this.calculateHash();
    }

    /**
     * Calculates the cryptographic hash of the block's contents using SHA256.
     * @returns {string} The SHA256 hash of the block.
     */
    calculateHash() {
        return SHA256(this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce).toString();
    }

    /**
     * Mines the block by performing a Proof-of-Work.
     * @param {number} difficulty - The number of leading zeros required in the block's hash.
     */
    mineBlock(difficulty) {
        console.log(`Mining block ${this.index} with difficulty ${difficulty}...`);
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block ${this.index} mined: ${this.hash}`);
    }
}

/**
 * Represents the entire blockchain for the election system.
 * Manages blocks, transactions (votes), prevents double voting, tracks voter registration,
 * manages election status, and integrates with Firestore for persistence.
 */
class Blockchain {
    /**
     * Initializes the blockchain instance. It will load its state (chain, voted users, registered users, candidates, election status) from Firestore.
     */
    constructor() {
        this.chain = [];
        this.difficulty = 3;
        this.pendingTransactions = [];
        this.miningReward = 1; // Can be 0 for election systems

        this.votedUsers = new Set();     // Stores unique voter IDs who have already cast a vote (from mined blocks)
        this.registeredVoters = new Set(); // Stores unique voter IDs that are eligible to vote
        this.candidates = [ // Pre-defined candidates. In a real system, these would be managed.
            { id: 'candidateA', name: 'Alice Smith' },
            { id: 'candidateB', name: 'Bob Johnson' },
            { id: 'candidateC', name: 'Charlie Brown' }
        ];
        this.isElectionOpen = false; // Flag to control voting period

        this.isLoaded = false; // Flag to indicate if chain and state are loaded from DB
    }

    /**
     * Loads the entire blockchain and election state from Firestore.
     */
    async loadChainAndElectionStateFromDatabase() {
        if (!db || !blocksCollection || !electionStateDocRef) {
            console.error("Firestore not initialized. Cannot load chain or election state.");
            return;
        }

        console.log('Attempting to load blockchain and election state from Firestore...');
        try {
            // --- Load Blockchain Blocks ---
            const querySnapshot = await getDocs(query(blocksCollection));
            let loadedBlocksData = [];
            if (querySnapshot.empty) {
                console.log('No existing blocks found in Firestore, creating genesis block.');
                const genesisBlock = this.createGenesisBlock();
                this.chain.push(genesisBlock);
                await setDoc(doc(blocksCollection, genesisBlock.hash), { ...genesisBlock });
                console.log('Genesis block saved to Firestore.');
            } else {
                querySnapshot.forEach(doc => { loadedBlocksData.push(doc.data()); });
                loadedBlocksData.sort((a, b) => a.index - b.index); // Sort blocks by index
                this.chain = loadedBlocksData.map(data =>
                    new Block(data.index, data.timestamp, data.data, data.previousHash, data.nonce, data.hash)
                );
                console.log(`Loaded ${this.chain.length} blocks from Firestore.`);
            }

            // --- Load Election State (Voted Users, Registered Voters, Candidates, Election Status) ---
            const electionStateSnapshot = await getDoc(electionStateDocRef);
            if (electionStateSnapshot.exists()) {
                const state = electionStateSnapshot.data();
                if (state.votedUsers && Array.isArray(state.votedUsers)) {
                    this.votedUsers = new Set(state.votedUsers);
                    console.log(`Loaded ${this.votedUsers.size} voted users.`);
                }
                if (state.registeredVoters && Array.isArray(state.registeredVoters)) {
                    this.registeredVoters = new Set(state.registeredVoters);
                    console.log(`Loaded ${this.registeredVoters.size} registered voters.`);
                }
                if (typeof state.isElectionOpen === 'boolean') {
                    this.isElectionOpen = state.isElectionOpen;
                    console.log(`Election status: ${this.isElectionOpen ? 'Open' : 'Closed'}`);
                }
                // Candidates are pre-defined but could be loaded from here if dynamic
                // if (state.candidates && Array.isArray(state.candidates)) {
                //     this.candidates = state.candidates;
                // }
            } else {
                console.log('No existing election state found in Firestore. Initializing empty state.');
                await this.saveElectionStateToDatabase(); // Save initial empty state
            }

            this.isLoaded = true;
            console.log('Blockchain and election state loaded successfully.');
        } catch (error) {
            console.error('Error loading chain or election state from Firestore:', error);
            console.log('Falling back to local genesis block and empty state due to Firestore error.');
            this.chain = [this.createGenesisBlock()];
            this.votedUsers = new Set();
            this.registeredVoters = new Set();
            this.isElectionOpen = false;
            this.isLoaded = true;
        }
    }

    /**
     * Saves the current election state to Firestore.
     */
    async saveElectionStateToDatabase() {
        if (!db || !electionStateDocRef) {
            console.error("Firestore not initialized. Cannot save election state.");
            return;
        }
        try {
            await setDoc(electionStateDocRef, {
                votedUsers: Array.from(this.votedUsers),
                registeredVoters: Array.from(this.registeredVoters),
                candidates: this.candidates,
                isElectionOpen: this.isElectionOpen,
                lastUpdated: Date.now().toString()
            });
            console.log('Election state saved to Firestore.');
        } catch (error) {
            console.error('Error saving election state to Firestore:', error);
        }
    }

    /**
     * Creates the first block in the blockchain.
     * @returns {Block} The genesis block.
     */
    createGenesisBlock() {
        return new Block(0, "2023-01-01", "Genesis Block (Election Start)", "0");
    }

    /**
     * Retrieves the latest block in the blockchain.
     * @returns {Block} The last block in the chain.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Mines pending transactions (votes) and adds them to the blockchain as a new block.
     * This method is asynchronous because it involves saving the block and election state to Firestore.
     * @param {string} minerAddress - Optional: The address to send the mining reward to.
     * @returns {Promise<object>} An object indicating the outcome of the mining operation.
     */
    async minePendingTransactions(minerAddress = null) {
        if (this.pendingTransactions.length === 0) {
            console.log('No pending transactions (votes) to mine.');
            return { message: 'No pending transactions to mine.' };
        }

        const newBlock = new Block(
            this.chain.length,
            Date.now().toString(),
            JSON.parse(JSON.stringify(this.pendingTransactions)), // Deep copy for immutability
            this.getLatestBlock().hash
        );

        newBlock.mineBlock(this.difficulty);

        this.chain.push(newBlock);
        console.log(`Block ${newBlock.index} successfully mined and added to chain.`);

        // Save the new block to Firestore
        try {
            await setDoc(doc(blocksCollection, newBlock.hash), { ...newBlock });
            console.log(`Block ${newBlock.index} saved to Firestore.`);
        } catch (error) {
            console.error(`Error saving block ${newBlock.index} to Firestore:`, error);
            throw new Error('Failed to save block to database.');
        }

        // Clear pending transactions
        this.pendingTransactions = [];

        // Add mining reward if applicable
        if (minerAddress) {
            this.pendingTransactions.push({
                fromAddress: null,
                toAddress: minerAddress,
                amount: this.miningReward,
                timestamp: Date.now().toString(),
                type: 'miningReward'
            });
        }

        // IMPORTANT: Update votedUsers from newly mined block
        // Iterate through the just-mined block's data (transactions)
        // and add relevant voterIds to the votedUsers set.
        if (Array.isArray(newBlock.data)) {
            newBlock.data.forEach(trans => {
                if (trans.type === 'vote' && trans.voterId) {
                    this.votedUsers.add(trans.voterId);
                }
            });
        }

        await this.saveElectionStateToDatabase(); // Save updated votedUsers and other state

        return { message: 'Block successfully mined!', latestBlock: newBlock };
    }

    /**
     * Creates a new vote transaction and adds it to pending transactions.
     * It enforces voter registration and prevents double voting.
     * @param {object} voteTransaction - The vote transaction object ({ voterId, candidateId }).
     * @returns {boolean} True if the vote was successfully added.
     * @throws {Error} If the election is closed, voter is not registered, or voter has already voted.
     */
    createVote(voteTransaction) {
        const { voterId, candidateId } = voteTransaction;

        if (!this.isElectionOpen) {
            throw new Error('Election is currently closed. Votes cannot be cast.');
        }
        if (!voterId || !candidateId) {
            throw new Error('Invalid vote: voterId and candidateId are required.');
        }
        if (!this.candidates.some(c => c.id === candidateId)) {
            throw new Error(`Invalid vote: Candidate '${candidateId}' not found.`);
        }

        // 1. Voter ID check by admin (simulated by `registeredVoters`)
        if (!this.registeredVoters.has(voterId)) {
            throw new Error(`Voter '${voterId}' is not registered or not eligible to vote.`);
        }
        // 2. Prevent double voting
        if (this.votedUsers.has(voterId)) {
            throw new Error(`Voter '${voterId}' has already cast a vote.`);
        }

        const transaction = {
            voterId: voterId,
            candidateId: candidateId,
            timestamp: Date.now().toString(),
            type: 'vote'
        };
        this.pendingTransactions.push(transaction);
        console.log('Vote added to pending list:', transaction);
        return true;
    }

    /**
     * Adds a voter to the list of registered voters. This is an admin function.
     * @param {string} voterId - The unique ID of the voter to register.
     * @returns {boolean} True if successfully registered, false if already registered.
     */
    async registerVoter(voterId) {
        if (!voterId) {
            throw new Error('Voter ID cannot be empty.');
        }
        if (this.registeredVoters.has(voterId)) {
            return false; // Already registered
        }
        this.registeredVoters.add(voterId);
        await this.saveElectionStateToDatabase();
        console.log(`Voter '${voterId}' registered.`);
        return true;
    }

    /**
     * Sets the election status (open/closed). This is an admin function.
     * @param {boolean} status - True to open, false to close.
     */
    async setElectionStatus(status) {
        if (typeof status !== 'boolean') {
            throw new Error('Status must be a boolean (true/false).');
        }
        this.isElectionOpen = status;
        await this.saveElectionStateToDatabase();
        console.log(`Election status set to: ${status ? 'Open' : 'Closed'}`);
    }

    /**
     * Retrieves the list of registered candidates.
     * @returns {Array<object>} An array of candidate objects.
     */
    getCandidates() {
        return this.candidates;
    }

    /**
     * Calculates the current election results by tallying votes from all blocks.
     * @returns {object} An object where keys are candidate IDs and values are their vote counts.
     */
    getElectionResults() {
        const results = {};
        this.candidates.forEach(candidate => {
            results[candidate.id] = { name: candidate.name, votes: 0 };
        });

        for (const block of this.chain) {
            if (Array.isArray(block.data)) {
                for (const transaction of block.data) {
                    if (transaction.type === 'vote' && results[transaction.candidateId]) {
                        results[transaction.candidateId].votes++;
                    }
                }
            }
        }
        return results;
    }

    /**
     * Checks if the entire blockchain is valid.
     * @returns {boolean} True if the blockchain is valid, false otherwise.
     */
    isChainValid() {
        if (this.chain.length === 0) {
            console.log('Chain is empty.');
            return false;
        }

        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.log(`Chain invalid: Block ${currentBlock.index} hash mismatch.`);
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`Chain invalid: Block ${currentBlock.index} previous hash mismatch.`);
                return false;
            }
        }
        return true;
    }
}

// --- API Setup using Express.js ---
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

const myBlockchain = new Blockchain();

// --- Server Startup Sequence ---
(async () => {
    await initializeFirebaseAndFirestore();
    await myBlockchain.loadChainAndElectionStateFromDatabase();

    // --- Admin Endpoints (for testing and manual control) ---
    // In a real application, these would be heavily secured and authenticated.

    // Register a voter ID
    app.post('/admin/register-voter', async (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { voterId } = req.body;
        try {
            const registered = await myBlockchain.registerVoter(voterId);
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
    app.post('/admin/set-election-status', async (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { isOpen } = req.body; // Expects `true` or `false`
        try {
            await myBlockchain.setElectionStatus(isOpen);
            res.status(200).json({ message: `Election status set to: ${isOpen ? 'Open' : 'Closed'}.` });
        } catch (error) {
            console.error("Error setting election status:", error);
            res.status(400).json({ message: error.message });
        }
    });

    // Get current election status
    app.get('/admin/election-status', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json({ isElectionOpen: myBlockchain.isElectionOpen });
    });

    // Get list of registered voters
    app.get('/admin/registered-voters', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(Array.from(myBlockchain.registeredVoters));
    });

    // --- Public API Endpoints ---

    // Get the entire blockchain
    app.get('/blockchain', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(myBlockchain.chain);
    });

    // Get pending transactions (votes)
    app.get('/transactions/pending', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(myBlockchain.pendingTransactions);
    });

    // Endpoint for casting a vote - now triggers immediate background mining
    app.post('/vote', async (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { voterId, candidateId } = req.body;
        try {
            myBlockchain.createVote({ voterId, candidateId }); // This adds to pending list

            // Immediately trigger mining in the background.
            // DO NOT await this call, so the API response is sent quickly.
            if (myBlockchain.pendingTransactions.length > 0) {
                console.log(`Triggering immediate background mining for ${myBlockchain.pendingTransactions.length} pending vote(s)...`);
                // You can pass a minerAddress here, e.g., 'election-authority-miner'
                myBlockchain.minePendingTransactions('election-authority-miner')
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
    app.post('/mine', async (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const { minerAddress } = req.body; // Optional: Miner address for reward
        try {
            const result = await myBlockchain.minePendingTransactions(minerAddress);
            res.status(200).json(result);
        } catch (error) {
            console.error("Mining error:", error);
            res.status(500).json({ message: 'Error during mining.', error: error.message });
        }
    });

    // Get current election results
    app.get('/election/results', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const results = myBlockchain.getElectionResults();
        res.json(results);
    });

    // Get list of candidates
    app.get('/candidates', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(myBlockchain.getCandidates());
    });

    // Get list of voted users (for debugging/verification, not for public display in production)
    app.get('/voted-users', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        res.json(Array.from(myBlockchain.votedUsers));
    });

    // Check if the chain is valid
    app.get('/blockchain/isvalid', (req, res) => {
        if (!myBlockchain.isLoaded) { return res.status(503).json({ message: 'Blockchain is loading.' }); }
        const isValid = myBlockchain.isChainValid();
        res.json({ isValid });
    });

    // Start the Express server after Firestore initialization and blockchain loading
    app.listen(PORT, () => {
        console.log(`Election Blockchain API listening on port ${PORT}`);
        console.log('Access the API at: http://localhost:3001');
        console.log('Firebase and Election Blockchain loaded successfully!');
    });
})();
