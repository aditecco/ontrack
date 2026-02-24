"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PlanTask } from "@/lib/db";
import { SortableRow } from "./SortableRow";
import { addDays, weekIndexFromNow, type PackedTask } from "./planUtils";

interface WeekViewProps {
  packed: PackedTask[];
  weekStart: Date;
  weeklyCapacity: number;
  onReorder: (newOrder: PlanTask[]) => void;
  onRemove: (id: number) => void;
}

export function WeekView({
  packed,
  weekStart,
  weeklyCapacity,
  onReorder,
  onRemove,
}: WeekViewProps) {
  const weekEnd = addDays(weekStart, 6);
  const weekIndex = weekIndexFromNow(weekStart);
  // Past weeks show the same as week 0 (no offset)
  const weekOffsetHours = Math.max(weekIndex, 0) * weeklyCapacity;

  const thisWeekTasks = packed.filter(
    (p) =>
      p.startHour < weekOffsetHours + weeklyCapacity &&
      p.endHour > weekOffsetHours,
  );
  const queuedTasks = packed.filter(
    (p) => p.startHour >= weekOffsetHours + weeklyCapacity,
  );

  const totalScheduled = packed.reduce((sum, p) => {
    const s = Math.max(p.startHour - weekOffsetHours, 0);
    const e = Math.min(p.endHour - weekOffsetHours, weeklyCapacity);
    return sum + Math.max(e - s, 0);
  }, 0);

  const capacityPct = Math.min((totalScheduled / weeklyCapacity) * 100, 100);
  const over = totalScheduled > weeklyCapacity;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over: overItem } = event;
    if (!overItem || active.id === overItem.id) return;
    const oldIndex = packed.findIndex((p) => p.planTask.id === active.id);
    const newIndex = packed.findIndex((p) => p.planTask.id === overItem.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(packed, oldIndex, newIndex).map((p) => p.planTask));
  }

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-4">
      {/* Week date range */}
      <p className="text-xs text-muted-foreground">
        {format(weekStart, "EEEE d MMMM")} – {format(weekEnd, "EEEE d MMMM yyyy")}
      </p>

      {/* Capacity bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Week capacity</span>
          <span
            className={cn(
              "font-mono font-semibold",
              over ? "text-amber-500" : "text-foreground",
            )}
          >
            {totalScheduled.toFixed(1)}h / {weeklyCapacity}h
          </span>
        </div>
        <div className="h-2 bg-accent/40 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              over ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
        <div className="flex justify-between">
          {dayLabels.map((d, i) => (
            <span
              key={d}
              className="text-[10px] text-muted-foreground/60"
              style={{
                width: "20%",
                textAlign: i === 0 ? "left" : i === 4 ? "right" : "center",
              }}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
        <div className="w-4 flex-shrink-0" />
        <div className="w-48 flex-shrink-0">Task</div>
        <div className="w-20 flex-shrink-0 text-right">Remaining</div>
        <div className="flex-1">This week</div>
        <div className="w-4 flex-shrink-0" />
      </div>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={packed.map((p) => p.planTask.id!)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {packed.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks in the plan yet. Add some below.
              </p>
            )}
            {thisWeekTasks.map((p) => (
              <SortableRow
                key={p.planTask.id}
                packed={p}
                weeklyCapacity={weeklyCapacity}
                weekOffsetHours={weekOffsetHours}
                onRemove={() => onRemove(p.planTask.id!)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Queued tasks */}
      {queuedTasks.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Queued &mdash; won&apos;t fit this week
          </p>
          <div className="space-y-1">
            {queuedTasks.map((p) => (
              <div
                key={p.planTask.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/30 opacity-60"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                <div className="flex-shrink-0 w-48 min-w-0">
                  <p className="text-sm font-medium truncate">{p.task.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.task.customer}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right w-20">
                  <p className="text-sm font-mono font-semibold">
                    {p.remainingHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">remaining</p>
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => onRemove(p.planTask.id!)}
                  className="flex-shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
