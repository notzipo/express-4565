import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import session from 'express-session';
import Keycloak from 'keycloak-connect';
import { QnapClient } from './qnapClient.js';

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

const qnapConfig = {
  ip: process.env.QNAP_IP || '182.168.99.99',
  port: process.env.QNAP_PORT || 8080,
  username: process.env.QNAP_USER || 'omd',
  password: process.env.QNAP_PASS || '1234',
  useMockServer: process.env.USE_MOCK_SERVER === 'true',
  mockPort: process.env.MOCK_SERVER_PORT || 3000,
  serverPort: process.env.PORT || 4565,
};

// ── Keycloak Config ──────────────────────────────────────────────────────────
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM,
  'auth-server-url': process.env.KEYCLOAK_AUTH_SERVER_URL,
  'ssl-required': process.env.KEYCLOAK_SSL_REQUIRED || 'external',
  resource: process.env.KEYCLOAK_RESOURCE,
  'bearer-only': true, // API mode — no browser redirects, just 401 on missing/invalid token
};

// ── Initialize Express App ───────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
];

// Regex for wildcard subdomains: https://<anything>.pealive.com
const PEALIVE_ORIGIN_RE = /^https:\/\/[^.]+\.pealive\.com$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server (no Origin) or whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || PEALIVE_ORIGIN_RE.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

// Handle ALL preflight OPTIONS requests before any auth middleware runs.
// Without this, keycloak.protect() would reject OPTIONS with 401.
// NOTE: Express 5 dropped bare '*' — use a RegExp instead.
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session (required by keycloak-connect) ───────────────────────────────────
const memoryStore = new session.MemoryStore();

app.use(session({
  secret: process.env.SESSION_SECRET || 'qvpn-kc-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: memoryStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ── Keycloak Middleware ───────────────────────────────────────────────────────
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());

console.log(`🔐 Keycloak realm: ${keycloakConfig.realm} | resource: ${keycloakConfig.resource} | url: ${keycloakConfig['auth-server-url']}`);

// ── Initialize QnapClient ─────────────────────────────────────────────────────
const qnapClient = new QnapClient({
  ...qnapConfig,
  password: qnapConfig.useMockServer ? '1234' : qnapConfig.password,
  sessionFilePath: qnapConfig.useMockServer ? './mock_session.json' : './session.json'
});

// Expose the QnapClient to express request context
app.set('qnapClient', qnapClient);

// ── Routes ────────────────────────────────────────────────────────────────────
import routes from './routes/index.js';
app.use('/', routes(qnapConfig, keycloak));

// ── Start function ────────────────────────────────────────────────────────────
export async function startServer() {
  console.log('=== Starting QVPN Interface Service ===');
  console.log(`Configured Port: ${qnapConfig.serverPort}`);
  console.log(`Target QNAP: ${qnapConfig.ip}:${qnapConfig.port} (Mock: ${qnapConfig.useMockServer})`);

  try {
    // Perform initial authentication to establish session
    console.log('Attempting initial QNAP authentication...');
    const authResult = await qnapClient.authenticate();

    if (authResult.success) {
      console.log(`✅ Successfully authenticated on startup. SID: ${authResult.sid}`);

      // Start auto-renewal timer (e.g. every 60 minutes, or 2 minutes in mock mode for faster cycles if wanted)
      const renewalInterval = qnapConfig.useMockServer ? 60000 : 60 * 60 * 1000;
      qnapClient.startAutoRenewal(renewalInterval);
    } else {
      console.warn(`⚠️ Warning: Startup authentication failed. Error: ${authResult.errorValue || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Critical: Startup authentication failed due to connection error:', error.message);
  }

  return new Promise((resolve) => {
    const server = app.listen(qnapConfig.serverPort, () => {
      console.log(`🚀 QNAP-Interface Service listening on http://localhost:${qnapConfig.serverPort}`);
      resolve(server);
    });
  });
}
