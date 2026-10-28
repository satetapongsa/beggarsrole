// The app icon — a street lamp glowing over the pavement — drawn with plain boxes so next/og can
// render it at any size (favicon, Apple touch icon, PWA icons).

export function LampIcon({ size }: { size: number }) {
  const u = size / 32;
  const box = (x: number, y: number, w: number, h: number, bg: string) => (
    <div style={{ position: "absolute", left: x * u, top: y * u, width: w * u, height: h * u, background: bg }} />
  );
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        backgroundColor: "#0b0907",
        backgroundImage: "radial-gradient(circle at 47% 27%, #ffcf7a 0%, rgba(255,181,71,0.55) 18%, rgba(255,181,71,0) 52%)",
      }}
    >
      {box(19, 6, 2, 21, "#3a3229")}
      {box(13, 5, 8, 2, "#3a3229")}
      {box(13, 7, 4, 2, "#ffe2a0")}
      {box(0, 27, 32, 5, "#3a3026")}
      {box(6, 25, 10, 2, "#b88a55")}
      {box(8, 23, 3, 2, "#d8d2c4")}
    </div>
  );
}
