"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";
import { SECTIONS, type Section } from "@/lib/library";
import { parseBlocks, parseLines, parseQA, parseRows, parseSections, slugify } from "@/lib/format";

function readField(f: Section["fields"][number], formData: FormData) {
  const raw = formData.get(f.name);
  const text = raw == null ? "" : String(raw);
  switch (f.type) {
    case "lines": return parseLines(text);
    case "rich": {
      // Keep the text exactly as written: blank lines, bullets and headings included.
      const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      return lines;
    }
    case "sections": return parseSections(text).filter((s) => s.lines.some((l) => l.trim()));
    case "blocks": return parseBlocks(text).filter((b) => b.body.trim());
    case "qa": return parseQA(text);
    case "rows": return parseRows(text, f.rowKeys || []).filter((r) => Object.values(r).some(Boolean));
    case "subsite": return text ? Number(text) : null;
    case "date": return text || null;
    default: return text.trim() || null;
  }
}

export async function saveEntry(sectionKey: Section["key"], id: number | null, formData: FormData) {
  const sec = SECTIONS[sectionKey];
  const { supabase, user, isAdmin } = await getSessionProfile();
  if (!user || !isAdmin) throw new Error("Only the site admin can edit shared content.");

  const row: Record<string, unknown> = {};
  for (const f of sec.fields) row[f.name] = readField(f, formData);
  row.published = formData.get("published") === "on";
  if (formData.get("mark_reviewed") === "on") {
    row.reviewed_at = new Date().toISOString().slice(0, 10);
    row.reviewed_by = user.id;
  }
  const title = String(row[sec.titleField] || "").trim();
  if (!title) throw new Error("A title is required.");

  let slug = String(formData.get("slug") || "").trim();
  if (!slug) slug = slugify(title);
  row.slug = slug;

  const q = id
    ? supabase.from(sec.table).update(row).eq("id", id).select("slug").single()
    : supabase.from(sec.table).insert(row).select("slug").single();
  const { data, error } = await q;
  if (error) {
    const msg = error.code === "23505" ? "Another entry already uses that web name. Change the title or web name." : error.message;
    redirect(`/${sec.key}/${id ? formData.get("orig_slug") + "/edit" : "new"}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(`/${sec.key}`, "layout");
  redirect(`/${sec.key}/${data!.slug}`);
}

export async function deleteEntry(sectionKey: Section["key"], id: number) {
  const sec = SECTIONS[sectionKey];
  const { supabase, isAdmin } = await getSessionProfile();
  if (!isAdmin) throw new Error("Only the site admin can delete shared content.");
  await supabase.from(sec.table).delete().eq("id", id);
  revalidatePath(`/${sec.key}`, "layout");
  redirect(`/${sec.key}`);
}

export async function saveNote(itemType: string, itemId: number, path: string, formData: FormData) {
  const { supabase, user } = await getSessionProfile();
  if (!user) return;
  await supabase.from("notes").upsert({ user_id: user.id, item_type: itemType, item_id: itemId, body: String(formData.get("body") || "") });
  revalidatePath(path);
}
