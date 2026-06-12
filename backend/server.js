import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { QnapClient } from './qnapClient.js';
import qvpnRoutes from './routes/qvpn_index.js';
import apiIndexRoutes from './routes/api_index.js';

// Load environment variables (look in backend/.env, then repo root, then CWD)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(__dirname, '.env'),      // backend/.env (packaged in image)
  path.resolve(__dirname, '..', '.env'), // project root .env
  path.resolve(process.cwd(), '.env'),   // current working dir .env
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded env from ${envPath}`);
    break;
  }
}

const config = {
  ip: process.env.QNAP_IP || '182.168.99.99',
  port: process.env.QNAP_PORT || 8080,
  username: process.env.QNAP_USER || 'omd',
  password: process.env.QNAP_PASS || '1234',
  useMockServer: process.env.USE_MOCK_SERVER === 'true',
  mockPort: process.env.MOCK_SERVER_PORT || 3000,
  serverPort: process.env.PORT || 4565,
};

// Initialize Express App
const app = express();
app.disable('x-powered-by');

const allowedOrigins = [
  'http://localhost:5173',
  'https://*.pealive.com',
];

const corsOptions = {
  origin: allowedOrigins,
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize QnapClient
const qnapClient = new QnapClient({
  ...config,
  password: config.useMockServer ? '1234' : config.password,
  sessionFilePath: config.useMockServer ? './mock_session.json' : './session.json'
});

// Expose the QnapClient to express request context
app.set('qnapClient', qnapClient);

// Mount routes
app.use('/vpn', qvpnRoutes);
app.use('/api', apiIndexRoutes);

// Root path diagnostic route
app.get('/', (req, res) => {
  res.json({
    message: 'QVPN Interface Service is running',
    status: 'online',
    mockMode: config.useMockServer
  });
});

// Start function
export async function startServer() {
  console.log('=== Starting QVPN Interface Service ===');
  console.log(`Configured Port: ${config.serverPort}`);
  console.log(`Target QNAP: ${config.ip}:${config.port} (Mock: ${config.useMockServer})`);
  
  try {
    // Perform initial authentication to establish session
    console.log('Attempting initial QNAP authentication...');
    const authResult = await qnapClient.authenticate();
    
    if (authResult.success) {
      console.log(`✅ Successfully authenticated on startup. SID: ${authResult.sid}`);
      
      // Start auto-renewal timer (e.g. every 60 minutes, or 2 minutes in mock mode for faster cycles if wanted)
      const renewalInterval = config.useMockServer ? 60000 : 60 * 60 * 1000;
      qnapClient.startAutoRenewal(renewalInterval);
    } else {
      console.warn(`⚠️ Warning: Startup authentication failed. Error: ${authResult.errorValue || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Critical: Startup authentication failed due to connection error:', error.message);
  }

  return new Promise((resolve) => {
    const server = app.listen(config.serverPort, () => {
      console.log(`🚀 QNAP-Interface Service listening on http://localhost:${config.serverPort}`);
      resolve(server);
    });
  });
}
