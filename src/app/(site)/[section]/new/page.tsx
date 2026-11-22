import { LibraryEditor } from "@/components/library";

export default async function Page({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ section }, { error }] = await Promise.all([params, searchParams]);
  return <LibraryEditor sectionKey={section} error={error} />;
}
