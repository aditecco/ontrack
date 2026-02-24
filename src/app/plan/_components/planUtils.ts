import {
  startOfWeek as dfStartOfWeek,
  addDays,
  addWeeks,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  differenceInCalendarWeeks,
} from "date-fns";
import type { Task, PlanTask } from "@/lib/db";

export { addDays, addWeeks };

export function startOfWeek(date: Date): Date {
  return dfStartOfWeek(date, { weekStartsOn: 1 });
}

export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function formatMonthLabel(date: Date): string {
  return format(date, "MMMM yyyy");
}

/** Monday-anchored weeks that overlap the given month */
export function weeksInMonth(year: number, month: number): Date[] {
  const d = new Date(year, month, 1);
  return eachWeekOfInterval(
    { start: startOfMonth(d), end: endOfMonth(d) },
    { weekStartsOn: 1 },
  );
}

/**
 * How many full weeks ahead of the current week `weekStart` is.
 * Returns 0 for the current week, negative for past weeks.
 */
export function weekIndexFromNow(weekStart: Date): number {
  return differenceInCalendarWeeks(weekStart, startOfWeek(new Date()), {
    weekStartsOn: 1,
  });
}

// ── Task packing ──────────────────────────────────────────────────────────────

export interface PackedTask {
  planTask: PlanTask;
  task: Task;
  trackedHours: number;
  remainingHours: number;
  /** Cumulative hours BEFORE this task in the global sequence */
  startHour: number;
  /** Cumulative hours AFTER this task */
  endHour: number;
}

export function packTasks(
  planTasks: PlanTask[],
  tasks: Task[],
  allTrackedByTask: Map<number, number>,
): PackedTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id!, t]));
  let cumulative = 0;
  return planTasks
    .map((pt) => {
      const task = taskMap.get(pt.taskId);
      if (!task) return null;
      const trackedHours = allTrackedByTask.get(pt.taskId) ?? 0;
      const remainingHours = Math.max(0, task.estimatedHours - trackedHours);
      const startHour = cumulative;
      cumulative += remainingHours;
      return {
        planTask: pt,
        task,
        trackedHours,
        remainingHours,
        startHour,
        endHour: cumulative,
      };
    })
    .filter(Boolean) as PackedTask[];
}
