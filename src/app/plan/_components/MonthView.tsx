"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfWeek, weeksInMonth, type PackedTask } from "./planUtils";

interface MonthViewProps {
  packed: PackedTask[];
  year: number;
  month: number; // 0-based
  weeklyCapacity: number;
  onRemove: (id: number) => void;
  onTaskClick: (taskId: number) => void;
}

export function MonthView({
  packed,
  year,
  month,
  weeklyCapacity,
  onRemove,
  onTaskClick,
}: MonthViewProps) {
  const weeks = weeksInMonth(year, month);
  const todayWeekStart = startOfWeek(new Date());

  const totalRemaining = packed.reduce((s, p) => s + p.remainingHours, 0);
  const totalMonthCapacity = weeks.length * weeklyCapacity;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div>
          <span className="text-muted-foreground">Total remaining: </span>
          <span className="font-mono font-semibold">{totalRemaining.toFixed(1)}h</span>
        </div>
        <div>
          <span className="text-muted-foreground">Weeks needed: </span>
          <span className="font-mono font-semibold">
            {weeklyCapacity > 0 ? (totalRemaining / weeklyCapacity).toFixed(1) : "—"}
          </span>
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
          style={{ gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)` }}
        >
          <div />
          {weeks.map((ws, i) => {
            const isCurrent = ws.getTime() === todayWeekStart.getTime();
            return (
              <div key={i} className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  W{i + 1}
                </p>
                <p
                  className={cn(
                    "text-sm",
                    isCurrent ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {format(ws, "d MMM")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        <div className="space-y-2">
          {packed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks in the plan yet.
            </p>
          )}
          {packed.map((p) => (
            <div
              key={p.planTask.id}
              className="grid gap-1 items-center group"
              style={{ gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)` }}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <button
                  onClick={() => onRemove(p.planTask.id!)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onTaskClick(p.task.id!)}
                    className="text-sm font-medium truncate hover:text-primary transition-colors text-left w-full block"
                    title={p.task.name}
                  >
                    {p.task.name}
                  </button>
                  <p className="text-sm text-muted-foreground truncate">
                    {p.remainingHours.toFixed(1)}h left
                  </p>
                </div>
              </div>

              {/* Week cells */}
              {weeks.map((ws, wi) => {
                const weekStart = wi * weeklyCapacity;
                const overlapStart = Math.max(p.startHour - weekStart, 0);
                const overlapEnd = Math.min(p.endHour - weekStart, weeklyCapacity);
                const overlapHours = Math.max(overlapEnd - overlapStart, 0);
                const fillPct = (overlapHours / weeklyCapacity) * 100;
                const offsetPct = (overlapStart / weeklyCapacity) * 100;
                const isCurrent = ws.getTime() === todayWeekStart.getTime();

                return (
                  <div key={wi} className="relative h-8">
                    <div
                      className={cn(
                        "absolute inset-0 rounded",
                        isCurrent ? "bg-accent/50" : "bg-accent/20",
                      )}
                    />
                    {fillPct > 0 && (
                      <div
                        className="absolute inset-y-0.5 rounded bg-primary/60"
                        style={{ left: `${offsetPct}%`, width: `${fillPct}%` }}
                        title={`${overlapHours.toFixed(1)}h in this week`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Capacity footer */}
        <div
          className="grid gap-1 mt-3"
          style={{ gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)` }}
        >
          <div className="text-sm text-muted-foreground text-right pr-2">
            Capacity used
          </div>
          {weeks.map((_, wi) => {
            const weekStart = wi * weeklyCapacity;
            const used = packed.reduce((sum, p) => {
              const s = Math.max(p.startHour - weekStart, 0);
              const e = Math.min(p.endHour - weekStart, weeklyCapacity);
              return sum + Math.max(e - s, 0);
            }, 0);
            return (
              <div key={wi} className="text-center">
                <p
                  className={cn(
                    "text-sm font-mono font-semibold",
                    used > weeklyCapacity ? "text-amber-500" : "text-muted-foreground",
                  )}
                >
                  {used.toFixed(0)}h
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
