// Entry point for Railway deployment
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPath = join(__dirname, 'backend', 'server.js');

console.log('Starting HelpDesk application...');
console.log('Backend path:', backendPath);

// Start the backend server
const backend = spawn('node', [backendPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  backend.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  backend.kill('SIGINT');
});
