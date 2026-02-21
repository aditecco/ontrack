"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useReportStore } from "@/store/useReportStore";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// PDFViewer uses browser APIs — must be client-only
const ReportPDFViewer = dynamic(
  () =>
    import("@/components/ReportPDFViewer").then((m) => m.ReportPDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Preparing PDF...
      </div>
    ),
  }
);

function ReportPDFContent() {
  const searchParams = useSearchParams();
  const { reports, fetchReports } = useReportStore();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const id = searchParams.get("id");
  const report = id ? reports.find((r) => r.id === Number(id)) : null;

  if (!id) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No report selected</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground text-sm">
          {reports.length === 0 ? "Loading..." : "Report not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <Link
          href={`/reports?id=${report.id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to report
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{report.title}</h1>
        </div>
      </div>

      {/* PDF viewer fills the rest */}
      <div className="flex-1 min-h-0">
        <ReportPDFViewer report={report} />
      </div>
    </div>
  );
}

export default function ReportPDFPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Loading...
        </div>
      }
    >
      <ReportPDFContent />
    </Suspense>
  );
}
