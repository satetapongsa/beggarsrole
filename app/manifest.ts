import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SPARE CHANGE — A Street Life Simulator",
    short_name: "SPARE CHANGE",
    description: "A random life on the streets of one of 15 real cities. Survive, find your people, maybe find a way out.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0907",
    theme_color: "#0b0907",
    lang: "th",
    categories: ["games", "simulation"],
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
