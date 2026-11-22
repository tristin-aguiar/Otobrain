import { PostEditor } from "@/components/posts";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  return <PostEditor slug={slug} error={error} />;
}
