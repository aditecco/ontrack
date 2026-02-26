"use client";

import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import toast from "react-hot-toast";
import { useReportStore } from "@/store/useReportStore";
import { initializeDefaultReportSettings } from "@/lib/reportConstants";
import Link from "next/link";

export default function ReportsSettingsPage() {
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
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null
  );
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
            <h1 className="text-3xl font-bold mb-2">Report Configuration</h1>
            <p className="text-muted-foreground text-sm">
              Manage report presets and templates
            </p>
          </motion.div>

          <motion.div
            className="bg-card border border-border rounded-lg p-6 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
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
            <div className="border-t border-border pt-6">
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
                        Available variables: {"{{"+ "dateRange}}, {{"+ "summary}}, {{"+ "tasks}}, {{"+ "entriesByDate}}, {{"+ "dayNotes}}, {{"+ "generatedDate}}"}
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
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
