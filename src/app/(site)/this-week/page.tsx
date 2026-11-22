import { PostFeed, NAME } from "@/components/posts";

export const metadata = { title: NAME };

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  return <PostFeed cat={(await searchParams).cat} />;
}
