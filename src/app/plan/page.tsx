"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useWeeklyPlanStore } from "@/store/useWeeklyPlanStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { useWeeklyCapacity } from "@/hooks/useWeeklyCapacity";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDrawer } from "@/components/TaskDrawer";
import {
  addWeeks,
  dailyCapacity,
  formatMonthLabel,
  formatWeekLabel,
  startOfWeek,
  weekStartISO,
} from "./_components/planUtils";
import { KanbanWeekView } from "./_components/KanbanWeekView";
import { MonthView } from "./_components/MonthView";
import { AddTaskPanel } from "./_components/AddTaskPanel";

export default function PlanPage() {
  const {
    items,
    fetchWeekItems,
    fetchMonthItems,
    addItem,
    removeItem,
    moveItem,
    reorderDay,
    updatePlannedHours,
  } = useWeeklyPlanStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore();
  const { weeklyCapacity } = useWeeklyCapacity();

  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);

  const currentWeekISO = weekStartISO(weekStart);

  // Load data on mount and when navigation changes
  useEffect(() => {
    fetchTasks();
    fetchTimeEntries();
  }, [fetchTasks, fetchTimeEntries]);

  useEffect(() => {
    if (view === "week") {
      fetchWeekItems(currentWeekISO);
    }
  }, [view, currentWeekISO, fetchWeekItems]);

  useEffect(() => {
    if (view === "month") {
      fetchMonthItems(monthDate.getFullYear(), monthDate.getMonth());
    }
  }, [view, monthDate, fetchMonthItems]);

  const trackedByTask = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of timeEntries) {
      const hrs = entry.hours + entry.minutes / 60;
      map.set(entry.taskId, (map.get(entry.taskId) ?? 0) + hrs);
    }
    return map;
  }, [timeEntries]);

  const taskMap = useMemo(
    () => new Map(tasks.map((t) => [t.id!, t])),
    [tasks],
  );

  const dayCapacity = dailyCapacity(weeklyCapacity);

  function navigatePrev() {
    if (view === "week") setWeekStart((w) => addWeeks(w, -1));
    else setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function navigateNext() {
    if (view === "week") setWeekStart((w) => addWeeks(w, 1));
    else setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function navigateToday() {
    setWeekStart(startOfWeek(new Date()));
    setMonthDate(new Date());
  }

  return (
    <PageTransition>
      <div className="h-full p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold mb-1">Plan</h1>
              <p className="text-muted-foreground text-sm">
                Place tasks on your week to see how your days fill up
              </p>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 bg-accent/40 rounded-lg">
              {(["week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                    view === v
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Navigation bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={navigatePrev}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-medium min-w-[200px] text-center">
                {view === "week"
                  ? formatWeekLabel(weekStart)
                  : formatMonthLabel(monthDate)}
              </span>

              <button
                onClick={navigateNext}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={navigateToday}
                className="ml-2 px-3 py-1.5 text-xs rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground border border-border"
              >
                Today
              </button>
            </div>

            {/* Add task CTA — only shown in week view */}
            {view === "week" && (
              <AddTaskPanel
                tasks={tasks}
                trackedByTask={trackedByTask}
                dailyCapacity={dayCapacity}
                existingTaskIds={new Set(items.map((i) => i.taskId))}
                onAdd={(taskId, dayIndex, plannedHours) =>
                  addItem(taskId, currentWeekISO, dayIndex, plannedHours)
                }
              />
            )}
          </motion.div>

          {/* Main content card */}
          <motion.div
            className="bg-card border border-border rounded-lg p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <AnimatePresence mode="wait">
              {view === "week" ? (
                <motion.div
                  key="week"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <KanbanWeekView
                    items={items}
                    weekStart={weekStart}
                    weeklyCapacity={weeklyCapacity}
                    taskMap={taskMap}
                    trackedByTask={trackedByTask}
                    onRemove={removeItem}
                    onTaskClick={setDrawerTaskId}
                    onHoursChange={updatePlannedHours}
                    onMove={(id, toDayIndex, newOrder) =>
                      moveItem(id, toDayIndex, newOrder, currentWeekISO)
                    }
                    onReorderDay={(dayIndex, orderedIds) =>
                      reorderDay(currentWeekISO, dayIndex, orderedIds)
                    }
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="month"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MonthView
                    items={items}
                    year={monthDate.getFullYear()}
                    month={monthDate.getMonth()}
                    weeklyCapacity={weeklyCapacity}
                    taskMap={taskMap}
                    onTaskClick={setDrawerTaskId}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>


        </div>
      </div>

      <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />
    </PageTransition>
  );
}
