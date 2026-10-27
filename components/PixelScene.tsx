// The street scene, drawn entirely in inline SVG rects/polygons (no image assets).
// Layers: sky → skyline → spot landmark → wall → sidewalk → character/dog → weather → phase tint → lamp glow.

import { CharacterPixels, DogPixels } from "@/components/CharacterSprite";
import type { AgeGroup, Appearance, Phase, SceneKind, Weather } from "@/types/game";

interface Props {
  scene: SceneKind;
  phase: Phase;
  weather: Weather;
  appearance: Appearance;
  hygiene: number;
  sick: boolean;
  dog: boolean;
  ageGroup: AgeGroup;
  festival: boolean;
  label?: string;
}

const W = 160;
const H = 100;
const GROUND = 74;

type RectProps = { x: number; y: number; w: number; h: number; f: string; o?: number };
const R = ({ x, y, w, h, f, o }: RectProps) => <rect x={x} y={y} width={w} height={h} fill={f} opacity={o} />;

function skyColors(phase: Phase, weather: Weather): [string, string] {
  if (phase === "night") return weather === "storm" || weather === "rain" ? ["#0a0d16", "#1b2130"] : ["#070b1f", "#1d2547"];
  if (weather === "storm") return ["#3b4450", "#59636e"];
  if (weather === "rain") return ["#5d6b78", "#8592a0"];
  if (weather === "snow" || weather === "cold") return ["#9fb0c4", "#d5dde6"];
  if (weather === "heat") return ["#f08a3c", "#f7c98a"];
  if (phase === "morning") return ["#f2a65e", "#fbd8a5"];
  return ["#5f9fd1", "#a9d2ee"];
}

function windows(x: number, y: number, cols: number, rows: number, night: boolean, seed: number) {
  const out: JSX.Element[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const lit = night ? (c * 7 + r * 13 + seed) % 3 !== 0 : false;
      out.push(
        <rect key={`${x}-${r}-${c}`} x={x + c * 4} y={y + r * 5} width={2} height={3} fill={lit ? "#ffd27a" : night ? "#1d2235" : "#9cc3dd"} />,
      );
    }
  return out;
}

