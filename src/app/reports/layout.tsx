"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useReportStore } from "@/store/useReportStore";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

function ReportsSidebarContent() {
  const searchParams = useSearchParams();
  const selectedReportId = searchParams.get("id")
    ? parseInt(searchParams.get("id")!)
    : null;

  const { reports, fetchReports } = useReportStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    return reports.filter((r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [reports, searchTerm]);

  return (
    <aside className="w-80 lg:w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-1.5">
        {filteredReports.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {reports.length === 0 ? "No reports yet" : "No reports found"}
          </div>
        )}
        {filteredReports.map((report) => (
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
