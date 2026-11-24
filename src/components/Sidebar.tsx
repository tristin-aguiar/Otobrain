"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

type Item = { href: string; label: string; soon?: boolean };

const featured: Item = { href: "/this-week", label: "This week in Otolaryngology" };
const tracking: Item[] = [
  { href: "/dashboard", label: "Dashboard", soon: true },
  { href: "/consults", label: "Consults", soon: true },
  { href: "/procedures", label: "Procedures", soon: true },
  { href: "/research", label: "Research", soon: true },
];
const library: Item[] = [
  { href: "/curriculum", label: "Curriculum" },
  { href: "/pathology", label: "Pathology" },
  { href: "/consult-guides", label: "Consult guides" },
  { href: "/radiology", label: "Radiology" },
  { href: "/basic-science", label: "Basic science" },
];

export default function Sidebar({
  name,
  program,
  isAdmin,
  theme,
  signOut,
}: {
  name: string;
  program: string | null;
  isAdmin: boolean;
  theme: "light" | "dark";
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Close the phone menu after moving to another page.
  useEffect(() => setOpen(false), [path]);
  const link = (it: Item) => {
    const active = path === it.href || path.startsWith(it.href + "/");
    if (it.soon) {
      return (
        <span key={it.href} className="nav-link" aria-disabled="true" style={{ opacity: 0.6 }}>
          {it.label}
          <span className="soon">Version 2</span>
        </span>
      );
    }
    return (
      <Link key={it.href} href={it.href} className={"nav-link" + (active ? " active" : "")} aria-current={active ? "page" : undefined}>
        {it.label}
      </Link>
    );
  };
  return (
    <nav className={"sidebar" + (open ? " open" : "")} aria-label="Main">
      <div className="sidebar-top">
      <Link href="/this-week" className="brand">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="7" fill="#0E6B6B" />
          <path d="M10 19c0-6 2-10 5-10s4 2 4 4-2 3-3 4-1 3-3 3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span className="brand-name">Otobrain</span>
          <span className="small muted" style={{ fontSize: 12 }}>
            Otolaryngology–HNS
          </span>
        </span>
      </Link>
      <button type="button" className="menu-button" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(!open)}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
        {open ? "Close" : "Menu"}
      </button>
      </div>

      <div className="nav-body" id="main-menu">
      <div className="nav-group">{link(featured)}</div>
      <div className="nav-group">
        <span className="nav-label">My tracking</span>
        {tracking.map(link)}
      </div>
      <div className="nav-group">
        <span className="nav-label">Shared library</span>
        {library.map(link)}
      </div>

      <div className="sidebar-foot">
        <ThemeToggle initial={theme} />
        <div className="row" style={{ gap: 10, padding: "12px 4px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <Link href="/account" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", textDecoration: "none" }}>
              {name}
            </Link>
            <span className="muted" style={{ fontSize: 12 }}>
              {isAdmin ? "Admin" : program || "Set your program"}
            </span>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
      </div>
    </nav>
  );
}
