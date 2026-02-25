"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { format } from "date-fns";
import type { Task, WeeklyPlanItem } from "@/lib/db";
import { addDays, buildColumnLayout, getOverflowFromPrev, dailyCapacity } from "./planUtils";
import { DayColumn } from "./DayColumn";
import { TaskBlock, blockColor, PX_PER_HOUR, MIN_BLOCK_HEIGHT } from "./TaskBlock";
import { cn } from "@/lib/utils";

interface KanbanWeekViewProps {
  items: WeeklyPlanItem[];
  weekStart: Date;
  weeklyCapacity: number;
  taskMap: Map<number, Task>;
  trackedByTask: Map<number, number>;
  onRemove: (id: number) => void;
  onTaskClick: (taskId: number) => void;
  onHoursChange: (id: number, hours: number) => void;
  onMove: (id: number, toDayIndex: number, newOrder: number) => void;
  onReorderDay: (dayIndex: number, orderedIds: number[]) => void;
}

export function KanbanWeekView({
  items,
  weekStart,
  weeklyCapacity,
  taskMap,
  trackedByTask,
  onRemove,
  onTaskClick,
  onHoursChange,
  onMove,
  onReorderDay,
}: KanbanWeekViewProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const dayCapacity = dailyCapacity(weeklyCapacity);
  const layout = buildColumnLayout(items, dayCapacity);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeItemId = active.id as number;
    const activeItem = items.find((i) => i.id === activeItemId);
    if (!activeItem) return;

    // The "over" can be a day droppable (`day-0`…`day-4`) or a sortable item
    const overId = over.id;
    let targetDayIndex: number;
    let targetOrder: number;

    if (typeof overId === "string" && overId.startsWith("day-")) {
      // Dropped directly onto a day column (not on a specific item)
      targetDayIndex = parseInt(overId.replace("day-", ""), 10);
      // Append to end of target column
      const targetSlots = layout[targetDayIndex];
      targetOrder = targetSlots.length > 0
        ? Math.max(...targetSlots.map((s) => s.item.order)) + 1
        : 0;
    } else {
      // Dropped onto a specific item — find which column that item is in
      const overItemId = overId as number;
      const overItem = items.find((i) => i.id === overItemId);
      if (!overItem) return;
      targetDayIndex = overItem.dayIndex;

      if (activeItem.dayIndex === targetDayIndex) {
        // Same column reorder
        const colSlots = layout[targetDayIndex];
        const oldIndex = colSlots.findIndex((s) => s.item.id === activeItemId);
        const newIndex = colSlots.findIndex((s) => s.item.id === overItemId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        const newOrder = arrayMove(colSlots, oldIndex, newIndex).map(
          (s) => s.item.id!,
        );
        onReorderDay(targetDayIndex, newOrder);
        return;
      }

      // Cross-column: insert before the over item
      targetOrder = overItem.order;
    }

    if (activeItem.dayIndex === targetDayIndex) return;
    onMove(activeItemId, targetDayIndex, targetOrder);
  }

  // Build the overlay block for the actively dragged item
  const activeItem = activeId !== null ? items.find((i) => i.id === activeId) : null;
  const activeTask = activeItem ? taskMap.get(activeItem.taskId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Week capacity summary */}
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {format(weekStart, "d MMM")} – {format(addDays(weekStart, 4), "d MMM yyyy")}
        </span>
        <span>·</span>
        <span>
          {items.reduce((s, i) => s + i.plannedHours, 0).toFixed(1)}h planned
          / {weeklyCapacity}h capacity
        </span>
      </div>

      {/* 5 day columns */}
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, dayIdx) => {
          const date: Date = addDays(weekStart, dayIdx);
          const overflow = getOverflowFromPrev(layout, dayIdx);
          return (
            <DayColumn
              key={dayIdx}
              dayIndex={dayIdx}
              date={date}
              slots={layout[dayIdx]}
              overflowFromPrev={overflow}
              dailyCapacity={dayCapacity}
              taskMap={taskMap}
              trackedByTask={trackedByTask}
              onRemove={onRemove}
              onTaskClick={onTaskClick}
              onHoursChange={onHoursChange}
            />
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && activeTask ? (
          <div
            style={{
              height: Math.max(activeItem.plannedHours * PX_PER_HOUR, MIN_BLOCK_HEIGHT),
            }}
            className={cn(
              "flex flex-col border rounded-lg px-2.5 py-2 shadow-xl cursor-grabbing opacity-90",
              blockColor(activeTask.id!).bg,
            )}
          >
            <p className={cn("text-xs font-semibold truncate", blockColor(activeTask.id!).text)}>
              {activeTask.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{activeTask.customer}</p>
            <div className="flex-1" />
            <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded self-start", blockColor(activeTask.id!).badge, blockColor(activeTask.id!).text)}>
              {activeItem.plannedHours % 1 === 0
                ? `${activeItem.plannedHours}h`
                : `${activeItem.plannedHours.toFixed(1)}h`}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