function Landmark({ scene, night }: { scene: SceneKind; night: boolean }) {
  switch (scene) {
    case "temple":
      return (
        <g>
          <R x={52} y={44} w={56} h={14} f="#d9c7a3" />
          <polygon points="44,46 80,30 116,46" fill="#b23a2a" />
          <polygon points="54,36 80,22 106,36" fill="#c8862a" />
          <polygon points="64,28 80,14 96,28" fill="#b23a2a" />
          <R x={79} y={6} w={2} h={9} f="#e8b64a" />
          {[56, 66, 92, 102].map((x) => (
            <R key={x} x={x} y={46} w={3} h={12} f="#a8432e" />
          ))}
          <R x={74} y={48} w={12} h={10} f="#5a2a1a" />
        </g>
      );
    case "station":
      return (
        <g>
          <R x={30} y={30} w={100} h={28} f="#8b8f99" />
          <R x={30} y={26} w={100} h={5} f="#5d6170" />
          <R x={66} y={14} w={28} h={12} f="#8b8f99" />
          <circle cx={80} cy={20} r={4} fill="#f1efe6" />
          <R x={79.5} y={17} w={1} h={3} f="#222" />
          <R x={80} y={19.5} w={2} h={1} f="#222" />
          {[36, 50, 98, 112].map((x) => (
            <R key={x} x={x} y={36} w={10} h={14} f={night ? "#ffd27a" : "#3d4a5c"} />
          ))}
          <R x={68} y={36} w={24} h={22} f="#2c3340" />
          <R x={62} y={30} w={36} h={5} f="#1e4f8f" />
          <R x={66} y={31.5} w={28} h={2} f="#e6eefb" o={0.85} />
        </g>
      );
    case "market":
      return (
        <g>
          {[
            [18, "#c2382f"],
            [62, "#2f6fb0"],
            [106, "#3c8a45"],
          ].map(([x, c]) => (
            <g key={x as number}>
              <R x={(x as number) + 2} y={44} w={2} h={16} f="#5a4030" />
              <R x={(x as number) + 32} y={44} w={2} h={16} f="#5a4030" />
              {Array.from({ length: 6 }).map((_, i) => (
                <R key={i} x={(x as number) + i * 6} y={38} w={6} h={7} f={i % 2 ? "#f2ebdc" : (c as string)} />
              ))}
              <R x={(x as number) + 4} y={52} w={28} h={6} f="#8a6a44" />
              <R x={(x as number) + 6} y={50} w={5} h={3} f="#e2a03a" />
              <R x={(x as number) + 14} y={50} w={5} h={3} f="#d2453a" />
              <R x={(x as number) + 22} y={50} w={5} h={3} f="#6db04a" />
            </g>
          ))}
          {night &&
            [20, 60, 100, 140].map((x) => <circle key={x} cx={x} cy={36} r={1.2} fill="#ffd27a" />)}
        </g>
      );
    case "skyscraper":
      return (
        <g>
          <R x={10} y={14} w={26} h={46} f="#4a5568" />
          {windows(13, 17, 6, 8, night, 1)}
          <R x={44} y={4} w={30} h={56} f="#2f3b4d" />
          {windows(47, 8, 7, 10, night, 2)}
          <R x={84} y={20} w={24} h={40} f="#56627a" />
          {windows(87, 23, 5, 7, night, 3)}
          <R x={116} y={10} w={34} h={50} f="#3a4558" />
          {windows(119, 14, 8, 9, night, 4)}
          <R x={58} y={0} w={2} h={5} f="#cc3b3b" />
        </g>
      );
    case "bridge":
      return (
        <g>
          <R x={0} y={50} w={160} h={10} f={night ? "#14243a" : "#3e7ca8"} />
          <path d="M10 50 Q80 10 150 50" stroke="#7d8794" strokeWidth={3} fill="none" />
          <R x={0} y={44} w={160} h={3} f="#6b7480" />
          {Array.from({ length: 16 }).map((_, i) => (
            <R key={i} x={6 + i * 10} y={30 + Math.abs(7.5 - i) * 2} w={1} h={14 - Math.abs(7.5 - i) * 2} f="#9aa3ae" />
          ))}
          <R x={18} y={40} w={6} h={20} f="#5c6570" />
          <R x={136} y={40} w={6} h={20} f="#5c6570" />
        </g>
      );
    case "plaza":
      return (
        <g>
          <R x={20} y={34} w={120} h={24} f="#cfc2a8" />
          {[26, 42, 58, 94, 110, 126].map((x) => (
            <R key={x} x={x} y={38} w={6} h={20} f="#b3a68c" />
          ))}
          <R x={20} y={30} w={120} h={5} f="#a89a7d" />
          <R x={66} y={50} w={28} h={8} f="#8aa4b5" />
          <R x={72} y={44} w={16} h={6} f="#b0c4d1" />
          <R x={78} y={36} w={4} h={8} f="#d6e3ea" />
          <circle cx={80} cy={35} r={2} fill="#e6f2f8" opacity={0.8} />
        </g>
      );
    case "mosque":
      return (
        <g>
          <R x={44} y={40} w={72} h={20} f="#e5dccb" />
          <ellipse cx={80} cy={40} rx={20} ry={16} fill="#3f8d84" />
          <R x={60} y={40} w={40} h={3} f="#d6cbb5" />
          <R x={79} y={18} w={2} h={6} f="#e8b64a" />
          {[30, 124].map((x) => (
            <g key={x}>
              <R x={x} y={14} w={6} h={46} f="#e5dccb" />
              <polygon points={`${x},14 ${x + 3},4 ${x + 6},14`} fill="#3f8d84" />
              <R x={x - 1} y={26} w={8} h={2} f="#cfc4ad" />
            </g>
          ))}
          <path d="M72 60 V50 Q80 42 88 50 V60 Z" fill="#5c3b26" />
          {[52, 100].map((x) => (
            <R key={x} x={x} y={46} w={6} h={8} f={night ? "#ffd27a" : "#2f5f78"} />
          ))}
        </g>
      );
    case "church":
      return (
        <g>
          <R x={50} y={30} w={60} h={30} f="#cbb89a" />
          <polygon points="50,30 80,14 110,30" fill="#8a6a50" />
          <R x={74} y={2} w={12} h={16} f="#cbb89a" />
          <polygon points="74,2 80,-6 86,2" fill="#8a6a50" />
          <circle cx={80} cy={36} r={5} fill={night ? "#ffcf6a" : "#6e4b8c"} />
          <circle cx={80} cy={36} r={2} fill={night ? "#ffe9b0" : "#a678c4"} />
          <path d="M72 60 V50 Q80 42 88 50 V60 Z" fill="#4a2f22" />
          {[56, 98].map((x) => (
            <R key={x} x={x} y={42} w={6} h={10} f={night ? "#ffd27a" : "#3a4f6b"} />
          ))}
        </g>
      );
    case "park":
      return (
        <g>
          {[22, 62, 112, 142].map((x, i) => (
            <g key={x}>
              <R x={x} y={40} w={4} h={20} f="#5a3e28" />
              <R x={x - 10} y={22 + (i % 2) * 4} w={24} h={14} f="#3f7a3a" />
              <R x={x - 6} y={16 + (i % 2) * 4} w={16} h={8} f="#4f8f45" />
              <R x={x - 12} y={30 + (i % 2) * 4} w={28} h={6} f="#356a31" />
            </g>
          ))}
          <R x={84} y={52} w={20} h={2} f="#7a5434" />
          <R x={84} y={48} w={20} h={2} f="#7a5434" />
          <R x={86} y={54} w={1} h={5} f="#3d2c20" />
          <R x={101} y={54} w={1} h={5} f="#3d2c20" />
        </g>
      );
    case "beach":
      return (
        <g>
          <R x={0} y={42} w={160} h={18} f={night ? "#13243d" : "#3c8fc0"} />
          <R x={0} y={42} w={160} h={2} f={night ? "#2a3d5a" : "#8fd0ef"} />
          <circle cx={130} cy={24} r={8} fill={night ? "#f3f0d8" : "#ffe08a"} opacity={0.9} />
          <R x={24} y={28} w={3} h={32} f="#7a5434" />
          <polygon points="25,28 10,32 25,26 40,32" fill="#3f8a3a" />
          <polygon points="25,27 16,22 25,25 34,22" fill="#4f9f45" />
          <R x={60} y={52} w={12} h={2} f="#f2f2f2" />
          <R x={64} y={46} w={1} h={6} f="#f2f2f2" />
          <polygon points="65,46 72,51 65,51" fill="#e04a3a" />
        </g>
      );
    case "harbor":
      return (
        <g>
          <R x={0} y={44} w={160} h={16} f={night ? "#102033" : "#2f6d93"} />
          {Array.from({ length: 10 }).map((_, i) => (
            <R key={i} x={8 + i * 16} y={48 + (i % 3)} w={6} h={1} f={night ? "#2a4766" : "#7fb6d6"} />
          ))}
          <R x={80} y={36} w={40} h={6} f="#b3462f" />
          <R x={86} y={30} w={18} h={6} f="#e8e2d2" />
          <R x={92} y={20} w={2} h={10} f="#6b4a33" />
          <R x={20} y={40} w={50} h={3} f="#7a5434" />
          {[22, 34, 46, 58].map((x) => (
            <R key={x} x={x} y={43} w={2} h={10} f="#5a3e28" />
          ))}
        </g>
      );
    case "street":
    default:
      return (
        <g>
          {[
            [10, "#9a5b4a", "#e0b04a"],
            [48, "#5b7a8a", "#d2453a"],
            [86, "#8a7a5a", "#3c8a95"],
            [124, "#6b5a7a", "#f0e3c0"],
          ].map(([x, wall, sign]) => (
            <g key={x as number}>
              <R x={x as number} y={20} w={34} h={40} f={wall as string} />
              <R x={(x as number) + 3} y={24} w={28} h={6} f={sign as string} />
              <R x={(x as number) + 4} y={36} w={10} h={10} f={night ? "#ffd27a" : "#2b3a4d"} />
              <R x={(x as number) + 20} y={36} w={10} h={24} f="#3a2a1e" />
              {night && <R x={(x as number) + 3} y={24} w={28} h={6} f={sign as string} o={0.6} />}
            </g>
          ))}
        </g>
      );
  }
}

