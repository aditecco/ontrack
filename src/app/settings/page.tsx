"use client";

import { useState, useRef, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  Settings,
  Download,
  Upload,
  Sun,
  Moon,
  Database,
  AlertTriangle,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import toast from "react-hot-toast";
import { useReportStore } from "@/store/useReportStore";
import { initializeDefaultReportSettings } from "@/lib/reportConstants";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "dark";
  });
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    presets,
    templates,
    fetchPresets,
    fetchTemplates,
    addPreset,
    updatePreset,
    deletePreset,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  } = useReportStore();

  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [presetForm, setPresetForm] = useState({
    name: "",
    daysBack: 2,
    includeCurrentDay: true,
    includeDayNotes: false,
  });
  const [templateForm, setTemplateForm] = useState({
    name: "",
    content: "",
  });

  useEffect(() => {
    async function init() {
      await initializeDefaultReportSettings(db);
      await fetchPresets();
      await fetchTemplates();
    }
    init();
  }, [fetchPresets, fetchTemplates]);

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

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function handleAddPreset() {
    if (!presetForm.name.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    await addPreset(presetForm);
    setPresetForm({
      name: "",
      daysBack: 2,
      includeCurrentDay: true,
      includeDayNotes: false,
    });
    setShowAddPreset(false);
  }

  async function handleUpdatePreset(id: number) {
    if (!presetForm.name.trim()) {
      toast.error("Please enter a preset name");
      return;
    }
    await updatePreset(id, presetForm);
    setEditingPresetId(null);
    setPresetForm({
      name: "",
      daysBack: 2,
      includeCurrentDay: true,
      includeDayNotes: false,
    });
  }

  async function handleDeletePreset(id: number) {
    if (confirm("Are you sure you want to delete this preset?")) {
      await deletePreset(id);
    }
  }

  function startEditPreset(preset: any) {
    setEditingPresetId(preset.id);
    setPresetForm({
      name: preset.name,
      daysBack: preset.daysBack,
      includeCurrentDay: preset.includeCurrentDay,
      includeDayNotes: preset.includeDayNotes,
    });
  }

  async function handleAddTemplate() {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error("Please enter both template name and content");
      return;
    }
    await addTemplate(templateForm);
    setTemplateForm({ name: "", content: "" });
    setShowAddTemplate(false);
  }

  async function handleUpdateTemplate(id: number) {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error("Please enter both template name and content");
      return;
    }
    await updateTemplate(id, templateForm);
    setEditingTemplateId(null);
    setTemplateForm({ name: "", content: "" });
  }

  async function handleDeleteTemplate(id: number) {
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate(id);
    }
  }

  function startEditTemplate(template: any) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      content: template.content,
    });
  }

  return (
    <PageTransition>
      <div className="h-full p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your preferences and data
            </p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-6 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div>
              <h2 className="text-xl font-semibold mb-4">Appearance</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Configuration
              </h2>
              <div className="space-y-6">
                {/* Presets Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">Report Presets</p>
                      <p className="text-sm text-muted-foreground">
                        Configure data extraction settings for reports
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddPreset(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Preset</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3 bg-accent/30 rounded-lg border border-border"
                      >
                        {editingPresetId === preset.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={presetForm.name}
                              onChange={(e) =>
                                setPresetForm({ ...presetForm, name: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                              placeholder="Preset name"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Days back
                                </label>
                                <input
                                  type="number"
                                  value={presetForm.daysBack}
                                  onChange={(e) =>
                                    setPresetForm({
                                      ...presetForm,
                                      daysBack: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                  min="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={presetForm.includeCurrentDay}
                                    onChange={(e) =>
                                      setPresetForm({
                                        ...presetForm,
                                        includeCurrentDay: e.target.checked,
                                      })
                                    }
                                    className="rounded"
                                  />
                                  Include today
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={presetForm.includeDayNotes}
                                    onChange={(e) =>
                                      setPresetForm({
                                        ...presetForm,
                                        includeDayNotes: e.target.checked,
                                      })
                                    }
                                    className="rounded"
                                  />
                                  Include notes
                                </label>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingPresetId(null);
                                  setPresetForm({
                                    name: "",
                                    daysBack: 2,
                                    includeCurrentDay: true,
                                    includeDayNotes: false,
                                  });
                                }}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdatePreset(preset.id!)}
                                className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{preset.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {preset.daysBack} days back
                                {preset.includeCurrentDay && " + today"}
                                {preset.includeDayNotes && " • includes notes"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditPreset(preset)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {!preset.isDefault && (
                                <button
                                  onClick={() => handleDeletePreset(preset.id!)}
                                  className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {showAddPreset && (
                      <div className="p-3 bg-accent/30 rounded-lg border border-border">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={presetForm.name}
                            onChange={(e) =>
                              setPresetForm({ ...presetForm, name: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            placeholder="Preset name"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Days back
                              </label>
                              <input
                                type="number"
                                value={presetForm.daysBack}
                                onChange={(e) =>
                                  setPresetForm({
                                    ...presetForm,
                                    daysBack: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                min="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={presetForm.includeCurrentDay}
                                  onChange={(e) =>
                                    setPresetForm({
                                      ...presetForm,
                                      includeCurrentDay: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                Include today
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={presetForm.includeDayNotes}
                                  onChange={(e) =>
                                    setPresetForm({
                                      ...presetForm,
                                      includeDayNotes: e.target.checked,
                                    })
                                  }
                                  className="rounded"
                                />
                                Include notes
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setShowAddPreset(false);
                                setPresetForm({
                                  name: "",
                                  daysBack: 2,
                                  includeCurrentDay: true,
                                  includeDayNotes: false,
                                });
                              }}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleAddPreset}
                              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Templates Section */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">Report Templates</p>
                      <p className="text-sm text-muted-foreground">
                        Customize report structure and formatting
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddTemplate(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Template</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 bg-accent/30 rounded-lg border border-border"
                      >
                        {editingTemplateId === template.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={templateForm.name}
                              onChange={(e) =>
                                setTemplateForm({
                                  ...templateForm,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                              placeholder="Template name"
                            />
                            <textarea
                              value={templateForm.content}
                              onChange={(e) =>
                                setTemplateForm({
                                  ...templateForm,
                                  content: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                              rows={10}
                              placeholder="Template content..."
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingTemplateId(null);
                                  setTemplateForm({ name: "", content: "" });
                                }}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateTemplate(template.id!)}
                                className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-md">
                                {template.content.substring(0, 60)}...
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditTemplate(template)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {!template.isDefault && (
                                <button
                                  onClick={() => handleDeleteTemplate(template.id!)}
                                  className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {showAddTemplate && (
                      <div className="p-3 bg-accent/30 rounded-lg border border-border">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={templateForm.name}
                            onChange={(e) =>
                              setTemplateForm({
                                ...templateForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            placeholder="Template name"
                          />
                          <textarea
                            value={templateForm.content}
                            onChange={(e) =>
                              setTemplateForm({
                                ...templateForm,
                                content: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                            rows={10}
                            placeholder="Template content (use {{variables}} for data)"
                          />
                          <div className="text-xs text-muted-foreground bg-background p-2 rounded">
                            Available variables: {"{{"+ "dateRange}}, {{"+ "summary}}, {{"+ "tasks}}, {{"+ "dayNotes}}, {{"+ "generatedDate}}"}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setShowAddTemplate(false);
                                setTemplateForm({ name: "", content: "" });
                              }}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleAddTemplate}
                              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold mb-4">Data Management</h2>
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
                      Restore data from a backup file (replaces all current
                      data)
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
