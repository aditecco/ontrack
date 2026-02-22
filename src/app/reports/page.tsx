"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReportStore } from "@/store/useReportStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Code2, Copy, Download, FileText, FilePen, Trash2, X } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import type { Report } from "@/lib/db";
import { TaskDrawer } from "@/components/TaskDrawer";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { reports, fetchReports, deleteReport } = useReportStore();

  const [report, setReport] = useState<Report | null>(null);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportsReady, setReportsReady] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  // Source drawer
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState<"md" | "html">("md");

  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchReports().then(() => setReportsReady(true));
  }, [fetchReports]);

  // Resolve report from URL param
  useEffect(() => {
    if (!reportsReady) return;

    const reportId = searchParams.get("id");

    if (!reportId) {
      setReport(null);
      setSanitizedHtml("");
      return;
    }

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
  }, [reports, searchParams, reportsReady]);

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

  // ── Source helpers ────────────────────────────────────────────────────────────

  function buildHtmlSource(): string {
    if (!report) return "";
    return `<!DOCTYPE html>
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
  }

  function getSourceContent(): string {
    if (!report) return "";
    return sourceTab === "md" ? report.content : buildHtmlSource();
  }

  function getSourceFilename(): string {
    if (!report) return "report";
    const slug = report.title.replace(/\s+/g, "-").toLowerCase();
    return sourceTab === "md" ? `${slug}.md` : `${slug}.html`;
  }

  function handleCopySource() {
    const content = getSourceContent();
    navigator.clipboard.writeText(content).then(() => {
      toast.success(`Copied ${sourceTab.toUpperCase()} to clipboard`);
    });
  }

  function handleDownloadSource() {
    const content = getSourceContent();
    const mimeType = sourceTab === "md" ? "text/markdown" : "text/html";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getSourceFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${sourceTab.toUpperCase()}`);
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
            Select a report from the list, or generate one via the{" "}
            <span className="font-medium text-foreground">+</span> button
          </p>
        </div>
      </div>
    );
  }

  // Still fetching from DB
  if (!reportsReady || isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Fetch done but ID not matched
  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h3 className="text-lg font-semibold mb-2">Report not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            No report with ID <code className="bg-accent px-1.5 py-0.5 rounded text-xs">{searchParams.get("id")}</code> exists.
          </p>
          <button
            onClick={() => router.push("/reports")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col relative">
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
                onClick={() => {
                  setIsSourceOpen(true);
                }}
                className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title="View source"
              >
                <Code2 className="w-4 h-4" />
                <span>View Source</span>
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

        {/* Source drawer — slides up from bottom, covers the report area */}
        <AnimatePresence>
          {isSourceOpen && (
            <motion.div
              className="absolute inset-0 bg-card flex flex-col z-10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {/* Drawer toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-accent rounded-lg">
                  <button
                    onClick={() => setSourceTab("md")}
                    className={cn(
                      "px-3 py-1 rounded text-sm font-medium transition-colors",
                      sourceTab === "md"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Markdown
                  </button>
                  <button
                    onClick={() => setSourceTab("html")}
                    className={cn(
                      "px-3 py-1 rounded text-sm font-medium transition-colors",
                      sourceTab === "html"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    HTML
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySource}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadSource}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <button
                    onClick={() => setIsSourceOpen(false)}
                    className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Code block */}
              <div className="flex-1 overflow-auto p-6">
                <pre className="w-full h-full bg-accent rounded-lg p-4 text-xs font-mono text-foreground overflow-auto whitespace-pre-wrap break-words leading-relaxed">
                  <code>{getSourceContent()}</code>
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
