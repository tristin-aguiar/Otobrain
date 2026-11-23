import Link from "next/link";

// Lightweight formatting for library text, written the way it should look:
//   ## Heading           larger heading      ### Subheading   smaller heading
//   - item / * item      bullet              1. item          numbered item
//   blank line           space between blocks
//   **bold**, https://… links, /pathology/… site links, [text](https://…)
// Any other line is shown as plain text on its own line. No HTML is ever inserted.

type Block =
  | { t: "h2" | "h3"; text: string }
  | { t: "ul" | "ol"; items: string[]; start?: number }
  | { t: "p"; lines: string[] }
  | { t: "gap"; size: number };

function parse(lines: string[]): Block[] {
  const out: Block[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const last = out[out.length - 1];
    if (!line.trim()) {
      if (last?.t === "gap") last.size += 1;
      else out.push({ t: "gap", size: 1 });
      continue;
    }
    let m;
    if ((m = line.match(/^\s*###\s+(.*)$/))) out.push({ t: "h3", text: m[1] });
    else if ((m = line.match(/^\s*#{1,2}\s+(.*)$/))) out.push({ t: "h2", text: m[1] });
    else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      if (last?.t === "ul") last.items.push(m[1]);
      else out.push({ t: "ul", items: [m[1]] });
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      if (last?.t === "ol") last.items.push(m[2]);
      else out.push({ t: "ol", items: [m[2]], start: Number(m[1]) });
    } else {
      if (last?.t === "p") last.lines.push(line.trim());
      else out.push({ t: "p", lines: [line.trim()] });
    }
  }
  // Drop leading and trailing gaps.
  while (out[0]?.t === "gap") out.shift();
  while (out[out.length - 1]?.t === "gap") out.pop();
  return out;
}

export function Inline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(https?:\/\/[^\s)]+)|((?:^|(?<=\s))\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = m.index;
    if (m[1]) nodes.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) nodes.push(m[3].startsWith("/") ? <Link key={k} href={m[3]}>{m[2]}</Link> : <a key={k} href={m[3]} target="_blank" rel="noreferrer">{m[2]}</a>);
    else if (m[4]) nodes.push(<a key={k} href={m[4]} target="_blank" rel="noreferrer">{m[4]}</a>);
    else if (m[5]) nodes.push(<Link key={k} href={m[5]}>{m[5]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export default function RichText({ lines, size = 16 }: { lines: string[] | string | null | undefined; size?: number }) {
  const arr = Array.isArray(lines) ? lines : (lines || "").split(/\r?\n/);
  const blocks = parse(arr);
  return (
    <div style={{ display: "flex", flexDirection: "column", fontSize: size, lineHeight: 1.55, color: "inherit" }}>
      {blocks.map((b, i) => {
        const prev = blocks[i - 1];
        const top = i === 0 || prev?.t === "gap" ? 0 : b.t === "h2" || b.t === "h3" ? 10 : 4;
        switch (b.t) {
          case "gap":
            return <div key={i} aria-hidden="true" style={{ height: 10 * b.size }} />;
          case "h2":
            return <h3 key={i} style={{ margin: `${top}px 0 2px`, fontSize: size + 3, fontWeight: 700, lineHeight: 1.3 }}><Inline text={b.text} /></h3>;
          case "h3":
            return <h4 key={i} style={{ margin: `${top}px 0 2px`, fontSize: size + 1, fontWeight: 600, lineHeight: 1.3 }}><Inline text={b.text} /></h4>;
          case "ul":
            return <ul key={i} style={{ margin: `${top}px 0 0`, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 4 }}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>;
          case "ol":
            return <ol key={i} start={b.start} style={{ margin: `${top}px 0 0`, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ol>;
          default:
            return <p key={i} style={{ margin: `${top}px 0 0` }}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}<Inline text={l} /></span>)}</p>;
        }
      })}
    </div>
  );
}
