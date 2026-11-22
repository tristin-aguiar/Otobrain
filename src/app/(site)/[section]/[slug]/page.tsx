import { LibraryEntry } from "@/components/library";

export default async function Page({ params, searchParams }: { params: Promise<{ section: string; slug: string }>; searchParams: Promise<{ f?: string; d?: string }> }) {
  const [{ section, slug }, { f, d }] = await Promise.all([params, searchParams]);
  return <LibraryEntry sectionKey={section} slug={slug} filter={f} depth={d} />;
}
