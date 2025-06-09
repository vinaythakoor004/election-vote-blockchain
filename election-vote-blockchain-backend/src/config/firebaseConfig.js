/**
 * @fileoverview Configures and initializes Firebase for the Node.js backend.
 * It handles Firebase app initialization, authentication, and provides
 * references to Firestore database and specific collections/documents.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

// --- Global variables provided by the Canvas environment (DO NOT MODIFY THESE) ---
// These variables are injected at runtime. For local development, you MUST manually
// set `firebaseConfig` to your actual Firebase project configuration.
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Use your actual Firebase projectId for consistency locally
export const firebaseConfig = { // REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG OBJECT FOR LOCAL DEV
  apiKey: "AIzaSyCp1Y27wd2aQOCYWtT7tN_uHtGM_Qkr8eM",
  authDomain: "app-blockchain-68830.firebaseapp.com",
  projectId: "app-blockchain-68830",
  storageBucket: "app-blockchain-68830.firebasestorage.app",
  messagingSenderId: "735879037645",
  appId: "1:735879037645:web:67a2da4c4629dc3f785f84",
  measurementId: "G-BPLBY9SFCV"
  // measurementId: "G-..." // Optional: if you have measurementId, include it here
};
export const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Initialization Variables (will be exported after initialization) ---
export let firebaseApp;
export let db;
export let auth;
export let blocksCollection;     // Firestore collection for blockchain blocks
export let electionStateDocRef;  // Firestore document for storing election-specific state

/**
 * Initializes Firebase and sets up Firestore.
 * This function must be called once at application startup.
 */
export async function initializeFirebaseAndFirestore() {
    try {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0 || !firebaseConfig.projectId) {
            console.error('Firebase config is missing or empty. Please ensure __firebase_config is provided (or manually set for local dev).');
            throw new Error('Firebase configuration missing or incomplete.');
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
        throw error; // Re-throw to propagate error to main server startup
    }
}
