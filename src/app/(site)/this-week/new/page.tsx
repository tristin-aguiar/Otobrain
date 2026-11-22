import { PostEditor } from "@/components/posts";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <PostEditor error={(await searchParams).error} />;
}
