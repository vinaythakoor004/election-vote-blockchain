/**
 * @fileoverview Centralizes and exports all API routes.
 * This file imports individual route modules and combines them into a single router
 * that can be mounted by the main Express application.
 */

import { Router } from 'express';
import { createAdminRoutes } from './adminRoutes.js';
import { createPublicRoutes } from './publicRoutes.js';

/**
 * Creates and configures the main API router for the application.
 * @param {object} blockchainInstance - The instance of the Blockchain class.
 * @returns {Router} The main Express router for the API.
 */
export const createApiRouter = (blockchainInstance) => {
    const apiRouter = Router();

    // Mount admin routes under /admin namespace
    apiRouter.use('/admin', createAdminRoutes(blockchainInstance));

    // Mount public routes at the root API path
    apiRouter.use('/', createPublicRoutes(blockchainInstance));

    return apiRouter;
};
