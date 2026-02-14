"use client";

import { useEffect } from "react";

/**
 * Embed 頁專用：讓 html/body 背景透明，避免 iframe 出現白框。
 * 僅在 /embed 路由掛載時執行，unmount 時還原。
 */
export function TransparentBody() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    html.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
    };
  }, []);
  return null;
}
