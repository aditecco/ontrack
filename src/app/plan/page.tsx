"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { usePlanStore } from "@/store/usePlanStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { useWeeklyCapacity } from "@/hooks/useWeeklyCapacity";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addWeeks,
  formatMonthLabel,
  formatWeekLabel,
  packTasks,
  startOfWeek,
} from "./_components/planUtils";
import { WeekView } from "./_components/WeekView";
import { MonthView } from "./_components/MonthView";
import { AddTaskPanel } from "./_components/AddTaskPanel";
import type { PlanTask } from "@/lib/db";

export default function PlanPage() {
  const { planTasks, fetchPlanTasks, addPlanTask, removePlanTask, reorderPlanTasks } =
    usePlanStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore();
  const { weeklyCapacity } = useWeeklyCapacity();

  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthDate, setMonthDate] = useState(() => new Date());

  useEffect(() => {
    fetchPlanTasks();
    fetchTasks();
    fetchTimeEntries();
  }, [fetchPlanTasks, fetchTasks, fetchTimeEntries]);

  const trackedByTask = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of timeEntries) {
      const hrs = entry.hours + entry.minutes / 60;
      map.set(entry.taskId, (map.get(entry.taskId) ?? 0) + hrs);
    }
    return map;
  }, [timeEntries]);

  const packed = useMemo(
    () => packTasks(planTasks, tasks, trackedByTask),
    [planTasks, tasks, trackedByTask],
  );

  const planTaskIdSet = useMemo(
    () => new Set(planTasks.map((pt) => pt.taskId)),
    [planTasks],
  );

  async function handleReorder(newOrderedPlanTasks: PlanTask[]) {
    await reorderPlanTasks(newOrderedPlanTasks.map((pt) => pt.id!));
  }

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
      <div className="h-full p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
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
                Sequence your tasks and see what fits in a week
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
            className="flex items-center gap-3"
          >
            <button
              onClick={navigatePrev}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-medium min-w-[200px] text-center">
              {view === "week" ? formatWeekLabel(weekStart) : formatMonthLabel(monthDate)}
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
          </motion.div>

          {/* Main content card */}
          <motion.div
            className="bg-card border border-border rounded-lg p-6"
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
                  <WeekView
                    packed={packed}
                    weekStart={weekStart}
                    weeklyCapacity={weeklyCapacity}
                    onReorder={handleReorder}
                    onRemove={removePlanTask}
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
                    packed={packed}
                    year={monthDate.getFullYear()}
                    month={monthDate.getMonth()}
                    weeklyCapacity={weeklyCapacity}
                    onRemove={removePlanTask}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Add task */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AddTaskPanel
              tasks={tasks}
              planTaskIds={planTaskIdSet}
              onAdd={addPlanTask}
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
