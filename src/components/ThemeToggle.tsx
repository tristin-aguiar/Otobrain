"use client";

import { useState } from "react";

// Night mode switch. Remembered in a cookie so every page loads in the right theme.
export default function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [dark, setDark] = useState(initial === "dark");
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("t-dark", next);
    document.documentElement.classList.toggle("t-light", !next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <button type="button" className="theme-switch" onClick={toggle} aria-pressed={dark}>
      <span className="row" style={{ gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Night mode
      </span>
      <span className="track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
