"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTaskStore } from "@/store/useTaskStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tasks, tags, fetchTasks, fetchTags, getTaskTags } = useTaskStore();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  const [taskTagsMap, setTaskTagsMap] = useState<Map<number, { id?: number; name: string }[]>>(new Map());

  const [filterEstimationStatus, setFilterEstimationStatus] = useLocalStorage<string>(
    "tasks-filter-estimation-status",
    "",
  );
  const [filterTag, setFilterTag] = useLocalStorage<string>("tasks-filter-tag", "");
  const [filterTaskStatus, setFilterTaskStatus] = useLocalStorage<string>(
    "tasks-filter-task-status",
    "",
  );

  useEffect(() => {
    fetchTasks();
    fetchTags();
  }, [fetchTasks, fetchTags]);

  useEffect(() => {
    async function fetchAllTaskTags() {
      const map = new Map<number, { id?: number; name: string }[]>();
      for (const task of tasks) {
        if (task.id) {
          const t = await getTaskTags(task.id);
          map.set(task.id, t);
        }
      }
      setTaskTagsMap(map);
    }
    if (tasks.length > 0) fetchAllTaskTags();
  }, [tasks, getTaskTags]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstimationStatus =
        !filterEstimationStatus ||
        (filterEstimationStatus === "none"
          ? !task.estimationStatus
          : task.estimationStatus === filterEstimationStatus);

      const matchesTaskStatus = !filterTaskStatus || task.status === filterTaskStatus;

      const matchesTag =
        !filterTag ||
        (task.id &&
          taskTagsMap.has(task.id) &&
          taskTagsMap.get(task.id)!.some((tag) => tag.id?.toString() === filterTag));

      return matchesSearch && matchesEstimationStatus && matchesTaskStatus && matchesTag;
    });
  }, [tasks, searchTerm, filterEstimationStatus, filterTaskStatus, filterTag, taskTagsMap]);

  // Derive selected task ID from URL
  const selectedTaskId = (() => {
    const match = pathname.match(/^\/tasks\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  })();

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-80 lg:w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterEstimationStatus}
              onChange={(e) => setFilterEstimationStatus(e.target.value)}
              className="px-2 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="none">No Status</option>
              <option value="underestimated">Under</option>
              <option value="overestimated">Over</option>
              <option value="on_track">On Track</option>
            </select>

            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-2 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id?.toString()}>
                  {tag.name}
                </option>
              ))}
            </select>

            <select
              value={filterTaskStatus}
              onChange={(e) => setFilterTaskStatus(e.target.value)}
              className="px-2 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-1.5">
          {filteredTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks found
            </div>
          )}
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className={cn(
                "w-full text-left p-3.5 rounded-lg border transition-colors block",
                selectedTaskId === task.id
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50 hover:bg-accent/30",
              )}
            >
              <div className="font-semibold text-sm mb-0.5 leading-snug">{task.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{task.customer}</div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded",
                    task.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                    task.status === "active" && "bg-primary/20 text-primary",
                    task.status === "completed" && "bg-green-500/20 text-green-400",
                    task.status === "canceled" && "bg-red-500/20 text-red-400",
                    task.status === "archived" && "bg-muted text-muted-foreground",
                  )}
                >
                  {task.status}
                </span>
                <span className="text-muted-foreground">{task.estimatedHours}h est.</span>
              </div>
              {task.estimationStatus && (
                <div className="mt-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      task.estimationStatus === "underestimated" &&
                        "bg-orange-500/20 text-orange-400",
                      task.estimationStatus === "overestimated" &&
                        "bg-purple-500/20 text-purple-400",
                      task.estimationStatus === "on_track" &&
                        "bg-green-500/20 text-green-400",
                    )}
                  >
                    {task.estimationStatus === "on_track"
                      ? "on track"
                      : task.estimationStatus}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main content (page-level) */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
