"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, Loader2 } from "lucide-react";
import { useReportStore } from "@/store/useReportStore";
import { generateReport } from "@/lib/reportGenerator";
import { initializeDefaultReportSettings } from "@/lib/reportConstants";
import { db } from "@/lib/db";
import toast from "react-hot-toast";

export function CreateReportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { presets, templates, fetchPresets, fetchTemplates, addReport } =
    useReportStore();

  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [reportTitle, setReportTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeDefaultReportSettings(db);
      await fetchPresets();
      await fetchTemplates();
    }
    init();
  }, [fetchPresets, fetchTemplates]);

  // Auto-select defaults if available
  useEffect(() => {
    if (presets.length > 0 && !selectedPresetId) {
      const defaultPreset = presets.find((p) => p.isDefault) ?? presets[0];
      setSelectedPresetId(defaultPreset.id ?? null);
    }
  }, [presets, selectedPresetId]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate =
        templates.find((t) => t.isDefault) ?? templates[0];
      setSelectedTemplateId(defaultTemplate.id ?? null);
    }
  }, [templates, selectedTemplateId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPresetId || !selectedTemplateId) {
      toast.error("Please select both a preset and a template");
      return;
    }
    if (!reportTitle.trim()) {
      toast.error("Please enter a report title");
      return;
    }

    const preset = presets.find((p) => p.id === selectedPresetId);
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!preset || !template) {
      toast.error("Invalid preset or template");
      return;
    }

    setIsGenerating(true);
    try {
      const { content, dateRange } = await generateReport(
        preset,
        template,
        reportTitle
      );

      const reportId = await addReport({
        title: reportTitle,
        content,
        presetId: selectedPresetId,
        templateId: selectedTemplateId,
        dateRange,
        includedDayNotes: preset.includeDayNotes,
      });

      onClose();
      if (reportId) {
        router.push(`/reports?id=${reportId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Generate Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Report Title
            </label>
            <input
              type="text"
              required
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g., Weekly Report – Feb 17–21"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preset</label>
            <select
              value={selectedPresetId ?? ""}
              onChange={(e) =>
                setSelectedPresetId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Choose a preset…</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <select
              value={selectedTemplateId ?? ""}
              onChange={(e) =>
                setSelectedTemplateId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Choose a template…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
