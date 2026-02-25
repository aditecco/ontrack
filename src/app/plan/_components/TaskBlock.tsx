"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db";
import type { ColumnSlot } from "./planUtils";

export const PX_PER_HOUR = 48;
export const MIN_BLOCK_HEIGHT = 60;

/** 12 distinct Tailwind color palettes for task blocks */
const BLOCK_COLORS = [
  { bg: "bg-blue-500/20 border-blue-500/40",   text: "text-blue-300",   badge: "bg-blue-500/30" },
  { bg: "bg-violet-500/20 border-violet-500/40", text: "text-violet-300", badge: "bg-violet-500/30" },
  { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500/30" },
  { bg: "bg-amber-500/20 border-amber-500/40",  text: "text-amber-300",  badge: "bg-amber-500/30" },
  { bg: "bg-rose-500/20 border-rose-500/40",    text: "text-rose-300",   badge: "bg-rose-500/30" },
  { bg: "bg-cyan-500/20 border-cyan-500/40",    text: "text-cyan-300",   badge: "bg-cyan-500/30" },
  { bg: "bg-pink-500/20 border-pink-500/40",    text: "text-pink-300",   badge: "bg-pink-500/30" },
  { bg: "bg-indigo-500/20 border-indigo-500/40", text: "text-indigo-300", badge: "bg-indigo-500/30" },
  { bg: "bg-teal-500/20 border-teal-500/40",    text: "text-teal-300",   badge: "bg-teal-500/30" },
  { bg: "bg-orange-500/20 border-orange-500/40", text: "text-orange-300", badge: "bg-orange-500/30" },
  { bg: "bg-lime-500/20 border-lime-500/40",    text: "text-lime-300",   badge: "bg-lime-500/30" },
  { bg: "bg-sky-500/20 border-sky-500/40",      text: "text-sky-300",    badge: "bg-sky-500/30" },
] as const;

export function blockColor(taskId: number) {
  return BLOCK_COLORS[taskId % BLOCK_COLORS.length];
}

interface TaskBlockProps {
  slot: ColumnSlot;
  task: Task;
  remainingHours: number;
  onRemove: () => void;
  onTaskClick: () => void;
  onHoursChange: (hours: number) => void;
}

export function TaskBlock({
  slot,
  task,
  remainingHours,
  onRemove,
  onTaskClick,
  onHoursChange,
}: TaskBlockProps) {
  const { item, clippedHours, overflowHours } = slot;
  const isVisualizationOnly = remainingHours <= 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id!,
    data: { dayIndex: item.dayIndex },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: Math.max(clippedHours * PX_PER_HOUR, MIN_BLOCK_HEIGHT),
  };

  const color = blockColor(task.id!);

  const [editingHours, setEditingHours] = useState(false);
  const [draftHours, setDraftHours] = useState(item.plannedHours.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingHours) {
      setDraftHours(item.plannedHours.toString());
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingHours, item.plannedHours]);

  function commitHours() {
    const parsed = parseFloat(draftHours);
    if (!isNaN(parsed) && parsed > 0) {
      onHoursChange(parsed);
    }
    setEditingHours(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex flex-col border rounded-lg px-2.5 py-2 select-none overflow-hidden",
        color.bg,
        isDragging && "opacity-50 shadow-lg z-50",
        isVisualizationOnly && "border-dashed opacity-70",
      )}
    >
      {/* Drag handle + remove button row */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-destructive flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Task name */}
      <button
        type="button"
        onClick={onTaskClick}
        className={cn(
          "text-left text-xs font-semibold leading-snug truncate hover:underline",
          color.text,
        )}
      >
        {task.name}
      </button>

      {/* Customer */}
      <p className="text-xs text-muted-foreground truncate mt-0.5">{task.customer}</p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Hours badge row */}
      <div className="flex items-end justify-between mt-1">
        {editingHours ? (
          <input
            ref={inputRef}
            type="number"
            min="0.25"
            step="0.25"
            value={draftHours}
            onChange={(e) => setDraftHours(e.target.value)}
            onBlur={commitHours}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHours();
              if (e.key === "Escape") setEditingHours(false);
            }}
            className={cn(
              "w-14 text-xs font-mono rounded px-1 py-0.5 border border-border bg-background text-foreground",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingHours(true)}
            title="Click to edit hours"
            className={cn(
              "text-xs font-mono font-semibold px-1.5 py-0.5 rounded",
              color.badge,
              color.text,
            )}
          >
            {item.plannedHours % 1 === 0
              ? `${item.plannedHours}h`
              : `${item.plannedHours.toFixed(1)}h`}
          </button>
        )}

        {/* Overflow indicator */}
        {overflowHours > 0 && (
          <span className="text-xs text-muted-foreground font-mono">
            +{overflowHours % 1 === 0 ? overflowHours : overflowHours.toFixed(1)}h →
          </span>
        )}

        {/* Visualization-only badge */}
        {isVisualizationOnly && (
          <span className="text-xs text-muted-foreground italic">vis</span>
        )}
      </div>
    </div>
  );
}

/** Read-only overflow continuation shown at the top of the next column */
export function OverflowBlock({
  slot,
  task,
  fromDayLabel,
}: {
  slot: ColumnSlot;
  task: Task;
  fromDayLabel: string;
}) {
  const color = blockColor(task.id!);
  const height = Math.max(slot.overflowHours * PX_PER_HOUR, MIN_BLOCK_HEIGHT);

  return (
    <div
      style={{ height }}
      className={cn(
        "relative flex flex-col border rounded-lg px-2.5 py-2 overflow-hidden opacity-50",
        color.bg,
        "border-dashed",
      )}
    >
      <p className="text-xs text-muted-foreground mb-1">← {fromDayLabel}</p>
      <p className={cn("text-xs font-semibold truncate", color.text)}>{task.name}</p>
      <div className="flex-1" />
      <span className={cn("text-xs font-mono self-start px-1.5 py-0.5 rounded", color.badge, color.text)}>
        {slot.overflowHours % 1 === 0
          ? `${slot.overflowHours}h`
          : `${slot.overflowHours.toFixed(1)}h`}
      </span>
    </div>
  );
}
