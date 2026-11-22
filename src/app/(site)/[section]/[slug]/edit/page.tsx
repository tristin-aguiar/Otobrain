import { LibraryEditor } from "@/components/library";

export default async function Page({ params, searchParams }: { params: Promise<{ section: string; slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ section, slug }, { error }] = await Promise.all([params, searchParams]);
  return <LibraryEditor sectionKey={section} slug={slug} error={error} />;
}
