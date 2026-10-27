// Seeded RNG (mulberry32). The whole RNG state is one uint32, stored in GameState.rngState,
// so any run can be replayed exactly from its seed + the player's choices.

import type { Range } from "@/types/game";

export class Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  weighted<T>(arr: readonly T[], weight: (x: T) => number): T | null {
    let total = 0;
    for (const x of arr) total += Math.max(0, weight(x));
    if (total <= 0) return null;
    let r = this.next() * total;
    for (const x of arr) {
      r -= Math.max(0, weight(x));
      if (r < 0) return x;
    }
    return arr[arr.length - 1];
  }

  /** Resolve a Range: integers stay integers, fractional ranges stay fractional. */
  range(r: Range): number {
    if (typeof r === "number") return r;
    const [a, b] = r;
    if (Number.isInteger(a) && Number.isInteger(b)) return this.int(a, b);
    return this.float(a, b);
  }
}

export function makeSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
