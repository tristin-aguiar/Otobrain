import { LibraryIndex, getSection } from "@/components/library";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  return { title: getSection((await params).section).title };
}

export default async function Page({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ f?: string }> }) {
  const [{ section }, { f }] = await Promise.all([params, searchParams]);
  return <LibraryIndex sectionKey={section} filter={f} />;
}
