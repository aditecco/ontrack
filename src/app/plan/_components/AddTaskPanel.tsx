"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type { Task } from "@/lib/db";

interface AddTaskPanelProps {
  tasks: Task[];
  planTaskIds: Set<number>;
  onAdd: (taskId: number) => void;
}

export function AddTaskPanel({ tasks, planTaskIds, onAdd }: AddTaskPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks
      .filter(
        (t) =>
          !planTaskIds.has(t.id!) &&
          t.status !== "archived" &&
          t.status !== "canceled",
      )
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [tasks, planTaskIds, query]);

  function handleAdd(taskId: number) {
    onAdd(taskId);
    setQuery("");
    inputRef.current?.focus();
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
        Add task to plan
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks by name or customer…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-3">
            {query ? "No matching tasks found" : "All tasks are already in the plan"}
          </p>
        ) : (
          results.map((task) => (
            <button
              key={task.id}
              onClick={() => handleAdd(task.id!)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.name}</p>
                <p className="text-xs text-muted-foreground truncate">{task.customer}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-3 flex-shrink-0">
                {task.estimatedHours}h est.
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
