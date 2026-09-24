// Prisma returns bigint for token units; JSON.stringify cannot serialize it.
export function json<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
