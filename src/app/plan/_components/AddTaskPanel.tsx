"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface AddTaskPanelProps {
  tasks: Task[];
  trackedByTask: Map<number, number>;
  dailyCapacity: number;
  onAdd: (taskId: number, dayIndex: number, plannedHours: number) => void;
}

export function AddTaskPanel({
  tasks,
  trackedByTask,
  dailyCapacity,
  onAdd,
}: AddTaskPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [hours, setHours] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks
      .filter((t) => t.status !== "archived" && t.status !== "canceled")
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [tasks, query]);

  function selectTask(task: Task) {
    setSelected(task);
    const tracked = trackedByTask.get(task.id!) ?? 0;
    const remaining = Math.max(task.estimatedHours - tracked, 0);
    // Default planned hours: remaining, capped at daily capacity; min 1 for vis-only
    const defaultHours = remaining > 0
      ? Math.min(remaining, dailyCapacity)
      : 1;
    setHours(defaultHours % 1 === 0 ? String(defaultHours) : defaultHours.toFixed(1));
    setDayIndex(0);
  }

  function handleConfirm() {
    if (!selected) return;
    const parsed = parseFloat(hours);
    if (isNaN(parsed) || parsed <= 0) return;
    onAdd(selected.id!, dayIndex, parsed);
    // Reset to allow adding more
    setSelected(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setSelected(null);
    setQuery("");
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors text-sm w-full"
      >
        <Plus className="w-4 h-4" />
        Add task to board
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Search tasks by name or customer…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Task list (hidden once a task is selected) */}
      {!selected && (
        <div className="max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3">
              {query ? "No matching tasks found" : "No tasks available"}
            </p>
          ) : (
            results.map((task) => {
              const tracked = trackedByTask.get(task.id!) ?? 0;
              const remaining = Math.max(task.estimatedHours - tracked, 0);
              return (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.customer}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground font-mono">
                      {remaining > 0 ? `${remaining.toFixed(1)}h left` : "done"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Placement picker (shown after task selection) */}
      {selected && (
        <div className="p-4 space-y-4">
          {/* Selected task summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.customer}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← back
            </button>
          </div>

          {/* Visualization-only notice */}
          {(() => {
            const tracked = trackedByTask.get(selected.id!) ?? 0;
            const remaining = Math.max(selected.estimatedHours - tracked, 0);
            return remaining <= 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Visualization only — hours won&apos;t affect the estimate
              </p>
            ) : null;
          })()}

          {/* Day selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Day</p>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setDayIndex(i)}
                  className={cn(
                    "flex-1 py-1 rounded text-xs font-medium transition-colors",
                    dayIndex === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/40 text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Hours input */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Planned hours</p>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="w-24 text-sm font-mono rounded-md px-2 py-1.5 border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!hours || parseFloat(hours) <= 0}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add to {DAY_LABELS[dayIndex]}
          </button>
        </div>
      )}
    </div>
  );
}
