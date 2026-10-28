// PWA icons for the web manifest: /pwa-icon?size=192 or 512.
import { ImageResponse } from "next/og";
import { LampIcon } from "@/lib/icon";

export const runtime = "edge";

export function GET(req: Request) {
  const size = new URL(req.url).searchParams.get("size") === "512" ? 512 : 192;
  return new ImageResponse(<LampIcon size={size} />, {
    width: size,
    height: size,
    headers: { "cache-control": "public, max-age=604800, immutable" },
  });
}
