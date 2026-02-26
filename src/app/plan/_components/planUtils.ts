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
import type { WeeklyPlanItem } from "@/lib/db";

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

/** ISO "YYYY-MM-DD" for the Monday of the week containing `date`. */
export function weekStartISO(date: Date): string {
  return format(startOfWeek(date), "yyyy-MM-dd");
}

/** Daily capacity given a weekly capacity (5-day work week). */
export function dailyCapacity(weeklyCapacity: number): number {
  return weeklyCapacity / 5;
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

// ── Column layout ──────────────────────────────────────────────────────────────

export interface ColumnSlot {
  item: WeeklyPlanItem;
  /** Hours from the top of the column where this block starts (cumulative). */
  startOffset: number;
  /** Hours rendered within this column (may be < plannedHours if overflow). */
  clippedHours: number;
  /** Hours that spill into the next column. 0 when no overflow. */
  overflowHours: number;
}

/**
 * For a given day column, computes the stacking layout of items including
 * overflow that spills into the next column.
 *
 * Returns a 5-element array (Mon–Fri). Each element is the list of ColumnSlots
 * for that day.
 */
export function buildColumnLayout(
  items: WeeklyPlanItem[],
  dayCapacity: number,
): ColumnSlot[][] {
  const columns: ColumnSlot[][] = [[], [], [], [], []];

  // Group items by column and sort by order
  const byDay: WeeklyPlanItem[][] = [[], [], [], [], []];
  for (const item of items) {
    if (item.dayIndex >= 0 && item.dayIndex <= 4) {
      byDay[item.dayIndex].push(item);
    }
  }
  for (let d = 0; d < 5; d++) {
    byDay[d].sort((a, b) => a.order - b.order);
  }

  for (let d = 0; d < 5; d++) {
    let cursor = 0;
    for (const item of byDay[d]) {
      const startOffset = cursor;
      const remaining = Math.max(dayCapacity - cursor, 0);
      const clippedHours = Math.min(item.plannedHours, remaining);
      const overflowHours = Math.max(item.plannedHours - clippedHours, 0);
      columns[d].push({ item, startOffset, clippedHours, overflowHours });
      cursor += item.plannedHours; // advance by full planned hours (not clipped)
    }
  }

  return columns;
}

/**
 * Returns the overflow slot from column `dayIndex - 1` that spills into
 * `dayIndex`, if any.
 */
export function getOverflowFromPrev(
  layout: ColumnSlot[][],
  dayIndex: number,
): ColumnSlot | null {
  if (dayIndex === 0) return null;
  const prevSlots = layout[dayIndex - 1];
  if (prevSlots.length === 0) return null;
  const last = prevSlots[prevSlots.length - 1];
  return last.overflowHours > 0 ? last : null;
}
