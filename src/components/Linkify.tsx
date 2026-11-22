import Link from "next/link";

// Makes web links (https://…) and site pages (/pathology/…) clickable inside plain text.
export default function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+|(?:^|(?<=\s))\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>
        ) : /^\/[a-z0-9-]/.test(p) ? (
          <Link key={i} href={p}>{p}</Link>
        ) : (
          p
        )
      )}
    </>
  );
}
