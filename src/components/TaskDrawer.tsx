"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ArrowUpRight, Clock, Plus, Trash2, Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { formatTime, formatDecimalHours, parseTimeInput, getDateString, cn } from "@/lib/utils";
import { useDateFormat } from "@/hooks/useDateFormat";
import type { Tag } from "@/lib/db";

interface TaskDrawerProps {
  taskId: number | null;
  onClose: () => void;
}

export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const { tasks, getTaskTags } = useTaskStore();
  const { timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeEntryStore();
  const { formatDate } = useDateFormat();
  const [taskTags, setTaskTags] = useState<Tag[]>([]);

  // Tracking widget state
  const [trackDate, setTrackDate] = useState(getDateString());
  const [trackTimeInput, setTrackTimeInput] = useState("");
  const [trackNotes, setTrackNotes] = useState("");
  const [trackTimeError, setTrackTimeError] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingTimeInput, setEditingTimeInput] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  const task = taskId ? tasks.find((t) => t.id === taskId) : null;

  useEffect(() => {
    if (taskId) {
      getTaskTags(taskId).then(setTaskTags);
    } else {
      setTaskTags([]);
    }
  }, [taskId, getTaskTags]);

  // Reset tracking form when task changes
  useEffect(() => {
    setTrackDate(getDateString());
    setTrackTimeInput("");
    setTrackNotes("");
    setTrackTimeError(false);
    setEditingEntryId(null);
  }, [taskId]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (taskId) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [taskId, onClose]);

  const taskStats = task
    ? (() => {
        const entries = timeEntries.filter((e) => e.taskId === task.id);
        const totalMinutes = entries.reduce(
          (sum, e) => sum + (e.hours * 60 + e.minutes),
          0,
        );
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        const decimalHours = formatDecimalHours(totalHours, totalMins);
        const remaining = task.estimatedHours - decimalHours;
        const consumedPct = Math.min(
          100,
          (decimalHours / task.estimatedHours) * 100,
        );
        return { totalHours, totalMins, decimalHours, remaining, consumedPct };
      })()
    : null;

  async function handleTrackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    const parsed = parseTimeInput(trackTimeInput);
    if (!parsed || (parsed.hours === 0 && parsed.minutes === 0)) {
      setTrackTimeError(true);
      return;
    }
    await addTimeEntry({
      taskId: task.id!,
      date: trackDate,
      hours: parsed.hours,
      minutes: parsed.minutes,
      notes: trackNotes.trim() || undefined,
    });
    setTrackTimeInput("");
    setTrackNotes("");
    setTrackTimeError(false);
  }

  function handleEditEntry(id: number, hours: number, minutes: number, notes?: string) {
    setEditingEntryId(id);
    setEditingTimeInput(formatTime(hours, minutes));
    setEditingNotes(notes || "");
  }

  async function handleEditSave(id: number) {
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
  }

  function handleEditCancel() {
    setEditingEntryId(null);
    setEditingTimeInput("");
    setEditingNotes("");
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight">{task.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {task.customer}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/tasks?id=${task.id}`}
                  className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="View full task details"
                  onClick={onClose}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    task.status === "pending" &&
                      "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
                    task.status === "active" &&
                      "bg-primary/15 text-primary border border-primary/25",
                    task.status === "completed" &&
                      "bg-green-500/15 text-green-400 border border-green-500/25",
                    task.status === "canceled" &&
                      "bg-red-500/15 text-red-400 border border-red-500/25",
                    task.status === "archived" &&
                      "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {task.status}
                </span>
                {task.estimationStatus && (
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      task.estimationStatus === "underestimated" &&
                        "bg-orange-500/15 text-orange-400 border border-orange-500/25",
                      task.estimationStatus === "overestimated" &&
                        "bg-purple-500/15 text-purple-400 border border-purple-500/25",
                      task.estimationStatus === "on_track" &&
                        "bg-green-500/15 text-green-400 border border-green-500/25",
                    )}
                  >
                    {task.estimationStatus === "on_track"
                      ? "on track"
                      : task.estimationStatus}
                  </span>
                )}
              </div>

              {/* Time stats */}
              {taskStats && (
                <div
                  className={cn(
                    "border rounded-lg p-4 space-y-3",
                    taskStats.remaining < 0
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-accent/20",
                  )}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Estimated
                      </div>
                      <div className="text-2xl font-bold">
                        {task.estimatedHours}h
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Time Spent
                      </div>
                      <div className="text-2xl font-bold">
                        {formatTime(taskStats.totalHours, taskStats.totalMins)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">
                        {taskStats.remaining >= 0
                          ? `${taskStats.remaining.toFixed(1)}h remaining`
                          : `${Math.abs(taskStats.remaining).toFixed(1)}h over budget`}
                      </span>
                      <span className="text-xs font-medium">
                        {taskStats.consumedPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-accent rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          taskStats.remaining < 0
                            ? "bg-destructive"
                            : "bg-primary",
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${taskStats.consumedPct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Track Time section (hidden for completed tasks) */}
              {task.status !== "completed" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Track Time</span>
                  </div>

                  <form onSubmit={handleTrackSubmit} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={trackDate}
                        onChange={(e) => setTrackDate(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={trackTimeInput}
                        onChange={(e) => {
                          setTrackTimeInput(e.target.value);
                          setTrackTimeError(false);
                        }}
                        placeholder="2:30 · 1,5 · 2h"
                        className={cn(
                          "px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                          trackTimeError
                            ? "border-destructive ring-2 ring-destructive/50"
                            : "border-border",
                        )}
                      />
                    </div>
                    <input
                      type="text"
                      value={trackNotes}
                      onChange={(e) => setTrackNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between">
                      {trackTimeError && (
                        <p className="text-xs text-destructive">
                          Enter a valid time (e.g. 2:30, 1,5, 2h 30m)
                        </p>
                      )}
                      <button
                        type="submit"
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Log Time
                      </button>
                    </div>
                  </form>

                  {/* Recent entries (last 5) */}
                  {(() => {
                    const taskEntries = timeEntries
                      .filter((e) => e.taskId === task.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 5);
                    if (taskEntries.length === 0) return null;
                    return (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Recent Entries
                        </div>
                        <div className="rounded-lg overflow-hidden border border-border/50">
                          {taskEntries.map((entry, index) => {
                            const isEditing = editingEntryId === entry.id;
                            return (
                              <div
                                key={entry.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 group",
                                  index % 2 === 0 ? "bg-accent/20" : "bg-background",
                                )}
                              >
                                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                                  {formatDate(new Date(entry.date + "T12:00:00"))}
                                </span>

                                {isEditing ? (
                                  <div className="flex-1 flex gap-1.5 min-w-0">
                                    <input
                                      type="text"
                                      value={editingTimeInput}
                                      onChange={(e) => setEditingTimeInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleEditSave(entry.id!);
                                        if (e.key === "Escape") handleEditCancel();
                                      }}
                                      autoFocus
                                      placeholder="2:30"
                                      className="w-20 flex-shrink-0 px-2 py-0.5 bg-background border border-primary rounded text-xs focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={editingNotes}
                                      onChange={(e) => setEditingNotes(e.target.value)}
                                      placeholder="Notes"
                                      className="flex-1 min-w-0 px-2 py-0.5 bg-background border border-border rounded text-xs focus:outline-none focus:border-primary"
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
                                    "flex items-center gap-0.5 flex-shrink-0 transition-opacity",
                                    isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                  )}
                                >
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleEditSave(entry.id!)}
                                        className="p-1 hover:bg-green-500/20 text-green-500 rounded transition-colors"
                                        title="Save"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={handleEditCancel}
                                        className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
                                        title="Cancel"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditEntry(entry.id!, entry.hours, entry.minutes, entry.notes)}
                                        className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                                        title="Edit"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteTimeEntry(entry.id!)}
                                        className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Description
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Link */}
              {task.link && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Link
                  </div>
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    {task.link}
                  </a>
                </div>
              )}

              {/* Tags */}
              {taskTags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {taskTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimation reason */}
              {task.estimationReason && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Estimation Note
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed px-3 py-2 bg-accent/30 rounded-lg border border-border">
                    {task.estimationReason}
                  </p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="flex-shrink-0 p-4 border-t border-border">
              <Link
                href={`/tasks?id=${task.id}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium"
                onClick={onClose}
              >
                View full details
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
