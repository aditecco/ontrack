import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { marked } from "marked";
import type { Report } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

// ── Inline markdown parser ─────────────────────────────────────────────────────
// Handles **bold** and [link text](url) → shows link text only

type InlinePart = { text: string; bold?: boolean };

function parseInline(raw: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\([^)]+\)|([^*[\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m[1] !== undefined) parts.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) parts.push({ text: m[2] });
    else if (m[3] !== undefined) parts.push({ text: m[3] });
  }
  return parts.length > 0 ? parts : [{ text: raw }];
}

function InlineText({
  raw,
  style,
}: {
  raw: string;
  style: Record<string, unknown>;
}) {
  const parts = parseInline(raw);
  // If no formatting, skip nesting overhead
  if (parts.length === 1 && !parts[0].bold) {
    return <Text style={style}>{parts[0].text}</Text>;
  }
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.bold ? (
          <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 60,
    color: "#111827",
    lineHeight: 1.5,
  },
  h1Wrapper: {
    borderBottom: "1.5pt solid #d1d5db",
    marginBottom: 18,
    paddingBottom: 10,
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  meta: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 24,
  },
  h2: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginTop: 22,
    marginBottom: 8,
    color: "#111827",
  },
  h3: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 4,
    color: "#1d4ed8",
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 1.6,
    color: "#374151",
  },
  footer: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#9ca3af",
    marginTop: 6,
  },
  listRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 10,
  },
  bullet: {
    width: 14,
    fontSize: 11,
    color: "#6b7280",
  },
  listText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
    color: "#374151",
  },
  hr: {
    borderBottom: "1pt solid #e5e7eb",
    marginVertical: 16,
  },
  codeBlock: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    color: "#374151",
  },
});

// ── Token renderer ─────────────────────────────────────────────────────────────

function renderToken(token: ReturnType<typeof marked.lexer>[number], i: number) {
  switch (token.type) {
    case "heading": {
      // Strip markdown link from task headings: [Task Name](/tasks?id=X) → Task Name
      const text = (token as any).text.replace(/^\[(.+?)\]\([^)]+\)$/, "$1");

      if (token.depth === 1)
        return (
          <View key={i} style={S.h1Wrapper}>
            <Text style={S.h1}>{text}</Text>
          </View>
        );
      if (token.depth === 2)
        return (
          <Text key={i} style={S.h2}>
            {text}
          </Text>
        );
      // depth 3 — task names
      return (
        <Text key={i} style={S.h3}>
          {text}
        </Text>
      );
    }

    case "paragraph": {
      const raw = (token as any).text as string;
      // Detect italic-only paragraphs like *Generated on ...*
      if (/^\*[^*]/.test(raw)) {
        return (
          <Text key={i} style={S.footer}>
            {raw.replace(/^\*(.+)\*$/, "$1")}
          </Text>
        );
      }
      return <InlineText key={i} raw={raw} style={S.paragraph} />;
    }

    case "list": {
      return (
        <View key={i} style={{ marginBottom: 10 }}>
          {(token as any).items.map((item: any, j: number) => (
            <View key={j} style={S.listRow}>
              <Text style={S.bullet}>•</Text>
              <InlineText raw={item.text} style={S.listText} />
            </View>
          ))}
        </View>
      );
    }

    case "hr":
      return <View key={i} style={S.hr} />;

    case "space":
      return <View key={i} style={{ height: 6 }} />;

    case "code":
      return (
        <View key={i} style={S.codeBlock}>
          <Text style={S.code}>{(token as any).text}</Text>
        </View>
      );

    default:
      return null;
  }
}

// ── Document ───────────────────────────────────────────────────────────────────

interface Props {
  report: Report;
}

export function ReportPDFDocument({ report }: Props) {
  const tokens = marked.lexer(report.content);

  return (
    <Document title={report.title} author="OnTrack">
      <Page size="A4" style={S.page}>
        {tokens.map((token, i) => renderToken(token, i))}
        <View style={{ marginTop: 24 }}>
          <Text style={S.meta}>
            Period: {formatDate(report.dateRange.from)} –{" "}
            {formatDate(report.dateRange.to)} · Generated{" "}
            {formatDateTime(report.createdAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
