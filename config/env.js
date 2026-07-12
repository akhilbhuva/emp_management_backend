// Side-effect-only module: loads .env before anything else.
// Must be the FIRST import in any entry file (server.js, seeders/*),
// since ES module imports are evaluated before any other top-level code —
// unlike require(), placing dotenv.config() "before" other imports in the
// same file does NOT guarantee it runs first.
import dotenv from "dotenv";

// quiet: true suppresses dotenv's promotional "tip" line on every boot —
// noise we don't want mixed into structured application logs.
dotenv.config({ override: true, quiet: true });
