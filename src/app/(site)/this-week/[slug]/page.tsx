import { PostView } from "@/components/posts";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PostView slug={(await params).slug} />;
}
