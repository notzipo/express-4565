import { startServer } from './server.js';

// Start the Express application server
startServer().catch((err) => {
  console.error('Failed to start the Express application:', err);
  process.exit(1);
});
