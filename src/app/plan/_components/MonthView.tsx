"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, WeeklyPlanItem } from "@/lib/db";
import {
  startOfWeek,
  weeksInMonth,
  weekStartISO,
  weekIndexFromNow,
} from "./planUtils";
import { blockColor } from "./TaskBlock";

interface MonthViewProps {
  items: WeeklyPlanItem[];
  year: number;
  month: number; // 0-based
  weeklyCapacity: number;
  taskMap: Map<number, Task>;
  onTaskClick: (taskId: number) => void;
}

export function MonthView({
  items,
  year,
  month,
  weeklyCapacity,
  taskMap,
  onTaskClick,
}: MonthViewProps) {
  const weeks = weeksInMonth(year, month);
  const todayWeekStart = startOfWeek(new Date());

  // Build a map: weekISO → taskId → totalPlannedHours
  const weekTaskHours = new Map<string, Map<number, number>>();
  for (const item of items) {
    let taskMap2 = weekTaskHours.get(item.weekStart);
    if (!taskMap2) {
      taskMap2 = new Map();
      weekTaskHours.set(item.weekStart, taskMap2);
    }
    taskMap2.set(item.taskId, (taskMap2.get(item.taskId) ?? 0) + item.plannedHours);
  }

  // Collect all unique taskIds that appear in this month's items
  const taskIds = Array.from(new Set(items.map((i) => i.taskId)));

  // Total planned hours per week (across all tasks)
  function weekTotal(ws: Date): number {
    const iso = weekStartISO(ws);
    const tm = weekTaskHours.get(iso);
    if (!tm) return 0;
    return Array.from(tm.values()).reduce((s, h) => s + h, 0);
  }

  const totalPlanned = items.reduce((s, i) => s + i.plannedHours, 0);
  const totalMonthCapacity = weeks.length * weeklyCapacity;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div>
          <span className="text-muted-foreground">Planned this month: </span>
          <span className="font-mono font-semibold">{totalPlanned.toFixed(1)}h</span>
        </div>
        <div>
          <span className="text-muted-foreground">Month capacity: </span>
          <span className="font-mono font-semibold">{totalMonthCapacity}h</span>
        </div>
      </div>

      {/* Gantt grid */}
      <div>
        {/* Header */}
        <div
          className="grid gap-1 mb-2"
          style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}
        >
          <div />
          {weeks.map((ws, i) => {
            const isCurrent = ws.getTime() === todayWeekStart.getTime();
            const isPast = weekIndexFromNow(ws) < 0;
            return (
              <div key={i} className="text-center">
                <p className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-primary" : isPast ? "text-muted-foreground/40" : "text-muted-foreground",
                )}>
                  W{i + 1}
                </p>
                <p className={cn(
                  "text-xs",
                  isCurrent ? "text-primary" : isPast ? "text-muted-foreground/30" : "text-muted-foreground/60",
                )}>
                  {format(ws, "d MMM")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        <div className="space-y-1.5">
          {taskIds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks scheduled this month.
            </p>
          )}
          {taskIds.map((taskId) => {
            const task = taskMap.get(taskId);
            if (!task) return null;
            const color = blockColor(taskId);
            return (
              <div
                key={taskId}
                className="grid gap-1 items-center group"
                style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}
              >
                {/* Label */}
                <div className="min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => onTaskClick(taskId)}
                    className="text-sm font-medium truncate hover:text-primary transition-colors text-left w-full block"
                    title={task.name}
                  >
                    {task.name}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">{task.customer}</p>
                </div>

                {/* Week cells */}
                {weeks.map((ws, wi) => {
                  const iso = weekStartISO(ws);
                  const hours = weekTaskHours.get(iso)?.get(taskId) ?? 0;
                  const fillPct = Math.min((hours / weeklyCapacity) * 100, 100);
                  const isCurrent = ws.getTime() === todayWeekStart.getTime();
                  const isPast = weekIndexFromNow(ws) < 0;

                  return (
                    <div key={wi} className="relative h-7">
                      <div className={cn(
                        "absolute inset-0 rounded",
                        isCurrent ? "bg-accent/50" : isPast ? "bg-accent/10" : "bg-accent/20",
                      )} />
                      {fillPct > 0 && (
                        <div
                          className={cn(
                            "absolute inset-y-0.5 left-0 rounded",
                            color.bg.split(" ")[0], // just the bg class
                          )}
                          style={{ width: `${fillPct}%` }}
                          title={`${hours.toFixed(1)}h planned this week`}
                        />
                      )}
                      {hours > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-foreground/70">
                          {hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Capacity footer */}
        <div
          className="grid gap-1 mt-3 pt-3 border-t border-border/30"
          style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}
        >
          <div className="text-xs text-muted-foreground text-right pr-2">Total planned</div>
          {weeks.map((ws, wi) => {
            const total = weekTotal(ws);
            const isOver = total > weeklyCapacity;
            return (
              <div key={wi} className="text-center">
                <p className={cn(
                  "text-xs font-mono font-semibold",
                  isOver ? "text-amber-400" : total > 0 ? "text-foreground" : "text-muted-foreground/40",
                )}>
                  {total > 0 ? (total % 1 === 0 ? `${total}h` : `${total.toFixed(1)}h`) : "—"}
                </p>
                <p className="text-xs text-muted-foreground/40">/ {weeklyCapacity}h</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
