// Simplified SVG flags, drawn in code. Flag emoji don't render on Windows,
// so the UI uses these instead (the OG image keeps emoji, which Satori renders via Twemoji).

const CITY_ISO: Record<string, string> = {
  bangkok: "TH",
  mumbai: "IN",
  manila: "PH",
  jakarta: "ID",
  dhaka: "BD",
  lagos: "NG",
  cairo: "EG",
  sao_paulo: "BR",
  mexico_city: "MX",
  los_angeles: "US",
  new_york: "US",
  london: "GB",
  paris: "FR",
  tokyo: "JP",
  istanbul: "TR",
};

const H = (y: number, h: number, f: string) => <rect x={0} y={y} width={30} height={h} fill={f} />;
const V = (x: number, w: number, f: string) => <rect x={x} y={0} width={w} height={20} fill={f} />;

function body(iso: string) {
  switch (iso) {
    case "TH":
      return <>{H(0, 20, "#a51931")}{H(3.33, 13.33, "#f4f5f8")}{H(6.67, 6.67, "#2d2a4a")}</>;
    case "IN":
      return (
        <>
          {H(0, 6.67, "#ff9933")}{H(6.67, 6.67, "#ffffff")}{H(13.33, 6.67, "#138808")}
          <circle cx={15} cy={10} r={2.4} fill="none" stroke="#000080" strokeWidth={0.6} />
        </>
      );
    case "PH":
      return (
        <>
          {H(0, 10, "#0038a8")}{H(10, 10, "#ce1126")}
          <polygon points="0,0 17,10 0,20" fill="#ffffff" />
          <circle cx={5.5} cy={10} r={2} fill="#fcd116" />
        </>
      );
    case "ID":
      return <>{H(0, 10, "#ce1126")}{H(10, 10, "#ffffff")}</>;
    case "BD":
      return <>{H(0, 20, "#006a4e")}<circle cx={13.5} cy={10} r={5.5} fill="#f42a41" /></>;
    case "NG":
      return <>{V(0, 10, "#008751")}{V(10, 10, "#ffffff")}{V(20, 10, "#008751")}</>;
    case "EG":
      return (
        <>
          {H(0, 6.67, "#ce1126")}{H(6.67, 6.67, "#ffffff")}{H(13.33, 6.67, "#000000")}
          <rect x={13.5} y={8} width={3} height={4} fill="#c09300" />
        </>
      );
    case "BR":
      return (
        <>
          {H(0, 20, "#009c3b")}
          <polygon points="15,2.5 27,10 15,17.5 3,10" fill="#ffdf00" />
          <circle cx={15} cy={10} r={4.2} fill="#002776" />
        </>
      );
    case "MX":
      return (
        <>
          {V(0, 10, "#006847")}{V(10, 10, "#ffffff")}{V(20, 10, "#ce1126")}
          <circle cx={15} cy={10} r={2} fill="#8c5a2b" />
        </>
      );
    case "US":
      return (
        <>
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={0} y={i * (20 / 6.5)} width={30} height={20 / 13} fill="#b22234" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={`w${i}`} x={0} y={i * (20 / 6.5) + 20 / 13} width={30} height={20 / 13} fill="#ffffff" />
          ))}
          <rect x={0} y={0} width={12} height={10.77} fill="#3c3b6e" />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={`s${i}`} x={1.5 + (i % 4) * 2.8} y={1.5 + Math.floor(i / 4) * 3.2} width={0.9} height={0.9} fill="#fff" />
          ))}
        </>
      );
    case "GB":
      return (
        <>
          {H(0, 20, "#012169")}
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" strokeWidth={4} />
          <path d="M0,0 L30,20 M30,0 L0,20" stroke="#c8102e" strokeWidth={1.4} />
          <path d="M15,0 V20 M0,10 H30" stroke="#ffffff" strokeWidth={6} />
          <path d="M15,0 V20 M0,10 H30" stroke="#c8102e" strokeWidth={3.4} />
        </>
      );
    case "FR":
      return <>{V(0, 10, "#0055a4")}{V(10, 10, "#ffffff")}{V(20, 10, "#ef4135")}</>;
    case "JP":
      return <>{H(0, 20, "#ffffff")}<circle cx={15} cy={10} r={6} fill="#bc002d" /></>;
    case "TR":
      return (
        <>
          {H(0, 20, "#e30a17")}
          <circle cx={11} cy={10} r={5} fill="#ffffff" />
          <circle cx={12.3} cy={10} r={4} fill="#e30a17" />
          <polygon points="17.5,10 20.5,8.9 19.1,11.7 19.1,8.3 20.5,11.1" fill="#ffffff" />
        </>
      );
    default:
      return H(0, 20, "#555");
  }
}

export default function Flag({ cityId, size = 24, className = "" }: { cityId: string; size?: number; className?: string }) {
  const iso = CITY_ISO[cityId] ?? "";
  return (
    <svg
      viewBox="0 0 30 20"
      width={size}
      height={(size * 2) / 3}
      className={`inline-block shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/30 ${className}`}
      role="img"
      aria-label={iso}
    >
      {body(iso)}
    </svg>
  );
}
