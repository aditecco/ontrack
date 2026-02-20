"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useReportStore } from "@/store/useReportStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { generateReport } from "@/lib/reportGenerator";
import { initializeDefaultReportSettings } from "@/lib/reportConstants";
import { db } from "@/lib/db";
import toast from "react-hot-toast";

function ReportsSidebarContent() {
  const searchParams = useSearchParams();
  const selectedReportId = searchParams.get("id")
    ? parseInt(searchParams.get("id")!)
    : null;

  const {
    reports,
    presets,
    templates,
    fetchReports,
    fetchPresets,
    fetchTemplates,
    addReport,
  } = useReportStore();

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [reportTitle, setReportTitle] = useState("");

  useEffect(() => {
    async function init() {
      await initializeDefaultReportSettings(db);
      await fetchReports();
      await fetchPresets();
      await fetchTemplates();
    }
    init();
  }, [fetchReports, fetchPresets, fetchTemplates]);

  async function handleGenerateReport() {
    if (!selectedPresetId || !selectedTemplateId) {
      toast.error("Please select both a preset and a template");
      return;
    }

    if (!reportTitle.trim()) {
      toast.error("Please enter a report title");
      return;
    }

    setIsGenerating(true);
    try {
      const preset = presets.find((p) => p.id === selectedPresetId);
      const template = templates.find((t) => t.id === selectedTemplateId);

      if (!preset || !template) {
        toast.error("Invalid preset or template");
        return;
      }

      const { content, dateRange } = await generateReport(
        preset,
        template,
        reportTitle
      );

      await addReport({
        title: reportTitle,
        content,
        presetId: selectedPresetId,
        templateId: selectedTemplateId,
        dateRange,
        includedDayNotes: preset.includeDayNotes,
      });

      setReportTitle("");
      setSelectedPresetId(null);
      setSelectedTemplateId(null);
      setShowGenerateModal(false);
      toast.success("Report generated");
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <aside className="w-80 lg:w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Reports
            </h2>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>
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
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
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

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowGenerateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-xl w-full"
          >
            <h2 className="text-xl font-semibold mb-4">Generate Report</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  placeholder="e.g., Weekly Report - Dec 15-22"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Preset
                </label>
                <select
                  value={selectedPresetId || ""}
                  onChange={(e) =>
                    setSelectedPresetId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="">Choose a preset...</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId || ""}
                  onChange={(e) =>
                    setSelectedTemplateId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
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

      {/* Main content (page-level) */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
