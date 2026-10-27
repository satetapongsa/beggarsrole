// 16×24 pixel character drawn from a string grid. Palette comes from the rolled appearance;
// low hygiene adds dirt specks, sickness tints the skin.

import type { Appearance } from "@/types/game";

const BASE = [
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  ".....hssssh.....",
  ".....sesses.....",
  ".....ssssss.....",
  "......smms......",
  ".......ss.......",
  ".....TttttT.....",
  "....tttttttt....",
  "...stttttttts...",
  "...stttttttts...",
  "...sTttttttTs...",
  "...s.tttttt.s...",
  ".....pppppp.....",
  ".....pppppp.....",
  ".....pp..pp.....",
  ".....pp..pp.....",
  ".....pp..pp.....",
  ".....pp..pp.....",
  ".....pp..pp.....",
  "....bbb..bbb....",
  "................",
  "................",
];

const DOG = [
  "..........dd..",
  ".........dddd.",
  ".........ddedn",
  ".........dddd.",
  ".dddddddddddd.",
  ".dddddddddddd.",
  ".D.D.....D.D..",
  ".D.D.....D.D..",
];

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function buildGrid(style: number, hygiene: number): string[][] {
  const g = BASE.map((row) => row.split(""));
  const set = (x: number, y: number, c: string) => {
    if (g[y] && g[y][x] !== undefined) g[y][x] = c;
  };
  if (style === 1) {
    for (let y = 3; y <= 9; y++) {
      set(4, y, "h");
      set(11, y, "h");
    }
  } else if (style === 2) {
    for (let x = 5; x <= 10; x++) {
      set(x, 1, "k");
      set(x, 2, "k");
    }
    set(11, 3, "k");
    set(12, 3, "k");
  } else if (style === 3) {
    for (let x = 0; x < 16; x++) set(x, 1, ".");
  }
  const dirt = (x: number, y: number) => {
    if (g[y][x] !== ".") g[y][x] = "d";
  };
  if (hygiene < 45) {
    dirt(6, 11);
    dirt(9, 15);
    dirt(10, 19);
  }
  if (hygiene < 25) {
    dirt(5, 12);
    dirt(8, 9);
    dirt(6, 18);
    dirt(9, 5);
    dirt(7, 14);
  }
  return g;
}

interface Props {
  appearance: Appearance;
  hygiene?: number;
  sick?: boolean;
  x?: number;
  y?: number;
  scale?: number;
}

/** Character as an SVG <g>, for embedding inside other SVGs. */
export function CharacterPixels({ appearance, hygiene = 60, sick = false, x = 0, y = 0, scale = 1 }: Props) {
  const skin = sick ? mix(appearance.skin, "#9fb38a", 0.35) : appearance.skin;
  const pal: Record<string, string> = {
    h: appearance.hair,
    s: skin,
    e: "#1a120c",
    m: shade(skin, -45),
    t: appearance.shirt,
    T: shade(appearance.shirt, -30),
    p: appearance.pants,
    b: "#2a1d14",
    k: shade(appearance.shirt, 25),
    d: "#4a3726",
  };
  const grid = buildGrid(appearance.hairStyle, hygiene);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="pixelated">
      {grid.flatMap((row, ry) =>
        row.map((c, rx) =>
          c === "." ? null : <rect key={`${rx}-${ry}`} x={rx} y={ry} width={1.02} height={1.02} fill={pal[c]} />,
        ),
      )}
    </g>
  );
}

/** Dog companion as an SVG <g>. */
export function DogPixels({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  const pal: Record<string, string> = { d: "#a0703a", D: "#7a5229", e: "#1a120c", n: "#2b1a12" };
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="pixelated">
      {DOG.flatMap((row, ry) =>
        row.split("").map((c, rx) =>
          c === "." ? null : <rect key={`${rx}-${ry}`} x={rx} y={ry} width={1.02} height={1.02} fill={pal[c]} />,
        ),
      )}
      <g className="anim-wag">
        <rect x={0} y={3} width={1.02} height={1.02} fill={pal.d} />
        <rect x={-1} y={2} width={1.02} height={1.02} fill={pal.d} />
      </g>
    </g>
  );
}

/** Standalone sprite (e.g. reveal screen, end card). */
export default function CharacterSprite({
  appearance,
  hygiene,
  sick,
  size = 96,
  dog = false,
}: {
  appearance: Appearance;
  hygiene?: number;
  sick?: boolean;
  size?: number;
  dog?: boolean;
}) {
  return (
    <svg
      viewBox={dog ? "0 0 32 24" : "0 0 16 24"}
      width={dog ? size * 2 : size}
      height={size * 1.5}
      className="pixelated"
      aria-hidden
    >
      <CharacterPixels appearance={appearance} hygiene={hygiene} sick={sick} />
      {dog && <DogPixels x={17} y={14} />}
    </svg>
  );
}
