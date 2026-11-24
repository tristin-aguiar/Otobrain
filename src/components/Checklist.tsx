"use client";

import { useEffect, useState } from "react";

// Tick-as-you-go list. With a storageKey, ticks are kept on this device
// (so a phone reload mid-consult does not lose them) until Reset.
export default function Checklist({ items, storageKey, large }: { items: string[]; storageKey?: string; large?: boolean }) {
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  function update(next: Record<number, boolean>) {
    setDone(next);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  const count = items.filter((_, i) => done[i]).length;
  return (
    <div className="stack" style={{ gap: large ? 2 : 6 }}>
      <div className="between" style={{ alignItems: "center" }}>
        <span className="small muted">{count} of {items.length} checked</span>
        {count > 0 && (
          <button type="button" className="btn btn-sm" onClick={() => update({})}>Reset</button>
        )}
      </div>
      {items.map((label, i) => (
        <label
          key={i}
          className="check"
          style={large ? { minHeight: 48, alignItems: "center", fontSize: 16, padding: "4px 0", borderTop: i ? "1px solid var(--line)" : undefined } : undefined}
        >
          <input
            type="checkbox"
            checked={!!done[i]}
            onChange={() => update({ ...done, [i]: !done[i] })}
            style={large ? { width: 22, height: 22, margin: 0 } : undefined}
          />
          <span className={done[i] ? "done-text" : ""}>{label}</span>
        </label>
      ))}
    </div>
  );
}
