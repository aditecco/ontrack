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
      const tasks = await db.tasks.toArray();
      const timeEntries = await db.timeEntries.toArray();
      const dayNotes = await db.dayNotes.toArray();

      const data = {
        version: 2,
        exportDate: new Date().toISOString(),
        tasks,
        timeEntries,
        dayNotes,
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

      // Validate the import data
      if (!data.tasks || !data.timeEntries) {
        toast.error("Invalid backup file format");
        return;
      }

      // Store the data and show confirmation dialog
      setPendingImportData(data);
      setShowImportConfirm(true);
    } catch (error) {
      toast.error("Failed to read backup file");
      console.error(error);
    }

    // Reset the file input
    if (event.target) {
      event.target.value = "";
    }
  }

  async function confirmImport() {
    if (!pendingImportData) return;

    try {
      // Clear existing data
      await db.transaction(
        "rw",
        db.tasks,
        db.timeEntries,
        db.dayNotes,
        async () => {
          await db.tasks.clear();
          await db.timeEntries.clear();
          await db.dayNotes.clear();

          // Import tasks (remove id to let IndexedDB generate new ones)
          const tasksToImport = pendingImportData.tasks.map((task: any) => {
            const { id, ...taskWithoutId } = task;
            // Convert date strings back to Date objects
            return {
              ...taskWithoutId,
              createdAt: new Date(taskWithoutId.createdAt),
              updatedAt: new Date(taskWithoutId.updatedAt),
            };
          });
          await db.tasks.bulkAdd(tasksToImport);

          // Import time entries
          const timeEntriesToImport = pendingImportData.timeEntries.map(
            (entry: any) => {
              const { id, ...entryWithoutId } = entry;
              return {
                ...entryWithoutId,
                createdAt: new Date(entryWithoutId.createdAt),
              };
            },
          );
          await db.timeEntries.bulkAdd(timeEntriesToImport);

          // Import day notes (if they exist in the backup)
          if (
            pendingImportData.dayNotes &&
            pendingImportData.dayNotes.length > 0
          ) {
            const dayNotesToImport = pendingImportData.dayNotes.map(
              (note: any) => {
                const { id, ...noteWithoutId } = note;
                return {
                  ...noteWithoutId,
                  createdAt: new Date(noteWithoutId.createdAt),
                  updatedAt: new Date(noteWithoutId.updatedAt),
                };
              },
            );
            await db.dayNotes.bulkAdd(dayNotesToImport);
          }
        },
      );

      toast.success("Database imported successfully. Reloading page...");

      // Reload the page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
                    Download all your tasks and time entries as JSON
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
                      All data is stored locally in your browser using
                      IndexedDB. No data is sent to external servers. Export
                      regularly to backup your data.
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
                <h3 className="text-lg font-semibold mb-1">
                  Confirm Database Import
                </h3>
                <p className="text-sm text-muted-foreground">
                  This will replace all your current data with the imported
                  data. This action cannot be undone.
                </p>
              </div>
            </div>

            {pendingImportData && (
              <div className="mb-6 p-3 bg-accent/30 rounded border border-border">
                <p className="text-sm">
                  <span className="font-medium">Tasks:</span>{" "}
                  {pendingImportData.tasks?.length || 0}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Time Entries:</span>{" "}
                  {pendingImportData.timeEntries?.length || 0}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Day Notes:</span>{" "}
                  {pendingImportData.dayNotes?.length || 0}
                </p>
                {pendingImportData.exportDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Exported:{" "}
                    {new Date(pendingImportData.exportDate).toLocaleString()}
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
