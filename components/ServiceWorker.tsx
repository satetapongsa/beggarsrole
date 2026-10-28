"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production so the game works offline once it has loaded. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* unsupported or blocked — the game still works online */
    });
  }, []);
  return null;
}
