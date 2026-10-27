import { ImageResponse } from "next/og";

export const runtime = "edge";

const RARITY_BG: Record<string, string> = {
  common: "#57534e",
  uncommon: "#047857",
  rare: "#0369a1",
  epic: "#a21caf",
  legendary: "#f59e0b",
};

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

/** Fetch a Google Font subset containing only the glyphs we need. Fails soft. */
async function googleFont(family: string, weight: 400 | 700, text: string): Promise<FontDef | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } })).text();
    const m = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    if (!res.ok) return null;
    return { name: family, data: await res.arrayBuffer(), weight, style: "normal" };
  } catch {
    return null;
  }
}


// Satori has no mark-to-mark positioning, so a Thai tone mark stacked on an upper vowel
// (e.g. ตื่น, ที่) is drawn inside the vowel and disappears. For those clusters we draw the
// vowel cluster normally and overlay the tone mark, taken from "อ + mark" in a clipped,
// raised box so only the mark shows.
const STACKED = /^(.*[ัิ-ื็])([่-์])$/;
const NEEDS_FIX = /[ัิ-ื็][่-์]/;

function clusters(s: string): string[] {
  return s.match(/[^ัิ-ฺ็-๎][ัิ-ฺ็-๎]*|[sS]/g) ?? [];
}

function Txt({ text, size, style }: { text: string; size: number; style?: React.CSSProperties }) {
  if (!NEEDS_FIX.test(text)) return <div style={{ display: "flex", fontSize: size, ...style }}>{text}</div>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", fontSize: size, ...style }}>
      {clusters(text).map((c, i) => {
        if (c === " ") return <div key={i} style={{ display: "flex", width: size * 0.3 }} />;
        const m = c.match(STACKED);
        if (!m) return <div key={i} style={{ display: "flex" }}>{c}</div>;
        return (
          <div key={i} style={{ display: "flex", position: "relative" }}>
            {m[1]}
            <div style={{ display: "flex", position: "absolute", right: -size * 0.02, top: -size * 0.24, width: size * 0.6, height: size * 0.42, overflow: "hidden", justifyContent: "flex-end" }}>
              <div style={{ display: "flex", lineHeight: 1 }}>{"อ" + m[2]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export async function GET(req: Request) {
  const { searchParams, host } = new URL(req.url);
  const get = (k: string, d = "") => (searchParams.get(k) ?? d).slice(0, 160);

  const isCard = searchParams.has("ending");
  const lang = get("lang", "en");
  const flag = get("flag", "🌏");
  const city = get("city");
  const name = get("name");
  const age = get("age");
  const ending = get("ending");
  const icon = get("icon", "🕯️");
  const rarity = get("rarity", "common");
  const rarityLabel = get("rarityLabel", rarity);
  const line = get("line");
  const stats = [get("s1"), get("s2"), get("s3")].filter(Boolean);
  const score = get("score");
  const scoreLabel = get("scoreLabel", "score");
  const rank = get("rank");
  const tagline =
    lang === "th"
      ? "คุณเลือกไม่ได้ว่าจะล้มลงตรงไหน เลือกได้แค่ว่าจะทำอะไรต่อ"
      : "You don't choose where you fall. Only what you do next.";
  const subtitle = lang === "th" ? "จำลองชีวิตบนทางเท้า" : "A Street Life Simulator";

  const allText = [city, name, age, ending, rarityLabel, line, ...stats, score, scoreLabel, rank, tagline, subtitle, host, "SPARE CHANGE“”·#🏆อ่้๊๋์"].join(" ");
  const fonts = (
    await Promise.all([
      googleFont("Kanit", 400, allText),
      googleFont("Kanit", 700, allText),
      googleFont("Pixelify Sans", 700, "SPARE CHANGE"),
    ])
  ).filter((f): f is FontDef => f !== null);

  const bg = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    background: "linear-gradient(160deg, #1e1914 0%, #0b0907 60%, #14110d 100%)",
    color: "#f3eadf",
    fontFamily: "Kanit",
    padding: "56px 64px",
    position: "relative" as const,
  };

  const brand = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
      <div style={{ display: "flex", fontFamily: "Pixelify Sans", fontSize: 40, fontWeight: 700, color: "#ffd28a" }}>SPARE CHANGE</div>
      <Txt text={subtitle} size={22} style={{ color: "#a8a29e" }} />
    </div>
  );

  const glow = (
    <div
      style={{
        position: "absolute",
        right: -120,
        top: -120,
        width: 520,
        height: 520,
        borderRadius: 9999,
        background: "radial-gradient(circle, rgba(255,181,71,0.35) 0%, rgba(255,181,71,0) 70%)",
        display: "flex",
      }}
    />
  );

  if (!isCard) {
    return new ImageResponse(
      (
        <div style={bg}>
          {glow}
          {brand}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: 110, gap: 12 }}>🇹🇭 🇮🇳 🇵🇭 🇳🇬 🇧🇷 🇺🇸 🇯🇵</div>
            <Txt text={tagline} size={44} style={{ marginTop: 30, maxWidth: 980 }} />
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#a8a29e" }}>{host}</div>
        </div>
      ),
      { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
    );
  }

  return new ImageResponse(
    (
      <div style={bg}>
        {glow}
        {brand}
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48, marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
            <div style={{ display: "flex", fontSize: 150 }}>{flag}</div>
            <Txt text={city} size={30} style={{ marginTop: 8, color: "#e7e5e4" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Txt text={`${name} · ${age}`} size={30} style={{ color: "#d6d3d1" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
              <div style={{ display: "flex", fontSize: 64 }}>{icon}</div>
              <Txt text={ending} size={58} style={{ fontWeight: 700, color: "#ffd28a", lineHeight: 1.1, maxWidth: 680 }} />
            </div>
            <div style={{ display: "flex", marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  background: RARITY_BG[rarity] ?? "#57534e",
                  color: rarity === "legendary" ? "#000" : "#fff",
                  fontSize: 22,
                  fontWeight: 700,
                  padding: "4px 18px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                }}
              >
                <Txt text={rarityLabel} size={22} />
              </div>
            </div>
            {line && (
              <Txt text={`“${line}”`} size={32} style={{ marginTop: 26, color: "#f5f5f4", maxWidth: 720 }} />
            )}
            {score && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 24 }}>
                <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#fbbf24" }}>{`🏆 ${score}`}</div>
                <Txt text={rank ? `${scoreLabel} · ${rank}` : scoreLabel} size={24} style={{ color: "#d6d3d1" }} />
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {stats.map((s) => (
              <div
                key={s}
                style={{ display: "flex", fontSize: 26, padding: "8px 18px", borderRadius: 12, background: "rgba(255,255,255,0.07)", color: "#fde68a" }}
              >
                <Txt text={s} size={26} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#a8a29e" }}>{host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined },
  );
}
