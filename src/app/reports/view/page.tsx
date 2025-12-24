"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Download, FileDown, Printer, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useReportStore } from "@/store/useReportStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Report } from "@/lib/db";

function ReportViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { reports, fetchReports, deleteReport } = useReportStore();
  const [report, setReport] = useState<Report | null>(null);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      const reportId = searchParams.get("id");

      if (!reportId) {
        toast.error("No report ID provided");
        router.push("/reports");
        return;
      }

      setIsLoading(true);
      await fetchReports();
    }

    loadReport();
  }, [searchParams, fetchReports, router]);

  useEffect(() => {
    const reportId = searchParams.get("id");
    if (!reportId || reports.length === 0) return;

    const foundReport = reports.find((r) => r.id === Number(reportId));

    if (!foundReport) {
      toast.error("Report not found");
      router.push("/reports");
      return;
    }

    setReport(foundReport);

    // Parse and sanitize markdown
    async function processMarkdown() {
      const rawHtml = await marked(foundReport.content);
      const sanitized = DOMPurify.sanitize(rawHtml);
      setSanitizedHtml(sanitized);
      setIsLoading(false);
    }

    processMarkdown();
  }, [reports, searchParams, router]);

  function handleExportText() {
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
    toast.success("Report exported as text");
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPDF() {
    // Trigger print dialog which can save as PDF
    window.print();
    toast.success("Use 'Save as PDF' in the print dialog");
  }

  async function handleDelete() {
    if (!report) return;

    if (confirm("Are you sure you want to delete this report?")) {
      await deleteReport(report.id!);
      router.push("/reports");
    }
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="h-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading report...</div>
        </div>
      </PageTransition>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <PageTransition>
      <div className="h-full flex flex-col">
        {/* Header - only show on screen */}
        <div className="p-6 border-b border-border print:hidden">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => router.push("/reports")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Reports</span>
            </button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {formatDate(report.dateRange.from)} -{" "}
                    {formatDate(report.dateRange.to)}
                  </span>
                  <span>•</span>
                  <span>Generated {formatDateTime(report.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-auto p-6 print:p-8">
          <article
            className="max-w-5xl mx-auto prose prose-slate dark:prose-invert max-w-none
              prose-headings:font-semibold
              prose-h1:text-3xl prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-6
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-bold
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
              prose-p:text-foreground prose-p:mb-4 prose-p:leading-relaxed
              prose-strong:text-foreground prose-strong:font-bold
              prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:space-y-2
              prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:space-y-2
              prose-li:text-foreground prose-li:leading-relaxed prose-li:marker:text-foreground
              prose-code:text-foreground prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-accent prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
              print:prose-p:text-black print:prose-li:text-black print:prose-headings:text-black print:prose-strong:text-black"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>

        {/* Bottom Action Bar - only show on screen */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="border-t border-border bg-card/95 backdrop-blur-sm print:hidden"
        >
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {report.includedDayNotes && "Includes daily notes"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportText}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm"
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4" />
                  <span>Markdown</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-opacity text-sm"
                  title="Save as PDF"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Save PDF</span>
                </button>

                <div className="w-px h-6 bg-border mx-2" />

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          article {
            max-width: 100% !important;
          }
        }
      `}</style>
    </PageTransition>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense
      fallback={
        <PageTransition>
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading report...</div>
          </div>
        </PageTransition>
      }
    >
      <ReportViewContent />
    </Suspense>
  );
}
