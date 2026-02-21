"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useReportStore } from "@/store/useReportStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

function ReportsSidebarContent() {
  const searchParams = useSearchParams();
  const selectedReportId = searchParams.get("id")
    ? parseInt(searchParams.get("id")!)
    : null;

  const { reports, fetchReports } = useReportStore();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <aside className="w-80 lg:w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Reports
        </h2>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-1.5">
        {reports.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No reports yet
          </div>
        )}
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/reports?id=${report.id}`}
            className={cn(
              "w-full text-left p-3.5 rounded-lg border transition-colors block",
              selectedReportId === report.id
                ? "border-primary bg-accent"
                : "border-border hover:border-primary/50 hover:bg-accent/30",
            )}
          >
            <div className="font-semibold text-sm mb-1 leading-snug">
              {report.title}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>
                {formatDate(report.dateRange.from)} –{" "}
                {formatDate(report.dateRange.to)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(report.createdAt)}
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex">
      <Suspense
        fallback={
          <div className="w-80 lg:w-96 border-r border-border bg-card" />
        }
      >
        <ReportsSidebarContent />
      </Suspense>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