function Weather({ weather }: { weather: Weather }) {
  if (weather === "rain" || weather === "storm") {
    const drops = Array.from({ length: weather === "storm" ? 70 : 45 });
    return (
      <g>
        <g className="anim-rain">
          {drops.map((_, i) => {
            const x = (i * 37) % W;
            const y = (i * 53) % (H * 2) - H;
            return <rect key={i} x={x} y={y} width={0.6} height={4} fill="#c8d6e6" opacity={0.55} />;
          })}
        </g>
        {weather === "storm" && <rect className="anim-flash" x={0} y={0} width={W} height={H} fill="#f5f7ff" />}
      </g>
    );
  }
  if (weather === "snow") {
    return (
      <g className="anim-snow">
        {Array.from({ length: 60 }).map((_, i) => (
          <rect key={i} x={(i * 41) % (W + 20)} y={((i * 29) % (H * 2)) - H} width={1.2} height={1.2} fill="#fff" opacity={0.85} />
        ))}
      </g>
    );
  }
  if (weather === "heat") {
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <rect key={i} className="anim-shimmer" x={0} y={GROUND - 8 + i * 6} width={W} height={3} fill="#fff1d6" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </g>
    );
  }
  if (weather === "cold") {
    return <rect x={0} y={0} width={W} height={H} fill="#cfe3ff" opacity={0.12} />;
  }
  return null;
}

