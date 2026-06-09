import express from 'express';
import connectionRoutes from './qvpn_connection.js';
import miscRoutes from './qpvn_misc.js';
import logRoutes from './qvpn_log.js';
import privilegeRoutes from './qpvn_privilege.js';
import userRoutes from './qvpn_user.js';

const router = express.Router();

// Middleware to ensure a valid SID (including renewed session if current one expires)
router.use(async (req, res, next) => {
  const client = req.app.get('qnapClient');
  if (!client) {
    return res.status(500).json({ error: 'QnapClient is not initialized on the application.' });
  }

  try {
    console.log('[Middleware] Authenticating / validating QNAP session...');
    const result = await client.authenticate();
    if (result.success) {
      req.sid = result.sid;
      next();
    } else {
      res.status(401).json({
        success: false,
        error: 'Failed to obtain a valid QNAP session SID',
        errorDetails: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error during QNAP session validation',
      message: error.message
    });
  }
});

// Mount modular subroutes
router.use('/connection', connectionRoutes);
router.use('/misc', miscRoutes);
router.use('/log', logRoutes);
router.use('/user', userRoutes);
router.use('/privilege', privilegeRoutes);

export default router;
