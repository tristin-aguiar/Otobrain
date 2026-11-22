import { parseMarkdown } from "@/lib/format";

// Renders **bold** and [links](https://…) inside a line of text. No raw HTML is ever inserted.
function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else parts.push(<a key={m.index} href={m[3]} target="_blank" rel="noreferrer">{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="prose">
      {parseMarkdown(text).map((n, i) =>
        n.t === "ul" ? (
          <ul key={i}>{n.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>
        ) : n.t === "h2" ? (
          <h2 key={i}><Inline text={n.text} /></h2>
        ) : n.t === "h3" ? (
          <h3 key={i}><Inline text={n.text} /></h3>
        ) : (
          <p key={i}><Inline text={n.text} /></p>
        )
      )}
    </div>
  );
}
