import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { simulationRoutes } from "./routes/simulation.js";

// Optional local preview: exposes ONLY the stateless Policy Lab. No env file,
// database, executor, indexer or live chain is loaded by this entry point.
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
await app.register(simulationRoutes);
app.setNotFoundHandler((_req, reply) => reply.code(503).send({ error: "Policy Lab preview only. Start the full backend to access live protocol data." }));
await app.listen({ host: "127.0.0.1", port: Number(process.env.LAB_PORT ?? 8788) });