export default function PixelScene({ scene, phase, weather, appearance, hygiene, sick, dog, ageGroup, festival, label }: Props) {
  const night = phase === "night";
  const [skyTop, skyBottom] = skyColors(phase, weather);
  const scale = ageGroup === "child" ? 0.8 : 1;
  const charY = GROUND - 24 * scale + 4;
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-night-600 bg-night-900 shadow-inner">
      <svg viewBox={`0 0 ${W} ${H}`} className="pixelated block h-auto w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBottom} />
          </linearGradient>
          <pattern id="brick" width="8" height="4" patternUnits="userSpaceOnUse">
            <rect width="8" height="4" fill="#6e4a38" />
            <rect x="0" y="0" width="7.5" height="1.6" fill="#7d5641" />
            <rect x="-4" y="2" width="7.5" height="1.6" fill="#7a5340" />
            <rect x="4" y="2" width="7.5" height="1.6" fill="#7a5340" />
          </pattern>
          <pattern id="tiles" width="10" height="6" patternUnits="userSpaceOnUse">
            <rect width="10" height="6" fill="#8b8478" />
            <rect x="0" y="0" width="9.4" height="5.4" fill="#9c958a" />
          </pattern>
          <radialGradient id="lamp">
            <stop offset="0%" stopColor="#ffcf7a" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffb547" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="url(#sky)" />
        {night &&
          Array.from({ length: 18 }).map((_, i) => (
            <rect key={i} x={(i * 47) % W} y={(i * 13) % 30} width={0.8} height={0.8} fill="#fff" opacity={0.7} />
          ))}
        {/* distant skyline */}
        <g opacity={0.45}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={i * 14} y={30 + ((i * 7) % 15)} width={13} height={40} fill={night ? "#121a33" : "#6a7b8d"} />
          ))}
        </g>

        <Landmark scene={scene} night={night} />

        {festival && (
          <g>
            <path d="M0 8 Q40 18 80 8 Q120 18 160 8" stroke="#3a2a1e" strokeWidth={0.4} fill="none" />
            {Array.from({ length: 16 }).map((_, i) => (
              <polygon
                key={i}
                points={`${5 + i * 10},${9 + Math.sin(i) * 2} ${9 + i * 10},${9 + Math.sin(i) * 2} ${7 + i * 10},${13 + Math.sin(i) * 2}`}
                fill={["#e04a3a", "#f2c14a", "#3c8fc0", "#4f9f45"][i % 4]}
              />
            ))}
          </g>
        )}

        {/* wall + sidewalk */}
        <rect x={0} y={60} width={W} height={GROUND - 60} fill="url(#brick)" />
        <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="url(#tiles)" />
        <rect x={0} y={GROUND} width={W} height={1} fill="#5a5148" />
        <rect x={0} y={H - 6} width={W} height={6} fill="#3a3632" />

        {/* street lamp */}
        <rect x={140} y={34} width={2} height={GROUND - 34} fill="#2b2b2b" />
        <rect x={134} y={32} width={10} height={3} fill="#2b2b2b" />
        <rect x={134} y={35} width={4} height={2} fill={night ? "#ffe2a0" : "#c9c2b0"} />

        {/* cardboard + cup */}
        <rect x={56} y={GROUND + 2} width={32} height={4} fill="#b88a55" />
        <rect x={56} y={GROUND + 2} width={32} height={1} fill="#c99b64" />
        <rect x={60} y={GROUND - 2} width={5} height={5} fill="#d8d2c4" />
        <rect x={61} y={GROUND - 2} width={3} height={1} fill="#e8b64a" />

        <g className="anim-bob">
          <CharacterPixels appearance={appearance} hygiene={hygiene} sick={sick} x={66} y={charY} scale={scale} />
        </g>
        {dog && <DogPixels x={86} y={GROUND - 4} />}

        <Weather weather={weather} />

        {/* phase tint */}
        {phase === "morning" && <rect width={W} height={H} fill="#ffb26b" opacity={0.08} />}
        {night && <rect width={W} height={H} fill="#06081a" opacity={0.42} />}
        {night && <circle className="animate-flicker" cx={136} cy={44} r={34} fill="url(#lamp)" />}
      </svg>
    </div>
  );
}
