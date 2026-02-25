"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import {
  formatTime,
  formatDecimalHours,
  formatCurrency,
  parseTimeInput,
  getDateString,
  cn,
} from "@/lib/utils";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Trash2, Download, ExternalLink, Pencil, X, Clock, Plus, Check, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, Tag } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import toast from "react-hot-toast";

// ── Task detail panel ─────────────────────────────────────────────────────────

function TaskDetailContent() {
  const { formatDate } = useDateFormat();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = searchParams.get("id");
  const taskId = rawId ? parseInt(rawId) : null;

  const {
    tasks,
    tags,
    fetchTasks,
    fetchTags,
    deleteTask,
    updateTask,
    getTaskTags,
    addTag,
    setTaskTags,
  } = useTaskStore();
  const { timeEntries, fetchTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntryStore();

  const [selectedTaskTags, setSelectedTaskTags] = useState<Tag[]>([]);
  const [showEstimationModal, setShowEstimationModal] = useState(false);
  const [pendingEstimationStatus, setPendingEstimationStatus] = useState<
    "underestimated" | "overestimated" | "on_track" | ""
  >("");
  const [showEditMetadataModal, setShowEditMetadataModal] = useState(false);
  const [showStatusChangeWarning, setShowStatusChangeWarning] = useState(false);
  const [pendingStatusChangeValue, setPendingStatusChangeValue] = useState("");

  // Tracking widget state
  const [trackDate, setTrackDate] = useState(getDateString());
  const [trackTimeInput, setTrackTimeInput] = useState("");
  const [trackNotes, setTrackNotes] = useState("");
  const [trackTimeError, setTrackTimeError] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingTimeInput, setEditingTimeInput] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchTimeEntries();
  }, [fetchTasks, fetchTags, fetchTimeEntries]);

  useEffect(() => {
    if (taskId) {
      getTaskTags(taskId).then(setSelectedTaskTags);
    } else {
      setSelectedTaskTags([]);
    }
  }, [taskId, getTaskTags, tasks]);

  const selectedTask = taskId ? tasks.find((t) => t.id === taskId) : null;

  const taskStats = selectedTask
    ? (() => {
        const entries = timeEntries.filter((e) => e.taskId === selectedTask.id);
        const totalMinutes = entries.reduce(
          (sum, entry) => sum + (entry.hours * 60 + entry.minutes),
          0,
        );
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        const decimalHours = formatDecimalHours(totalHours, totalMins);
        const remaining = selectedTask.estimatedHours - decimalHours;

        const dailyData = (() => {
          const dailyMap = new Map<string, number>();
          entries.forEach((entry) => {
            const hours = entry.hours + entry.minutes / 60;
            const current = dailyMap.get(entry.date) || 0;
            dailyMap.set(entry.date, current + hours);
          });
          const sortedDates = Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7);
          const estimate = selectedTask.estimatedHours;
          let cumulative = 0;
          return sortedDates.map(([date, hours]) => {
            const startPct = estimate > 0 ? Math.min((cumulative / estimate) * 100, 100) : 0;
            const widthPct = estimate > 0 ? (hours / estimate) * 100 : 0;
            // The first row that pushes the total past the estimate
            const isFirstOverflow = cumulative < estimate && cumulative + hours > estimate;
            cumulative += hours;
            return {
              date: formatDate(new Date(date + "T12:00:00")),
              hours: Number(hours.toFixed(2)),
              startPct,
              widthPct,
              isFirstOverflow,
            };
          });
        })();

        return {
          totalHours,
          totalMins,
          decimalHours,
          remaining,
          dailyData,
          entryCount: entries.length,
        };
      })()
    : null;

  const handleEstimationStatusChange = (value: string) => {
    if (!value) return;
    if (
      selectedTask?.estimationStatus &&
      selectedTask.estimationStatus !== value &&
      selectedTask.estimationReason
    ) {
      setPendingStatusChangeValue(value);
      setShowStatusChangeWarning(true);
      return;
    }
    setPendingEstimationStatus(
      value as "underestimated" | "overestimated" | "on_track",
    );
    setShowEstimationModal(true);
  };

  const handleEstimationModalSubmit = async (reason: string) => {
    if (!selectedTask || !pendingEstimationStatus) return;
    await updateTask(selectedTask.id!, {
      estimationStatus: pendingEstimationStatus as
        | "underestimated"
        | "overestimated"
        | "on_track",
      estimationReason: reason || undefined,
    });
    toast.success(`Task marked as ${pendingEstimationStatus}`);
    setPendingEstimationStatus("");
    setShowEstimationModal(false);
  };

  const handleTaskStatusChange = async (value: string) => {
    if (!selectedTask || !value) return;
    const newStatus = value as "active" | "completed" | "pending" | "canceled";
    await updateTask(selectedTask.id!, { status: newStatus });
    const statusLabels: Record<string, string> = {
      pending: "pending",
      active: "active",
      completed: "done",
      canceled: "canceled",
    };
    toast.success(`Task marked as ${statusLabels[newStatus] || newStatus}`);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    const parsed = parseTimeInput(trackTimeInput);
    if (!parsed || (parsed.hours === 0 && parsed.minutes === 0)) {
      setTrackTimeError(true);
      return;
    }
    await addTimeEntry({
      taskId: selectedTask.id!,
      date: trackDate,
      hours: parsed.hours,
      minutes: parsed.minutes,
      notes: trackNotes.trim() || undefined,
    });
    setTrackTimeInput("");
    setTrackNotes("");
    setTrackTimeError(false);
  };

  const handleEditEntry = (id: number, hours: number, minutes: number, notes?: string) => {
    setEditingEntryId(id);
    setEditingTimeInput(formatTime(hours, minutes));
    setEditingNotes(notes || "");
  };

  const handleEditSave = async (id: number) => {
    const parsed = parseTimeInput(editingTimeInput);
    if (!parsed || (parsed.hours === 0 && parsed.minutes === 0)) return;
    await updateTimeEntry(id, {
      hours: parsed.hours,
      minutes: parsed.minutes,
      notes: editingNotes.trim() || undefined,
    });
    setEditingEntryId(null);
    setEditingTimeInput("");
    setEditingNotes("");
  };

  const handleEditCancel = () => {
    setEditingEntryId(null);
    setEditingTimeInput("");
    setEditingNotes("");
  };

  // Empty state
  if (!taskId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Select a task to view details</p>
          <p className="text-sm">or create a new task with the + button</p>
        </div>
      </div>
    );
  }

  // Loading / not found
  if (!selectedTask) {
    if (tasks.length > 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Task not found</p>
            <button
              onClick={() => router.push("/tasks")}
              className="text-sm text-primary hover:underline"
            >
              Back to tasks
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!taskStats) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">{selectedTask.name}</h2>
              {selectedTask.estimationStatus && (
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium flex-shrink-0",
                    selectedTask.estimationStatus === "underestimated" &&
                      "bg-orange-500/20 text-orange-400 border border-orange-500/30",
                    selectedTask.estimationStatus === "overestimated" &&
                      "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                    selectedTask.estimationStatus === "on_track" &&
                      "bg-green-500/20 text-green-400 border border-green-500/30",
                  )}
                >
                  {selectedTask.estimationStatus === "on_track"
                    ? "on track"
                    : selectedTask.estimationStatus}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTask.customer}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                const taskData = {
                  task: selectedTask,
                  stats: taskStats,
                  exportDate: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(taskData, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedTask.name.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Task exported successfully");
              }}
              className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Delete "${selectedTask.name}"? This will also delete all time entries.`,
                  )
                ) {
                  deleteTask(selectedTask.id!);
                  router.push("/tasks");
                }
              }}
              className="px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Budget + Time stats */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-col justify-between h-full">
            <div className="text-sm text-muted-foreground mb-1">Budget</div>
            <div>
              <div className="text-2xl font-bold">
                {selectedTask.budget
                  ? formatCurrency(selectedTask.budget)
                  : "N/A"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {taskStats.entryCount}{" "}
                {taskStats.entryCount === 1 ? "Entry" : "Entries"}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "bg-card border rounded-lg p-4",
            taskStats.remaining < 0
              ? "border-destructive/50 bg-destructive/5"
              : "border-border",
          )}
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-sm text-muted-foreground">Estimated</div>
                {selectedTask.isSelfReportedEstimate && (
                  <span className="text-xs px-2 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground/70 bg-transparent">
                    SELF
                  </span>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {selectedTask.estimatedHours}h
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {taskStats.remaining >= 0
                    ? `${taskStats.remaining.toFixed(1)}h remaining`
                    : `${Math.abs(taskStats.remaining).toFixed(1)}h over budget`}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="text-sm text-muted-foreground mb-1">
                Time Spent
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatTime(taskStats.totalHours, taskStats.totalMins)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {taskStats.decimalHours.toFixed(2)}h decimal
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="text-sm text-muted-foreground mb-3">
                Consumption
              </div>
              <div className="flex items-center justify-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    <span className="text-xs text-muted-foreground">
                      Remaining
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        taskStats.remaining < 0 ? "bg-red-500" : "bg-green-500",
                      )}
                    ></div>
                    <span className="text-xs text-muted-foreground">Spent</span>
                  </div>
                </div>
                <div className="w-16 h-16 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Spent", value: taskStats.decimalHours },
                          {
                            name: "Remaining",
                            value: Math.max(0, taskStats.remaining),
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={29}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell
                          fill={
                            taskStats.remaining < 0 ? "#ef4444" : "#22c55e"
                          }
                        />
                        <Cell fill="#475569" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <motion.div
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Info</h2>
          {(selectedTask.description ||
            selectedTask.link ||
            selectedTaskTags.length > 0) && (
            <button
              onClick={() => setShowEditMetadataModal(true)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
        {selectedTask.description ||
        selectedTask.link ||
        selectedTaskTags.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {selectedTask.description && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>
            )}
            {(selectedTask.link || selectedTaskTags.length > 0) && (
              <div className="lg:w-72 flex-shrink-0 space-y-4 lg:border-l lg:border-border lg:pl-6">
                {selectedTask.link && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Link
                    </div>
                    <a
                      href={selectedTask.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {selectedTask.link}
                    </a>
                  </div>
                )}
                {selectedTaskTags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTaskTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              No additional info yet
            </p>
            <button
              onClick={() => setShowEditMetadataModal(true)}
              className="text-sm text-primary hover:underline"
            >
              Add description, link, or tags
            </button>
          </div>
        )}
      </motion.div>

      {/* Daily Time Distribution */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-1">Daily Time Distribution</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each bar is positioned relative to the total estimate ({selectedTask.estimatedHours}h)
        </p>
        {taskStats.dailyData.length > 0 ? (
          <div className="space-y-4">
            {taskStats.dailyData.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{day.date}</span>
                  <span className={cn(
                    "text-sm font-bold",
                    day.isFirstOverflow ? "text-red-400" : "",
                  )}>
                    {day.hours.toFixed(2)}h
                    {day.isFirstOverflow && (
                      <span className="ml-1.5 text-xs font-normal text-red-400">over estimate</span>
                    )}
                  </span>
                </div>
                <div className="relative w-full h-8 bg-accent/50 rounded overflow-hidden border border-border/50">
                  <motion.div
                    className={cn(
                      "absolute h-full rounded",
                      day.isFirstOverflow
                        ? "bg-gradient-to-r from-red-500 to-red-400"
                        : "bg-gradient-to-r from-blue-500 to-blue-400",
                    )}
                    style={{ left: `${day.startPct}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${day.widthPct}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No time entries yet
          </div>
        )}
      </div>

      {/* Track Time Widget */}
      <motion.div
        className="bg-card border border-border rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Track Time</h2>
        </div>

        {/* Disabled notice for completed tasks */}
        {selectedTask.status === "completed" ? (
          <div className="flex items-center gap-2.5 px-4 py-3 mb-6 bg-accent/60 border border-border rounded-lg text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
            <span>This task is done — time tracking is disabled.</span>
          </div>
        ) : (
        <form onSubmit={handleTrackSubmit} className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={trackDate}
                onChange={(e) => setTrackDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Time
              </label>
              <input
                type="text"
                value={trackTimeInput}
                onChange={(e) => {
                  setTrackTimeInput(e.target.value);
                  setTrackTimeError(false);
                }}
                placeholder="2:30 · 1,5 · 2h"
                className={cn(
                  "w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  trackTimeError
                    ? "border-destructive ring-2 ring-destructive/50"
                    : "border-border",
                )}
              />
            </div>
          </div>
          <div>
            <input
              type="text"
              value={trackNotes}
              onChange={(e) => setTrackNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            {trackTimeError && (
              <p className="text-xs text-destructive">
                Enter a valid time (e.g. 2:30, 1,5, 2h 30m)
              </p>
            )}
            <button
              type="submit"
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Log Time
            </button>
          </div>
        </form>
        )}

        {/* Recent entries for this task */}
        {(() => {
          const taskEntries = timeEntries
            .filter((e) => e.taskId === selectedTask.id)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 8);
          if (taskEntries.length === 0) return null;
          return (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent Entries
              </div>
              <div className="rounded-lg overflow-hidden border border-border/50">
                {taskEntries.map((entry, index) => {
                  const isEditing = editingEntryId === entry.id;
                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      onClick={() => !isEditing && router.push(`/track?date=${entry.date}`)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 transition-colors group",
                        index % 2 === 0 ? "bg-accent/20" : "bg-background",
                        !isEditing && "cursor-pointer hover:bg-accent/50",
                        isEditing && "cursor-default",
                      )}
                    >
                      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                        {formatDate(new Date(entry.date + "T12:00:00"))}
                      </span>

                      {isEditing ? (
                        <div className="flex-1 flex gap-2 min-w-0">
                          <input
                            type="text"
                            value={editingTimeInput}
                            onChange={(e) => setEditingTimeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(entry.id!);
                              if (e.key === "Escape") handleEditCancel();
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            placeholder="2:30 · 1,5"
                            className="w-28 flex-shrink-0 px-2 py-0.5 bg-background border border-primary rounded text-sm focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Notes (optional)"
                            className="flex-1 min-w-0 px-2 py-0.5 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">
                            {formatTime(entry.hours, entry.minutes)}
                          </span>
                          {entry.notes && (
                            <span className="text-xs text-muted-foreground ml-2 truncate">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "flex items-center gap-1 flex-shrink-0 transition-opacity",
                          isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleEditSave(entry.id!)}
                              className="p-1 hover:bg-green-500/20 text-green-500 rounded transition-colors"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditEntry(entry.id!, entry.hours, entry.minutes, entry.notes)}
                              className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteTimeEntry(entry.id!)}
                              className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Actions</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">
                {selectedTask.estimationStatus ? "Marked as:" : "Mark as:"}
              </label>
              <select
                value={selectedTask.estimationStatus || ""}
                onChange={(e) => handleEstimationStatusChange(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select status...</option>
                <option value="underestimated">Underestimated</option>
                <option value="overestimated">Overestimated</option>
                <option value="on_track">On Track</option>
              </select>
            </div>
            {selectedTask.estimationStatus && selectedTask.estimationReason && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium">Comment</label>
                <div className="px-4 py-2 bg-accent/30 border border-border rounded-lg min-h-[42px] flex items-center">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.estimationReason}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Task Status</label>
              <select
                value={selectedTask.status}
                onChange={(e) => handleTaskStatusChange(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Done</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showStatusChangeWarning && (
          <ConfirmationModal
            title="Change Estimation Status?"
            message="Changing the estimation status will clear the existing comment. Do you want to continue?"
            onConfirm={() => {
              setPendingEstimationStatus(
                pendingStatusChangeValue as
                  | "underestimated"
                  | "overestimated"
                  | "on_track",
              );
              setShowStatusChangeWarning(false);
              setPendingStatusChangeValue("");
              setShowEstimationModal(true);
            }}
            onCancel={() => {
              setShowStatusChangeWarning(false);
              setPendingStatusChangeValue("");
            }}
          />
        )}
        {showEstimationModal && pendingEstimationStatus && (
          <EstimationStatusModal
            estimationStatus={pendingEstimationStatus}
            onClose={() => {
              setPendingEstimationStatus("");
              setShowEstimationModal(false);
            }}
            onSubmit={handleEstimationModalSubmit}
          />
        )}
        {showEditMetadataModal && selectedTask && (
          <EditTaskMetadataModal
            task={selectedTask}
            taskTags={selectedTaskTags}
            availableTags={tags}
            onClose={() => setShowEditMetadataModal(false)}
            onSave={async () => {
              await fetchTasks();
              if (taskId) {
                const updatedTags = await getTaskTags(taskId);
                setSelectedTaskTags(updatedTags);
              }
              setShowEditMetadataModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page entry (with Suspense for useSearchParams) ────────────────────────────

export default function TasksPage() {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <TaskDetailContent />
      </Suspense>
    </PageTransition>
  );
}

// ── Inline modal components ───────────────────────────────────────────────────

function EstimationStatusModal({
  estimationStatus,
  onClose,
  onSubmit,
}: {
  estimationStatus: "underestimated" | "overestimated" | "on_track";
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
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
        <h2 className="text-2xl font-bold mb-4">
          Mark as{" "}
          {estimationStatus === "on_track" ? "on track" : estimationStatus}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(reason);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Why was this task ${estimationStatus === "on_track" ? "on track" : estimationStatus}?`}
              rows={4}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function EditTaskMetadataModal({
  task,
  taskTags,
  availableTags,
  onClose,
  onSave,
}: {
  task: Task;
  taskTags: Tag[];
  availableTags: Tag[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { updateTask, addTag, setTaskTags } = useTaskStore();
  const [formData, setFormData] = useState({
    description: task.description || "",
    link: task.link || "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    taskTags.map((t) => t.id!),
  );
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const filteredTags = useMemo(() => {
    const unselectedTags = availableTags.filter(
      (t) => !selectedTagIds.includes(t.id!),
    );
    if (!newTagInput) return unselectedTags;
    return unselectedTags.filter((t) =>
      t.name.toLowerCase().includes(newTagInput.toLowerCase()),
    );
  }, [newTagInput, availableTags, selectedTagIds]);

  const selectedTags = useMemo(
    () => availableTags.filter((t) => selectedTagIds.includes(t.id!)),
    [availableTags, selectedTagIds],
  );

  async function handleAddTag() {
    if (!newTagInput.trim()) return;
    const tagId = await addTag(newTagInput.trim());
    if (tagId && !selectedTagIds.includes(tagId)) {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
    setNewTagInput("");
    setShowTagSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateTask(task.id!, {
      description: formData.description || undefined,
      link: formData.link || undefined,
    });
    await setTaskTags(task.id!, selectedTagIds);
    onSave();
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
        className="bg-card border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Edit Task Info</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              placeholder="Add task description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-2">Tags</label>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTagIds(
                          selectedTagIds.filter((id) => id !== tag.id),
                        )
                      }
                      className="hover:text-primary/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowTagSuggestions(false), 200)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type to search or create tag..."
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagInput.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {showTagSuggestions && filteredTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-auto scrollbar-thin"
              >
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagIds([...selectedTagIds, tag.id!]);
                      setNewTagInput("");
                      setShowTagSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                  >
                    {tag.name}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ConfirmationModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
