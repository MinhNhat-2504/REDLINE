import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerAuth } from "../src/auth.js";

async function build(key?: string) {
  if (key === undefined) delete process.env.REDLINE_API_KEY; else process.env.REDLINE_API_KEY = key;
  const app = Fastify({ logger: false });
  registerAuth(app);
  app.get("/grants", async () => ({ ok: "read" }));
  app.post("/runs", async () => ({ ok: "write" }));
  app.post("/risk-assess", async () => ({ ok: "public-write" }));
  await app.ready();
  return app;
}

describe("write-route API key", () => {
  afterEach(() => { delete process.env.REDLINE_API_KEY; });

  it("is open when no key is configured", async () => {
    const app = await build(undefined);
    expect((await app.inject({ method: "POST", url: "/runs" })).statusCode).toBe(200);
  });
  it("blocks writes without the key, allows reads", async () => {
    const app = await build("s3cret");
    expect((await app.inject({ method: "POST", url: "/runs" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/runs", headers: { "x-redline-key": "wrong" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/grants" })).statusCode).toBe(200);
  });
  it("allows writes with the key and keeps /risk-assess public", async () => {
    const app = await build("s3cret");
    expect((await app.inject({ method: "POST", url: "/runs", headers: { "x-redline-key": "s3cret" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/risk-assess?x=1" })).statusCode).toBe(200);
  });
});
