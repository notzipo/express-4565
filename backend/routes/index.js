import express from 'express';
const router = express.Router();


import apiIndexRoutes from './api_index.js';
import vpnIndexRoutes from './qvpn_index.js';

// keycloak is passed in from server.js so we can apply .protect() here
const routes = (qnapConfig, keycloak) => {
    // Public health-check — no token required
    router.get('/', (req, res) => {
        res.json({
            message: 'QVPN Interface Service is running',
            status: 'online',
            mockMode: qnapConfig.useMockServer,
            tm: new Date()
        });
    });

    // Protected routes — valid Bearer token required
    router.use('/api', keycloak.protect(), apiIndexRoutes);
    router.use('/vpn', keycloak.protect(), vpnIndexRoutes);

    return router;
};

export default routes;

