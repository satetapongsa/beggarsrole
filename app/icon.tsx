import { ImageResponse } from "next/og";
import { LampIcon } from "@/lib/icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon() {
  return new ImageResponse(<LampIcon size={64} />, size);
}
