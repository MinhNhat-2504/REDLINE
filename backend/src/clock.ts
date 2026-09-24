// Single clock for the policy engine, the mock chain and the runtime.
// MOCK_CLOCK_SPEED=60 makes one real second count as sixty chain seconds so a
// one-minute cooldown demo takes one second. Ignored when CHAIN=solana — the
// cluster clock is the only clock that matters there.

const speed = process.env.CHAIN === "solana" ? 1 : Math.max(1, Number(process.env.MOCK_CLOCK_SPEED ?? 1));
const epoch = Date.now();

export function nowSeconds(): number {
  return Math.floor((epoch + (Date.now() - epoch) * speed) / 1000);
}

// Real milliseconds to wait for `chainSeconds` to elapse on this clock.
export function realMs(chainSeconds: number): number {
  return Math.ceil((chainSeconds * 1000) / speed);
}

export const clockSpeed = speed;
