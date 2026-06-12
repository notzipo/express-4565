import express from 'express';
import apiQnapSystemRoutes from './api_qnapSystem.js';

const apiIndexRoutes = express.Router();

// Middleware to ensure a valid SID (including renewed session if current one expires)
apiIndexRoutes.use(async (req, res, next) => {
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
apiIndexRoutes.use('/qnap', apiQnapSystemRoutes);
export default apiIndexRoutes;
