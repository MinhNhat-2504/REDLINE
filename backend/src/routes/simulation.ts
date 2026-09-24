import type { FastifyInstance } from "fastify";
import { POLICY_PRESETS, SimulationInput, simulatePolicy } from "../policy/simulation.js";

export async function simulationRoutes(app: FastifyInstance) {
  app.get("/policy/presets", async () => ({ version: 1, presets: POLICY_PRESETS }));
  app.post("/policy/simulate", async (req, reply) => {
    const parsed = SimulationInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid simulation input", details: parsed.error.issues });
    return simulatePolicy(parsed.data);
  });
}
