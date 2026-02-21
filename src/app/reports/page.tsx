"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReportStore } from "@/store/useReportStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Code2, Download, FileText, FilePen, Trash2 } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import type { Report } from "@/lib/db";
import { TaskDrawer } from "@/components/TaskDrawer";

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { reports, fetchReports, deleteReport } = useReportStore();

  const [report, setReport] = useState<Report | null>(null);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Resolve report from URL param
  useEffect(() => {
    const reportId = searchParams.get("id");

    if (!reportId) {
      setReport(null);
      setSanitizedHtml("");
      return;
    }

    if (reports.length === 0) return;

    const found = reports.find((r) => r.id === Number(reportId));

    if (!found) {
      setReport(null);
      return;
    }

    setReport(found);
    setIsLoading(true);

    async function processMarkdown() {
      const rawHtml = await marked(found?.content ?? "");
      const sanitized = DOMPurify.sanitize(rawHtml);
      setSanitizedHtml(sanitized);
      setIsLoading(false);
    }

    processMarkdown();
  }, [reports, searchParams]);

  // Intercept task links → open TaskDrawer instead of navigating
  useEffect(() => {
    const el = articleRef.current;
    if (!el || !report) return;

    function handleClick(e: MouseEvent) {
      const link = (e.target as Element).closest<HTMLAnchorElement>(
        'a[href^="/tasks?id="]'
      );
      if (!link) return;
      e.preventDefault();
      const href = link.getAttribute("href") ?? link.href;
      const idStr = new URLSearchParams(href.split("?")[1]).get("id");
      if (idStr) setDrawerTaskId(Number(idStr));
    }

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [report, sanitizedHtml]);

  // ── Export helpers ────────────────────────────────────────────────────────────

  function handleExportMarkdown() {
    if (!report) return;
    const blob = new Blob([report.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  }

  function handleExportHtml() {
    if (!report) return;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 820px; margin: 0 auto; padding: 48px 24px; color: #111827; line-height: 1.6; }
    h1 { font-size: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: .5rem; margin-bottom: .25rem; }
    h2 { font-size: 1.4rem; margin-top: 2rem; }
    h3 { font-size: 1.1rem; margin-top: 1.25rem; color: #1d4ed8; }
    a { color: #1d4ed8; }
    ul, ol { padding-left: 1.5rem; }
    li { margin-bottom: .25rem; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: .875em; font-family: monospace; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
    strong { font-weight: 600; }
    .meta { color: #6b7280; font-size: .8rem; margin-top: 2.5rem; }
  </style>
</head>
<body>
${sanitizedHtml}
<p class="meta">Period: ${formatDate(report.dateRange.from)} – ${formatDate(report.dateRange.to)} &middot; Generated ${formatDateTime(report.createdAt)}</p>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported as HTML");
  }

  async function handleDelete() {
    if (!report) return;
    if (confirm("Are you sure you want to delete this report?")) {
      await deleteReport(report.id!);
      router.push("/reports");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!searchParams.get("id")) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No report selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a report from the list, or generate a new one
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || (searchParams.get("id") && !report)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Report not found</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold mb-1.5">{report.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {formatDate(report.dateRange.from)} –{" "}
                  {formatDate(report.dateRange.to)}
                </span>
                <span>·</span>
                <span>Generated {formatDateTime(report.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleExportMarkdown}
                className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title="Download Markdown"
              >
                <Download className="w-4 h-4" />
                <span>.md</span>
              </button>

              <button
                onClick={handleExportHtml}
                className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title="Export as HTML"
              >
                <Code2 className="w-4 h-4" />
                <span>HTML</span>
              </button>

              <Link
                href={`/reports/pdf?id=${report.id}`}
                className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title="View as PDF"
              >
                <FilePen className="w-4 h-4" />
                <span>View PDF</span>
              </Link>

              <div className="w-px h-5 bg-border mx-1" />

              <button
                onClick={handleDelete}
                className="px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title="Delete report"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rendered markdown */}
        <div className="flex-1 overflow-auto p-6 print:p-8">
          <article
            ref={articleRef}
            className="prose prose-slate dark:prose-invert max-w-none
              prose-headings:font-semibold
              prose-h1:text-3xl prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-6
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-bold
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:cursor-pointer
              prose-p:text-foreground prose-p:mb-4 prose-p:leading-relaxed
              prose-strong:text-foreground prose-strong:font-bold
              prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:space-y-2
              prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:space-y-2
              prose-li:text-foreground prose-li:leading-relaxed prose-li:marker:text-foreground
              prose-code:text-foreground prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-accent prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
              print:prose-p:text-black print:prose-li:text-black print:prose-headings:text-black"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>

      </div>

      {/* Task drawer — rendered outside the flex column so it overlays correctly */}
      <TaskDrawer
        taskId={drawerTaskId}
        onClose={() => setDrawerTaskId(null)}
      />
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Loading...
        </div>
      }
    >
      <ReportDetailContent />
    </Suspense>
  );
}
