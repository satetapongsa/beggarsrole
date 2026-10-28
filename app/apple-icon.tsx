import { ImageResponse } from "next/og";
import { LampIcon } from "@/lib/icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "edge";

export default function AppleIcon() {
  return new ImageResponse(<LampIcon size={180} />, size);
}
