"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Eye,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useReportStore } from "@/store/useReportStore";
import { generateReport } from "@/lib/reportGenerator";
import { formatDate, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { initializeDefaultReportSettings } from "@/lib/reportConstants";
import { db } from "@/lib/db";

export default function ReportsPage() {
  const router = useRouter();
  const {
    reports,
    presets,
    templates,
    fetchReports,
    fetchPresets,
    fetchTemplates,
    addReport,
    deleteReport,
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
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExportText(report: any) {
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

  async function handleDeleteReport(id: number) {
    if (confirm("Are you sure you want to delete this report?")) {
      await deleteReport(id);
    }
  }

  return (
    <PageTransition>
      <div className="h-full p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">Reports</h1>
              <p className="text-muted-foreground text-sm">
                Generate and manage your work reports
              </p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </motion.div>

          {/* Reports List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            {reports.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate your first report to get started
                </p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {report.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDate(report.dateRange.from)} -{" "}
                            {formatDate(report.dateRange.to)}
                          </span>
                        </div>
                      </div>
                      <FileText className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <span>
                        Generated {formatDateTime(report.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/reports/view?id=${report.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-opacity text-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleExportText(report)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm"
                        title="Export as Markdown"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id!)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm"
                        title="Delete report"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

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
    </PageTransition>
  );
}
