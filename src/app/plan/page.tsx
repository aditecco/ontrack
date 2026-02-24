"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { usePlanStore } from "@/store/usePlanStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { useWeeklyCapacity } from "@/hooks/useWeeklyCapacity";
import { motion, AnimatePresence } from "framer-motion";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Task, type PlanTask } from "@/lib/db";

// ── Helpers ────────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

function isSameWeek(date: Date, weekStart: Date): boolean {
  const s = startOfWeek(date);
  return s.getTime() === weekStart.getTime();
}

function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** ISO yyyy-mm-dd string for a Date */
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Weeks (Mon-Sun) that overlap the given month */
function weeksInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: Date[] = [];
  let cur = startOfWeek(first);
  while (cur <= last) {
    weeks.push(new Date(cur));
    cur = addWeeks(cur, 1);
  }
  return weeks;
}

// ── Per-task computations ──────────────────────────────────────────────────────

interface PackedTask {
  planTask: PlanTask;
  task: Task;
  trackedHours: number;
  remainingHours: number;
  /** cumulative hours BEFORE this task (in the global sequence) */
  startHour: number;
  /** cumulative hours AFTER this task */
  endHour: number;
}

function packTasks(
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

// ── Sortable task row (weekly view) ───────────────────────────────────────────

interface SortableRowProps {
  packed: PackedTask;
  weeklyCapacity: number;
  /** hours already "used" by tasks earlier in the week sequence */
  weekOffsetHours: number;
  onRemove: () => void;
}

function SortableRow({
  packed,
  weeklyCapacity,
  weekOffsetHours,
  onRemove,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: packed.planTask.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Position within THIS week's timeline
  const weekStart = weekOffsetHours;
  const weekEnd = weeklyCapacity;
  const taskStart = Math.max(packed.startHour - weekStart, 0);
  const taskEnd = Math.min(packed.endHour - weekStart, weekEnd);
  const barLeft = Math.min(taskStart / weeklyCapacity, 1) * 100;
  const barWidth = Math.max(((taskEnd - taskStart) / weeklyCapacity) * 100, 0);
  const isFullyAfter = packed.startHour - weekStart >= weeklyCapacity;
  const overflows = packed.endHour - weekStart > weeklyCapacity && !isFullyAfter;

  const pct = packed.task.estimatedHours > 0
    ? Math.min((packed.trackedHours / packed.task.estimatedHours) * 100, 100)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors",
        isDragging
          ? "bg-accent/80 border-primary/40 shadow-lg z-50"
          : isFullyAfter
          ? "bg-card/40 border-border/40 opacity-50"
          : "bg-card border-border hover:border-border/80",
      )}
    >
      {/* Drag handle */}
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Task info */}
      <div className="flex-shrink-0 w-48 min-w-0">
        <p className="text-sm font-medium truncate" title={packed.task.name}>
          {packed.task.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{packed.task.customer}</p>
      </div>

      {/* Hours badge */}
      <div className="flex-shrink-0 text-right w-20">
        <p className="text-sm font-mono font-semibold">
          {packed.remainingHours.toFixed(1)}h
        </p>
        <p className="text-xs text-muted-foreground">remaining</p>
      </div>

      {/* Gantt bar */}
      <div className="flex-1 relative h-8">
        {/* Track background */}
        <div className="absolute inset-y-1 inset-x-0 bg-accent/30 rounded" />
        {/* Progress of how much is already tracked (subtle) */}
        {pct > 0 && (
          <div
            className="absolute inset-y-1 left-0 bg-primary/10 rounded"
            style={{ width: `${pct}%` }}
          />
        )}
        {/* Scheduled bar */}
        {barWidth > 0 && (
          <div
            className={cn(
              "absolute inset-y-1 rounded",
              isFullyAfter ? "bg-muted-foreground/20" : "bg-primary/60",
            )}
            style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
          />
        )}
        {/* Overflow indicator */}
        {overflows && (
          <div className="absolute right-0 inset-y-0 flex items-center">
            <span className="text-[10px] text-amber-500 font-medium pr-1">overflow</span>
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remove from plan"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Add-task search panel ──────────────────────────────────────────────────────

interface AddTaskPanelProps {
  tasks: Task[];
  planTaskIds: Set<number>;
  onAdd: (taskId: number) => void;
}

function AddTaskPanel({ tasks, planTaskIds, onAdd }: AddTaskPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks
      .filter((t) => !planTaskIds.has(t.id!) && t.status !== "archived" && t.status !== "canceled")
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [tasks, planTaskIds, query]);

  function handleAdd(taskId: number) {
    onAdd(taskId);
    setQuery("");
    inputRef.current?.focus();
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors text-sm w-full"
      >
        <Plus className="w-4 h-4" />
        Add task to plan
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks by name or customer…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-3">
            {query ? "No matching tasks found" : "All tasks are already in the plan"}
          </p>
        ) : (
          results.map((task) => (
            <button
              key={task.id}
              onClick={() => handleAdd(task.id!)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.name}</p>
                <p className="text-xs text-muted-foreground truncate">{task.customer}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-3 flex-shrink-0">
                {task.estimatedHours}h est.
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

interface WeekViewProps {
  packed: PackedTask[];
  weekStart: Date;
  weeklyCapacity: number;
  onReorder: (newOrder: PlanTask[]) => void;
  onRemove: (id: number) => void;
}

function WeekView({
  packed,
  weekStart,
  weeklyCapacity,
  onReorder,
  onRemove,
}: WeekViewProps) {
  const weekEnd = addDays(weekStart, 6);

  // How many hours are "used" by the capacity before this week starts
  // (tasks from previous weeks already consume some hours — not relevant here;
  //  the week offset is defined by: each week has weeklyCapacity hours)
  // For now "week 0" starts at hour 0 of the plan, week 1 at weeklyCapacity, etc.
  const weekIndex = Math.floor(
    (weekStart.getTime() - startOfWeek(new Date()).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );
  // Clamp negative (past weeks) to 0
  const weekOffsetHours = Math.max(weekIndex, 0) * weeklyCapacity;

  // Tasks visible in this week: they either start or continue in [weekOffsetHours, weekOffsetHours+weeklyCapacity)
  const thisWeekTasks = packed.filter(
    (p) =>
      p.startHour < weekOffsetHours + weeklyCapacity &&
      p.endHour > weekOffsetHours,
  );
  const queuedTasks = packed.filter((p) => p.startHour >= weekOffsetHours + weeklyCapacity);

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
    const reordered = arrayMove(packed, oldIndex, newIndex).map((p) => p.planTask);
    onReorder(reordered);
  }

  // Day markers (5 workdays = capacity / 5 each)
  const hoursPerDay = weeklyCapacity / 5;
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-4">
      {/* Week label */}
      <p className="text-xs text-muted-foreground">
        {weekStart.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        {" – "}
        {weekEnd.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {/* Capacity summary bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Week capacity</span>
          <span className={cn("font-mono font-semibold", over ? "text-amber-500" : "text-foreground")}>
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
        {/* Day tick marks */}
        <div className="flex justify-between px-0">
          {dayLabels.map((d, i) => (
            <span key={d} className="text-[10px] text-muted-foreground/60" style={{ width: "20%", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Column header for the task table */}
      <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
        <div className="w-4 flex-shrink-0" />
        <div className="w-48 flex-shrink-0">Task</div>
        <div className="w-20 flex-shrink-0 text-right">Remaining</div>
        <div className="flex-1">This week</div>
        <div className="w-4 flex-shrink-0" />
      </div>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

      {/* Queued tasks (beyond this week) */}
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
                  <p className="text-xs text-muted-foreground truncate">{p.task.customer}</p>
                </div>
                <div className="flex-shrink-0 text-right w-20">
                  <p className="text-sm font-mono font-semibold">{p.remainingHours.toFixed(1)}h</p>
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

// ── Month view ────────────────────────────────────────────────────────────────

interface MonthViewProps {
  packed: PackedTask[];
  year: number;
  month: number; // 0-based
  weeklyCapacity: number;
  onRemove: (id: number) => void;
}

function MonthView({ packed, year, month, weeklyCapacity, onRemove }: MonthViewProps) {
  const weeks = weeksInMonth(year, month);
  const today = startOfWeek(new Date());

  // Total hours in month view
  const totalMonthCapacity = weeks.length * weeklyCapacity;
  const totalRemaining = packed.reduce((s, p) => s + p.remainingHours, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6 text-sm">
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

      {/* Week columns grid */}
      <div>
        {/* Header row */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}>
          <div />
          {weeks.map((ws, i) => {
            const isCurrentWeek = ws.getTime() === today.getTime();
            return (
              <div key={i} className="text-center">
                <p className={cn("text-[10px] font-medium", isCurrentWeek ? "text-primary" : "text-muted-foreground")}>
                  W{i + 1}
                </p>
                <p className={cn("text-[10px]", isCurrentWeek ? "text-primary" : "text-muted-foreground/60")}>
                  {ws.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        <div className="space-y-1.5">
          {packed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks in the plan yet.
            </p>
          )}
          {packed.map((p) => (
            <div
              key={p.planTask.id}
              className="grid gap-1 items-center group"
              style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}
            >
              {/* Task label */}
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <button
                  onClick={() => onRemove(p.planTask.id!)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" title={p.task.name}>
                    {p.task.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.remainingHours.toFixed(1)}h left</p>
                </div>
              </div>

              {/* Week cells */}
              {weeks.map((ws, wi) => {
                const weekStart = wi * weeklyCapacity;
                const weekEnd = (wi + 1) * weeklyCapacity;
                // How many hours of this task fall in this week column?
                const overlapStart = Math.max(p.startHour - weekStart, 0);
                const overlapEnd = Math.min(p.endHour - weekStart, weeklyCapacity);
                const overlapHours = Math.max(overlapEnd - overlapStart, 0);
                const fillPct = (overlapHours / weeklyCapacity) * 100;
                const offsetPct = (overlapStart / weeklyCapacity) * 100;
                const isCurrentWeek = ws.getTime() === today.getTime();

                return (
                  <div key={wi} className="relative h-6">
                    <div className={cn("absolute inset-0 rounded", isCurrentWeek ? "bg-accent/50" : "bg-accent/20")} />
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

        {/* Capacity footer per week */}
        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}>
          <div className="text-[10px] text-muted-foreground text-right pr-2">Capacity used</div>
          {weeks.map((ws, wi) => {
            const weekStart = wi * weeklyCapacity;
            const weekEnd = (wi + 1) * weeklyCapacity;
            const used = packed.reduce((sum, p) => {
              const s = Math.max(p.startHour - weekStart, 0);
              const e = Math.min(p.endHour - weekStart, weeklyCapacity);
              return sum + Math.max(e - s, 0);
            }, 0);
            const over = used > weeklyCapacity;
            return (
              <div key={wi} className="text-center">
                <p className={cn("text-[10px] font-mono font-semibold", over ? "text-amber-500" : "text-muted-foreground")}>
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

// ── Main page ──────────────────────────────────────────────────────────────────

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

  // Tracked hours per task (all time, not just this week)
  const trackedByTask = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of timeEntries) {
      const hrs = entry.hours + entry.minutes / 60;
      map.set(entry.taskId, (map.get(entry.taskId) ?? 0) + hrs);
    }
    return map;
  }, [timeEntries]);

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id!, t])), [tasks]);

  // Ordered plan tasks (sorted by .order, already from the store)
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
              onClick={() => {
                if (view === "week") setWeekStart((w) => addWeeks(w, -1));
                else setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
              }}
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
              onClick={() => {
                if (view === "week") setWeekStart((w) => addWeeks(w, 1));
                else setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
              }}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setWeekStart(startOfWeek(new Date()));
                setMonthDate(new Date());
              }}
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
                    onRemove={(id) => removePlanTask(id)}
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
                    onRemove={(id) => removePlanTask(id)}
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
              onAdd={(taskId) => addPlanTask(taskId)}
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
