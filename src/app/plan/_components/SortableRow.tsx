"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PackedTask } from "./planUtils";

interface SortableRowProps {
  packed: PackedTask;
  weeklyCapacity: number;
  /** Hours already consumed by earlier weeks in the sequence */
  weekOffsetHours: number;
  onRemove: () => void;
  onTaskClick: (taskId: number) => void;
}

export function SortableRow({
  packed,
  weeklyCapacity,
  weekOffsetHours,
  onRemove,
  onTaskClick,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: packed.planTask.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskStart = Math.max(packed.startHour - weekOffsetHours, 0);
  const taskEnd = Math.min(packed.endHour - weekOffsetHours, weeklyCapacity);
  const barLeft = Math.min(taskStart / weeklyCapacity, 1) * 100;
  const barWidth = Math.max(((taskEnd - taskStart) / weeklyCapacity) * 100, 0);
  const isFullyAfter = packed.startHour - weekOffsetHours >= weeklyCapacity;
  const overflows = packed.endHour - weekOffsetHours > weeklyCapacity && !isFullyAfter;

  const trackedPct =
    packed.task.estimatedHours > 0
      ? Math.min((packed.trackedHours / packed.task.estimatedHours) * 100, 100)
      : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 px-3 py-4 rounded-lg border transition-colors",
        isDragging
          ? "bg-accent/80 border-primary/40 shadow-lg z-50"
          : isFullyAfter
          ? "bg-card/40 border-border/40 opacity-50"
          : "bg-card border-border hover:border-border/80",
      )}
    >
      {/* Drag handle */}
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Task info */}
      <div className="flex-shrink-0 w-48 min-w-0">
        <button
          type="button"
          onClick={() => onTaskClick(packed.task.id!)}
          className="text-sm font-medium truncate hover:text-primary transition-colors text-left w-full block"
          title={packed.task.name}
        >
          {packed.task.name}
        </button>
        <p className="text-sm text-muted-foreground truncate">{packed.task.customer}</p>
      </div>

      {/* Hours badge */}
      <div className="flex-shrink-0 text-right w-20">
        <p className="text-sm font-mono font-semibold">
          {packed.remainingHours.toFixed(1)}h
        </p>
        <p className="text-sm text-muted-foreground">remaining</p>
      </div>

      {/* Gantt bar */}
      <div className="flex-1 relative h-9">
        <div className="absolute inset-y-1 inset-x-0 bg-accent/30 rounded" />
        {trackedPct > 0 && (
          <div
            className="absolute inset-y-1 left-0 bg-primary/10 rounded"
            style={{ width: `${trackedPct}%` }}
          />
        )}
        {barWidth > 0 && (
          <div
            className={cn(
              "absolute inset-y-1 rounded",
              isFullyAfter ? "bg-muted-foreground/20" : "bg-primary/60",
            )}
            style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
          />
        )}
        {overflows && (
          <div className="absolute right-0 inset-y-0 flex items-center">
            <span className="text-sm text-amber-500 font-medium pr-1">overflow</span>
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remove from plan"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
