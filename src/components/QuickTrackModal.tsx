"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Search } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { parseTimeInput, getDateString, cn } from "@/lib/utils";

export function QuickTrackModal({
  onClose,
  preselectedTaskId,
}: {
  onClose: () => void;
  preselectedTaskId?: number;
}) {
  const { tasks } = useTaskStore();
  const { addTimeEntry } = useTimeEntryStore();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(
    preselectedTaskId ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [date, setDate] = useState(getDateString());
  const [timeInput, setTimeInput] = useState("");
  const [notes, setNotes] = useState("");
  const [timeError, setTimeError] = useState(false);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === "active" || t.status === "pending"),
    [tasks],
  );

  const selectedTask = useMemo(
    () => activeTasks.find((t) => t.id === selectedTaskId) ?? null,
    [activeTasks, selectedTaskId],
  );

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return activeTasks;
    return activeTasks.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm, activeTasks]);

  // Keep search input in sync when task is preselected
  useEffect(() => {
    if (preselectedTaskId && selectedTask) {
      setSearchTerm(selectedTask.name);
    }
  }, [preselectedTaskId, selectedTask]);

  function handleSelectTask(taskId: number, taskName: string) {
    setSelectedTaskId(taskId);
    setSearchTerm(taskName);
    setShowTaskSuggestions(false);
  }

  function handleTimeChange(value: string) {
    setTimeInput(value);
    setTimeError(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTaskId) return;

    const parsed = parseTimeInput(timeInput);
    if (!parsed || (parsed.hours === 0 && parsed.minutes === 0)) {
      setTimeError(true);
      return;
    }

    await addTimeEntry({
      taskId: selectedTaskId,
      date,
      hours: parsed.hours,
      minutes: parsed.minutes,
      notes: notes.trim() || undefined,
    });

    onClose();
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
        className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Quick Track</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task selector */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2">Task</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedTaskId(null);
                  setShowTaskSuggestions(true);
                }}
                onFocus={() => setShowTaskSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowTaskSuggestions(false), 200)
                }
                placeholder="Search tasks..."
                className={cn(
                  "w-full pl-9 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary",
                  selectedTaskId
                    ? "border-primary/50"
                    : "border-border",
                )}
              />
            </div>
            <AnimatePresence>
              {showTaskSuggestions && filteredTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto scrollbar-thin"
                >
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleSelectTask(task.id!, task.name)}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0"
                    >
                      <div className="text-sm font-medium">{task.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.customer}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Time input */}
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <input
              type="text"
              value={timeInput}
              onChange={(e) => handleTimeChange(e.target.value)}
              placeholder="e.g. 2:30 · 1,5 · 2h 30m · 2h"
              className={cn(
                "w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary",
                timeError ? "border-destructive ring-2 ring-destructive/50" : "border-border",
              )}
            />
            {timeError && (
              <p className="text-xs text-destructive mt-1">
                Enter a valid time (e.g. 2:30, 1,5, 2h 30m)
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTaskId}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Log Time
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
