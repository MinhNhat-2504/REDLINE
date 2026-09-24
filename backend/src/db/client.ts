import { PrismaClient } from "@prisma/client";

// Constructed on first use, not at import.
//
// `new PrismaClient()` eagerly starts loading the query engine and holds the
// resulting promise with no rejection handler. Any module that merely imports
// this file — a route, `auth.ts`, a unit test of pure logic — therefore paid
// for an engine load, and where the engine was missing (a test sandbox, a
// half-finished deploy) the import alone produced an unhandled rejection.
// Deferring construction keeps the DB out of code paths that never touch it;
// production behaviour is unchanged, since the first query constructs it.
let client: PrismaClient | null = null;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    client ??= new PrismaClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
