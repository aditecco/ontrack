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
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
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
  onTaskClick: (taskId: number) => void;
}

export function WeekView({
  packed,
  weekStart,
  weeklyCapacity,
  onReorder,
  onRemove,
  onTaskClick,
}: WeekViewProps) {
  const weekEnd = addDays(weekStart, 6);
  const weekIndex = weekIndexFromNow(weekStart);
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

  const pieData = [
    { name: "Scheduled", value: Math.min(totalScheduled, weeklyCapacity) },
    { name: "Available", value: Math.max(weeklyCapacity - totalScheduled, 0) },
  ];
  const pieColor = over ? "#f59e0b" : "hsl(var(--primary))";

  return (
    <div className="space-y-5">
      {/* Capacity header — label left, donut right */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold leading-tight">Week capacity</h2>
          <p
            className={cn(
              "text-lg font-mono font-semibold mt-0.5",
              over ? "text-amber-500" : "text-muted-foreground",
            )}
          >
            {totalScheduled.toFixed(1)}h / {weeklyCapacity}h
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "EEEE d MMMM")} – {format(weekEnd, "EEEE d MMMM yyyy")}
          </p>
          {/* Day ticks */}
          <div className="flex mt-2">
            {dayLabels.map((d) => (
              <span
                key={d}
                className="text-sm text-muted-foreground/60"
                style={{ width: "20%" }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={27}
                outerRadius={38}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                <Cell fill={pieColor} />
                <Cell fill="hsl(var(--accent))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 text-sm text-muted-foreground">
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
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Queued tasks */}
      {queuedTasks.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Queued &mdash; won&apos;t fit this week
          </p>
          <div className="space-y-1">
            {queuedTasks.map((p) => (
              <div
                key={p.planTask.id}
                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border/40 bg-card/30 opacity-60"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                <div className="flex-shrink-0 w-48 min-w-0">
                  <button
                    type="button"
                    onClick={() => onTaskClick(p.task.id!)}
                    className="text-sm font-medium truncate hover:text-primary transition-colors text-left w-full block"
                  >
                    {p.task.name}
                  </button>
                  <p className="text-sm text-muted-foreground truncate">{p.task.customer}</p>
                </div>
                <div className="flex-shrink-0 text-right w-20">
                  <p className="text-sm font-mono font-semibold">{p.remainingHours.toFixed(1)}h</p>
                  <p className="text-sm text-muted-foreground">remaining</p>
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
