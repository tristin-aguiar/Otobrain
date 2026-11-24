"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/server";
import { FIELD_ORDER, parseGuides } from "@/lib/guide-import";
import { slugify } from "@/lib/format";

export type ImportResult = { title: string; status: "created" | "updated" | "skipped" | "error"; slug?: string; message?: string };

// decisions[i] applies to the i-th guide in the pasted text.
export async function importGuides(text: string, decisions: ("create" | "update" | "skip")[]): Promise<ImportResult[]> {
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) return [{ title: "", status: "error", message: "Only the site admin can import guides." }];

  const guides = parseGuides(text);
  const [{ data: subsites }, { data: existing }] = await Promise.all([
    supabase.from("subsites").select("id, name"),
    supabase.from("consult_guides").select("id, slug, title"),
  ]);
  const results: ImportResult[] = [];

  for (let i = 0; i < guides.length; i++) {
    const g = guides[i];
    const decision = decisions[i] ?? "skip";
    if (!g.title) {
      results.push({ title: "(untitled)", status: "error", message: "Missing title line" });
      continue;
    }
    if (decision === "skip") {
      results.push({ title: g.title, status: "skipped" });
      continue;
    }
    const row: Record<string, unknown> = {};
    for (const f of FIELD_ORDER) {
      const v = g.fields[f.key];
      if (v === undefined) continue;
      row[f.key] = f.kind === "text" ? (v as string[]).join("\n") : v;
    }
    if (g.subspecialty) row.subspecialty = g.subspecialty;
    if (g.urgency) row.urgency = g.urgency;
    if (g.subsite) {
      const sid = subsites?.find((s) => s.name.toLowerCase() === g.subsite!.toLowerCase())?.id;
      if (sid) row.subsite_id = sid;
    }
    const slug = slugify(g.title);
    const match = existing?.find((e) => e.slug === slug || e.title.toLowerCase() === g.title.toLowerCase());

    if (decision === "update" && match) {
      const { error } = await supabase.from("consult_guides").update(row).eq("id", match.id);
      results.push(error ? { title: g.title, status: "error", message: error.message } : { title: g.title, status: "updated", slug: match.slug });
    } else {
      let finalSlug = slug;
      if (existing?.some((e) => e.slug === finalSlug)) finalSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const { error } = await supabase.from("consult_guides").insert({
        ...row,
        title: g.title,
        slug: finalSlug,
        urgency: row.urgency ?? "Urgent",
        published: false,
      });
      results.push(error ? { title: g.title, status: "error", message: error.message } : { title: g.title, status: "created", slug: finalSlug });
    }
  }
  revalidatePath("/consult-guides", "layout");
  return results;
}
