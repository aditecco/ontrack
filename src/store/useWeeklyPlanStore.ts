import { create } from "zustand";
import { db, type WeeklyPlanItem } from "@/lib/db";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { startOfWeek } from "@/app/plan/_components/planUtils";
import toast from "react-hot-toast";

type WeeklyPlanStore = {
  items: WeeklyPlanItem[];
  isLoading: boolean;

  fetchWeekItems: (weekStart: string) => Promise<void>;
  fetchMonthItems: (year: number, month: number) => Promise<void>;
  addItem: (
    taskId: number,
    weekStart: string,
    dayIndex: number,
    plannedHours: number,
  ) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  moveItem: (
    id: number,
    toDayIndex: number,
    newOrder: number,
    weekStart: string,
  ) => Promise<void>;
  reorderDay: (
    weekStart: string,
    dayIndex: number,
    orderedIds: number[],
  ) => Promise<void>;
  updatePlannedHours: (id: number, hours: number) => Promise<void>;
};

export const useWeeklyPlanStore = create<WeeklyPlanStore>((set, get) => ({
  items: [],
  isLoading: false,

  fetchWeekItems: async (weekStart) => {
    set({ isLoading: true });
    try {
      const items = await db.weeklyPlanItems
        .where("weekStart")
        .equals(weekStart)
        .toArray();
      set({ items });
    } catch (err) {
      toast.error("Failed to load plan");
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMonthItems: async (year, month) => {
    set({ isLoading: true });
    try {
      const monthStart = startOfMonth(new Date(year, month, 1));
      const monthEnd = endOfMonth(new Date(year, month, 1));
      // Collect all Monday week-start strings that overlap this month
      const weekStarts: string[] = [];
      let cur = startOfWeek(monthStart);
      while (cur <= monthEnd) {
        weekStarts.push(format(cur, "yyyy-MM-dd"));
        cur = new Date(cur.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      const items = await db.weeklyPlanItems
        .where("weekStart")
        .anyOf(weekStarts)
        .toArray();
      set({ items });
    } catch (err) {
      toast.error("Failed to load plan");
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (taskId, weekStart, dayIndex, plannedHours) => {
    try {
      const existing = await db.weeklyPlanItems
        .where("[weekStart+dayIndex]")
        .equals([weekStart, dayIndex])
        .toArray();
      // Append to end of column
      const maxOrder =
        existing.length > 0
          ? Math.max(...existing.map((i) => i.order))
          : -1;
      await db.weeklyPlanItems.add({
        taskId,
        weekStart,
        dayIndex,
        order: maxOrder + 1,
        plannedHours,
        createdAt: new Date(),
      });
      await get().fetchWeekItems(weekStart);
    } catch (err) {
      toast.error("Failed to add task to plan");
      console.error(err);
    }
  },

  removeItem: async (id) => {
    try {
      const item = await db.weeklyPlanItems.get(id);
      if (!item) return;
      const weekStart = item.weekStart;
      await db.weeklyPlanItems.delete(id);
      await get().fetchWeekItems(weekStart);
    } catch (err) {
      toast.error("Failed to remove task from plan");
      console.error(err);
    }
  },

  moveItem: async (id, toDayIndex, newOrder, weekStart) => {
    try {
      await db.transaction("rw", db.weeklyPlanItems, async () => {
        // Shift existing items in target column at or after newOrder up by 1
        const targetCol = await db.weeklyPlanItems
          .where("[weekStart+dayIndex]")
          .equals([weekStart, toDayIndex])
          .toArray();
        for (const item of targetCol) {
          if (item.id !== id && item.order >= newOrder) {
            await db.weeklyPlanItems.update(item.id!, { order: item.order + 1 });
          }
        }
        await db.weeklyPlanItems.update(id, {
          dayIndex: toDayIndex,
          order: newOrder,
        });
      });
      await get().fetchWeekItems(weekStart);
    } catch (err) {
      toast.error("Failed to move task");
      console.error(err);
    }
  },

  reorderDay: async (weekStart, dayIndex, orderedIds) => {
    try {
      await db.transaction("rw", db.weeklyPlanItems, async () => {
        for (let i = 0; i < orderedIds.length; i++) {
          await db.weeklyPlanItems.update(orderedIds[i], { order: i });
        }
      });
      await get().fetchWeekItems(weekStart);
    } catch (err) {
      toast.error("Failed to reorder plan");
      console.error(err);
    }
  },

  updatePlannedHours: async (id, hours) => {
    try {
      const item = await db.weeklyPlanItems.get(id);
      if (!item) return;
      await db.weeklyPlanItems.update(id, { plannedHours: hours });
      await get().fetchWeekItems(item.weekStart);
    } catch (err) {
      toast.error("Failed to update hours");
      console.error(err);
    }
  },
}));
