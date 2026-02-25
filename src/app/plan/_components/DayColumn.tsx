"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db";
import { TaskBlock, OverflowBlock, PX_PER_HOUR } from "./TaskBlock";
import type { ColumnSlot } from "./planUtils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface DayColumnProps {
  dayIndex: number;
  date: Date;
  slots: ColumnSlot[];
  overflowFromPrev: ColumnSlot | null;
  dailyCapacity: number;
  taskMap: Map<number, Task>;
  trackedByTask: Map<number, number>;
  onRemove: (id: number) => void;
  onTaskClick: (taskId: number) => void;
  onHoursChange: (id: number, hours: number) => void;
}

export function DayColumn({
  dayIndex,
  date,
  slots,
  overflowFromPrev,
  dailyCapacity,
  taskMap,
  trackedByTask,
  onRemove,
  onTaskClick,
  onHoursChange,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayIndex },
  });

  const totalPlanned = slots.reduce((s, sl) => s + sl.item.plannedHours, 0);
  const isOverCapacity = totalPlanned > dailyCapacity;

  const minColumnHeight = dailyCapacity * PX_PER_HOUR;

  const dayLabel = DAY_LABELS[dayIndex];
  const prevDayLabel = dayIndex > 0 ? DAY_LABELS[dayIndex - 1] : "";

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className="mb-2 px-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
          <span className={cn(
            "text-xs font-mono",
            isOverCapacity ? "text-amber-400" : "text-muted-foreground",
          )}>
            {totalPlanned % 1 === 0 ? totalPlanned : totalPlanned.toFixed(1)}
            /{dailyCapacity % 1 === 0 ? dailyCapacity : dailyCapacity.toFixed(1)}h
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60">{format(date, "d MMM")}</p>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        style={{ minHeight: minColumnHeight }}
        className={cn(
          "flex-1 rounded-lg border transition-colors p-1.5 space-y-1.5",
          isOver
            ? "border-primary/50 bg-primary/5"
            : "border-border/40 bg-card/30",
        )}
      >
        {/* Overflow continuation from previous day */}
        {overflowFromPrev && (() => {
          const overflowTask = taskMap.get(overflowFromPrev.item.taskId);
          if (!overflowTask) return null;
          return (
            <OverflowBlock
              slot={overflowFromPrev}
              task={overflowTask}
              fromDayLabel={prevDayLabel}
            />
          );
        })()}

        {/* Sortable items */}
        <SortableContext
          items={slots.map((s) => s.item.id!)}
          strategy={verticalListSortingStrategy}
        >
          {slots.map((slot) => {
            const task = taskMap.get(slot.item.taskId);
            if (!task) return null;
            const tracked = trackedByTask.get(task.id!) ?? 0;
            const remaining = Math.max(task.estimatedHours - tracked, 0);
            return (
              <TaskBlock
                key={slot.item.id!}
                slot={slot}
                task={task}
                remainingHours={remaining}
                onRemove={() => onRemove(slot.item.id!)}
                onTaskClick={() => onTaskClick(task.id!)}
                onHoursChange={(hrs) => onHoursChange(slot.item.id!, hrs)}
              />
            );
          })}
        </SortableContext>

        {/* Empty state */}
        {slots.length === 0 && !overflowFromPrev && (
          <div className={cn(
            "flex items-center justify-center h-16 rounded-md border border-dashed",
            isOver ? "border-primary/40" : "border-border/20",
          )}>
            <p className="text-xs text-muted-foreground/40">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
