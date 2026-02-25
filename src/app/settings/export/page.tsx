"use client";

import { useState, useRef } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ExportSettingsPage() {
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function exportDatabase() {
    try {
      const [tasks, timeEntries, dayNotes, tags, taskTags, reports, reportPresets, reportTemplates, planTasks] =
        await Promise.all([
          db.tasks.toArray(),
          db.timeEntries.toArray(),
          db.dayNotes.toArray(),
          db.tags.toArray(),
          db.taskTags.toArray(),
          db.reports.toArray(),
          db.reportPresets.toArray(),
          db.reportTemplates.toArray(),
          db.planTasks.toArray(),
        ]);

      const data = {
        version: 4,
        exportDate: new Date().toISOString(),
        tasks,
        timeEntries,
        dayNotes,
        tags,
        taskTags,
        reports,
        reportPresets,
        reportTemplates,
        planTasks,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ontrack-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Database exported successfully");
    } catch (error) {
      toast.error("Failed to export database");
      console.error(error);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.tasks || !data.timeEntries) {
        toast.error("Invalid backup file format");
        return;
      }

      setPendingImportData(data);
      setShowImportConfirm(true);
    } catch (error) {
      toast.error("Failed to read backup file");
      console.error(error);
    }

    if (event.target) {
      event.target.value = "";
    }
  }

  async function confirmImport() {
    if (!pendingImportData) return;

    try {
      await db.transaction(
        "rw",
        [db.tasks, db.timeEntries, db.dayNotes, db.tags, db.taskTags, db.reports, db.reportPresets, db.reportTemplates, db.planTasks],
        async () => {
          // Clear all tables
          await Promise.all([
            db.tasks.clear(),
            db.timeEntries.clear(),
            db.dayNotes.clear(),
            db.tags.clear(),
            db.taskTags.clear(),
            db.reports.clear(),
            db.reportPresets.clear(),
            db.reportTemplates.clear(),
            db.planTasks.clear(),
          ]);

          // Tasks
          const tasksToImport = pendingImportData.tasks.map((task: any) => {
            const { id, ...rest } = task;
            return {
              ...rest,
              createdAt: new Date(rest.createdAt),
              updatedAt: new Date(rest.updatedAt),
            };
          });
          const newTaskIds = await db.tasks.bulkAdd(tasksToImport, { allKeys: true }) as number[];

          // Build old→new task ID map
          const taskIdMap = new Map<number, number>();
          pendingImportData.tasks.forEach((t: any, i: number) => {
            taskIdMap.set(t.id, newTaskIds[i]);
          });

          // Time entries — remap taskId
          const timeEntriesToImport = pendingImportData.timeEntries.map((entry: any) => {
            const { id, ...rest } = entry;
            return {
              ...rest,
              taskId: taskIdMap.get(rest.taskId) ?? rest.taskId,
              createdAt: new Date(rest.createdAt),
            };
          });
          await db.timeEntries.bulkAdd(timeEntriesToImport);

          // Day notes
          if (pendingImportData.dayNotes?.length > 0) {
            const dayNotesToImport = pendingImportData.dayNotes.map((note: any) => {
              const { id, ...rest } = note;
              return {
                ...rest,
                createdAt: new Date(rest.createdAt),
                updatedAt: new Date(rest.updatedAt),
              };
            });
            await db.dayNotes.bulkAdd(dayNotesToImport);
          }

          // Tags — remap IDs for taskTags
          if (pendingImportData.tags?.length > 0) {
            const tagsToImport = pendingImportData.tags.map((tag: any) => {
              const { id, ...rest } = tag;
              return { ...rest, createdAt: new Date(rest.createdAt) };
            });
            const newTagIds = await db.tags.bulkAdd(tagsToImport, { allKeys: true }) as number[];

            const tagIdMap = new Map<number, number>();
            pendingImportData.tags.forEach((t: any, i: number) => {
              tagIdMap.set(t.id, newTagIds[i]);
            });

            // TaskTags — remap both taskId and tagId
            if (pendingImportData.taskTags?.length > 0) {
              const taskTagsToImport = pendingImportData.taskTags.map((tt: any) => {
                const { id, ...rest } = tt;
                return {
                  taskId: taskIdMap.get(rest.taskId) ?? rest.taskId,
                  tagId: tagIdMap.get(rest.tagId) ?? rest.tagId,
                };
              });
              await db.taskTags.bulkAdd(taskTagsToImport);
            }
          }

          // Reports (content is self-contained; presetId/templateId are metadata only)
          if (pendingImportData.reportPresets?.length > 0) {
            const presetsToImport = pendingImportData.reportPresets.map((p: any) => {
              const { id, ...rest } = p;
              return {
                ...rest,
                createdAt: new Date(rest.createdAt),
                updatedAt: new Date(rest.updatedAt),
              };
            });
            await db.reportPresets.bulkAdd(presetsToImport);
          }

          if (pendingImportData.reportTemplates?.length > 0) {
            const templatesToImport = pendingImportData.reportTemplates.map((t: any) => {
              const { id, ...rest } = t;
              return {
                ...rest,
                createdAt: new Date(rest.createdAt),
                updatedAt: new Date(rest.updatedAt),
              };
            });
            await db.reportTemplates.bulkAdd(templatesToImport);
          }

          if (pendingImportData.reports?.length > 0) {
            const reportsToImport = pendingImportData.reports.map((r: any) => {
              const { id, ...rest } = r;
              return { ...rest, createdAt: new Date(rest.createdAt) };
            });
            await db.reports.bulkAdd(reportsToImport);
          }

          // Plan tasks — remap taskId
          if (pendingImportData.planTasks?.length > 0) {
            const planTasksToImport = pendingImportData.planTasks.map((pt: any) => {
              const { id, ...rest } = pt;
              return {
                ...rest,
                taskId: taskIdMap.get(rest.taskId) ?? rest.taskId,
                addedAt: new Date(rest.addedAt),
              };
            });
            await db.planTasks.bulkAdd(planTasksToImport);
          }
        },
      );

      toast.success("Database imported successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Failed to import database");
      console.error(error);
    } finally {
      setShowImportConfirm(false);
      setPendingImportData(null);
    }
  }

  function cancelImport() {
    setShowImportConfirm(false);
    setPendingImportData(null);
  }

  return (
    <PageTransition>
      <div className="h-full p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
            <h1 className="text-3xl font-bold mb-2">Data Management</h1>
            <p className="text-muted-foreground text-sm">
              Export and import your data
            </p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-6 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Database</p>
                  <p className="text-sm text-muted-foreground">
                    Download all your data as JSON — tasks, entries, notes, tags, and reports
                  </p>
                </div>
                <button
                  onClick={exportDatabase}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Import Database</p>
                  <p className="text-sm text-muted-foreground">
                    Restore data from a backup file (replaces all current data)
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-accent/30 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Local Storage</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All data is stored locally in your browser using IndexedDB. No data is sent to
                      external servers. Export regularly to backup your data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Confirm Database Import</h3>
                <p className="text-sm text-muted-foreground">
                  This will replace all your current data with the imported data. This action cannot be undone.
                </p>
              </div>
            </div>

            {pendingImportData && (
              <div className="mb-6 p-3 bg-accent/30 rounded border border-border space-y-1">
                <p className="text-sm"><span className="font-medium">Tasks:</span> {pendingImportData.tasks?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Time Entries:</span> {pendingImportData.timeEntries?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Day Notes:</span> {pendingImportData.dayNotes?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Tags:</span> {pendingImportData.tags?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Reports:</span> {pendingImportData.reports?.length || 0}</p>
                <p className="text-sm"><span className="font-medium">Plan tasks:</span> {pendingImportData.planTasks?.length || 0}</p>
                {pendingImportData.exportDate && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Exported: {new Date(pendingImportData.exportDate).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelImport}
                className="px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Import & Replace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageTransition>
  );
}
