// Imported first from server.ts so .env is loaded before any module reads
// process.env at import time (clock.ts, chain/index.ts). ESM hoists imports,
// so this cannot live inline in server.ts.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the process environment (containers, CI).
}
