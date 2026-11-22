"use client";

import { useState } from "react";

// Tick-as-you-go list (e.g. a radiology search pattern). Not saved; resets on reload.
export default function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const count = items.filter((_, i) => done[i]).length;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="small muted">Check off as you go · {count} of {items.length}</span>
      {items.map((label, i) => (
        <label key={i} className="check">
          <input type="checkbox" checked={!!done[i]} onChange={() => setDone({ ...done, [i]: !done[i] })} />
          <span className={done[i] ? "done-text" : ""}>{label}</span>
        </label>
      ))}
    </div>
  );
}
