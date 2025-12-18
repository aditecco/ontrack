"use client";

import { useEffect, useState, useMemo } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import {
  formatTime,
  formatDecimalHours,
  formatCurrency,
  formatDate,
  cn,
} from "@/lib/utils";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Download,
  AlertTriangle,
  Link as LinkIcon,
  Tag as TagIcon,
  X,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, Tag } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import toast from "react-hot-toast";

export default function TasksPage() {
  const {
    tasks,
    tags,
    fetchTasks,
    fetchTags,
    setSelectedTask,
    selectedTaskId,
    deleteTask,
    updateTask,
    getTaskTags,
  } = useTaskStore();
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEstimationModal, setShowEstimationModal] = useState(false);
  const [pendingEstimationStatus, setPendingEstimationStatus] = useState<
    "underestimated" | "overestimated" | ""
  >("");
  const [selectedTaskTags, setSelectedTaskTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchTimeEntries();
  }, [fetchTasks, fetchTags, fetchTimeEntries]);

  useEffect(() => {
    if (selectedTaskId) {
      getTaskTags(selectedTaskId).then(setSelectedTaskTags);
    } else {
      setSelectedTaskTags([]);
    }
  }, [selectedTaskId, getTaskTags]);

  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.customer.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const taskStats = selectedTask
    ? (() => {
        const entries = timeEntries.filter((e) => e.taskId === selectedTask.id);
        const totalMinutes = entries.reduce((sum, entry) => {
          return sum + (entry.hours * 60 + entry.minutes);
        }, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        const decimalHours = formatDecimalHours(totalHours, totalMins);
        const remaining = selectedTask.estimatedHours - decimalHours;

        const dailyData = (() => {
          const dailyMap = new Map<string, number>();

          entries.forEach((entry) => {
            const hours = entry.hours + entry.minutes / 60;
            const current = dailyMap.get(entry.date) || 0;
            dailyMap.set(entry.date, current + hours);
          });

          const sortedDates = Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7);

          return sortedDates.map(([date, hours]) => ({
            date: formatDate(new Date(date)),
            hours: Number(hours.toFixed(2)),
            value: Number(hours.toFixed(2)),
          }));
        })();

        return {
          totalHours,
          totalMins,
          decimalHours,
          remaining,
          dailyData,
          entryCount: entries.length,
        };
      })()
    : null;

  const handleEstimationStatusChange = (value: string) => {
    if (!value) return;
    setPendingEstimationStatus(value as "underestimated" | "overestimated");
    setShowEstimationModal(true);
  };

  const handleEstimationModalSubmit = async (reason: string) => {
    if (!selectedTask || !pendingEstimationStatus) return;

    await updateTask(selectedTask.id!, {
      estimationStatus: pendingEstimationStatus as
        | "underestimated"
        | "overestimated",
      estimationReason: reason || undefined,
    });

    toast.success(`Task marked as ${pendingEstimationStatus}`);
    setPendingEstimationStatus("");
    setShowEstimationModal(false);
  };

  const handleEstimationModalCancel = () => {
    setPendingEstimationStatus("");
    setShowEstimationModal(false);
  };

  return (
    <PageTransition>
      <div className="h-full flex">
        <aside className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-2">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id!)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-colors",
                  selectedTaskId === task.id
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="font-semibold mb-1">{task.name}</div>
                <div className="text-sm text-muted-foreground mb-2">
                  {task.customer}
                </div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span
                    className={cn(
                      "px-2 py-1 rounded",
                      task.status === "active" && "bg-primary/20 text-primary",
                      task.status === "completed" &&
                        "bg-green-500/20 text-green-400",
                      task.status === "archived" &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {task.status}
                  </span>
                  <span>{task.estimatedHours}h estimated</span>
                </div>
                {task.estimationStatus && (
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        task.estimationStatus === "underestimated" &&
                          "bg-orange-500/20 text-orange-400",
                        task.estimationStatus === "overestimated" &&
                          "bg-purple-500/20 text-purple-400",
                      )}
                    >
                      {task.estimationStatus}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-8">
          {selectedTask && taskStats ? (
            <div className="space-y-6">
              <motion.div
                className="bg-card border border-border rounded-lg p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold">
                        {selectedTask.name}
                      </h2>
                      {selectedTask.estimationStatus && (
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium",
                            selectedTask.estimationStatus ===
                              "underestimated" &&
                              "bg-orange-500/20 text-orange-400 border border-orange-500/30",
                            selectedTask.estimationStatus === "overestimated" &&
                              "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                          )}
                        >
                          {selectedTask.estimationStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTask.customer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const taskData = {
                          task: selectedTask,
                          stats: taskStats,
                          exportDate: new Date().toISOString(),
                        };
                        const blob = new Blob(
                          [JSON.stringify(taskData, null, 2)],
                          { type: "application/json" },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${selectedTask.name.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success("Task exported successfully");
                      }}
                      className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete "${selectedTask.name}"? This will also delete all time entries.`,
                          )
                        ) {
                          deleteTask(selectedTask.id!);
                          setSelectedTask(null);
                        }
                      }}
                      className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Time Spent
                  </div>
                  <div className="text-2xl font-bold">
                    {formatTime(taskStats.totalHours, taskStats.totalMins)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {taskStats.decimalHours.toFixed(2)}h decimal
                  </div>
                </div>

                <div
                  className={cn(
                    "bg-card border rounded-lg p-4",
                    taskStats.remaining < 0
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">
                      Estimated
                    </div>
                    {selectedTask.isSelfReportedEstimate && (
                      <span className="text-xs px-2 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground/70 bg-transparent">
                        self-reported
                      </span>
                    )}
                    {taskStats.remaining < 0 && (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedTask.estimatedHours}h
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-1",
                      taskStats.remaining < 0
                        ? "text-destructive font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {taskStats.remaining >= 0
                      ? `${taskStats.remaining.toFixed(1)}h remaining`
                      : `${Math.abs(taskStats.remaining).toFixed(1)}h over budget`}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Budget
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedTask.budget
                      ? formatCurrency(selectedTask.budget)
                      : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {taskStats.entryCount}{" "}
                    {taskStats.entryCount === 1 ? "entry" : "entries"}
                  </div>
                </div>
              </div>

              {(selectedTask.description || selectedTask.link || selectedTaskTags.length > 0) && (
                <motion.div
                  className="bg-card border border-border rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-xl font-bold mb-4">Info</h2>
                  <div className="space-y-4">
                    {selectedTask.description && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Description
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedTask.description}
                        </p>
                      </div>
                    )}
                    {selectedTask.link && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Link
                        </div>
                        <a
                          href={selectedTask.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {selectedTask.link}
                        </a>
                      </div>
                    )}
                    {selectedTaskTags.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTaskTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">
                  Daily Time Distribution
                </h2>
                {taskStats.dailyData.length > 0 ? (
                  <div className="space-y-4">
                    {taskStats.dailyData.map((day, index) => {
                      const maxHours = Math.max(
                        ...taskStats.dailyData.map((d) => d.hours),
                        selectedTask.estimatedHours || 8,
                      );
                      const percentage = (day.hours / maxHours) * 100;

                      return (
                        <motion.div
                          key={day.date}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {day.date}
                            </span>
                            <span className="text-sm font-bold">
                              {day.hours.toFixed(2)}h
                            </span>
                          </div>
                          <div className="w-full h-8 bg-accent/50 rounded-full overflow-hidden border border-border/50">
                            <motion.div
                              className={cn(
                                "h-full rounded-full flex items-center justify-end pr-3",
                                day.hours > selectedTask.estimatedHours / 7
                                  ? "bg-gradient-to-r from-red-500 to-red-400"
                                  : "bg-gradient-to-r from-blue-500 to-blue-400",
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{
                                duration: 0.5,
                                delay: index * 0.05,
                              }}
                            >
                              {percentage > 15 && (
                                <span className="text-xs font-semibold text-primary-foreground">
                                  {day.hours.toFixed(1)}h
                                </span>
                              )}
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No time entries yet
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Task Controls</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">
                    {selectedTask.estimationStatus ? "Marked as:" : "Mark as:"}
                  </label>
                  <select
                    value={selectedTask.estimationStatus || ""}
                    onChange={(e) =>
                      handleEstimationStatusChange(e.target.value)
                    }
                    className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select status...</option>
                    <option value="underestimated">Underestimated</option>
                    <option value="overestimated">Overestimated</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">Select a task to view details</p>
                <p className="text-sm">or create a new task to get started</p>
              </div>
            </div>
          )}
        </main>

        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        <AnimatePresence>
          {showCreateModal && (
            <CreateTaskModal onClose={() => setShowCreateModal(false)} availableTags={tags} />
          )}
          {showEstimationModal && pendingEstimationStatus && (
            <EstimationStatusModal
              estimationStatus={pendingEstimationStatus}
              onClose={handleEstimationModalCancel}
              onSubmit={handleEstimationModalSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function CreateTaskModal({ onClose, availableTags }: { onClose: () => void; availableTags: Tag[] }) {
  const { addTask, addTag, tasks } = useTaskStore();
  const [formData, setFormData] = useState({
    name: "",
    customer: "",
    estimatedHours: "",
    budget: "",
    status: "active" as const,
    isSelfReportedEstimate: false,
    description: "",
    link: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const uniqueCustomers = useMemo(() => {
    const customers = tasks.map((t) => t.customer);
    return Array.from(new Set(customers));
  }, [tasks]);

  const filteredCustomers = useMemo(() => {
    if (!formData.customer) return uniqueCustomers;
    return uniqueCustomers.filter((c) =>
      c.toLowerCase().includes(formData.customer.toLowerCase()),
    );
  }, [formData.customer, uniqueCustomers]);

  const filteredTags = useMemo(() => {
    const unselectedTags = availableTags.filter(t => !selectedTagIds.includes(t.id!));
    if (!newTagInput) return unselectedTags;
    return unselectedTags.filter((t) =>
      t.name.toLowerCase().includes(newTagInput.toLowerCase()),
    );
  }, [newTagInput, availableTags, selectedTagIds]);

  const selectedTags = useMemo(() => {
    return availableTags.filter(t => selectedTagIds.includes(t.id!));
  }, [availableTags, selectedTagIds]);

  async function handleAddTag() {
    if (!newTagInput.trim()) return;
    const tagId = await addTag(newTagInput.trim());
    if (tagId && !selectedTagIds.includes(tagId)) {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
    setNewTagInput("");
    setShowTagSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addTask({
      name: formData.name,
      customer: formData.customer,
      estimatedHours: parseFloat(formData.estimatedHours),
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      status: formData.status,
      isSelfReportedEstimate: formData.isSelfReportedEstimate,
      description: formData.description || undefined,
      link: formData.link || undefined,
    }, selectedTagIds);
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Task Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">Customer</label>
            <input
              type="text"
              required
              value={formData.customer}
              onChange={(e) =>
                setFormData({ ...formData, customer: e.target.value })
              }
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowCustomerSuggestions(false), 200)
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type or select existing customer"
            />
            {showCustomerSuggestions && filteredCustomers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-auto scrollbar-thin"
              >
                {filteredCustomers.map((customer, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, customer });
                      setShowCustomerSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                  >
                    {customer}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Estimated Hours
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) =>
                setFormData({ ...formData, estimatedHours: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Budget (€, optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={(e) =>
                setFormData({ ...formData, budget: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="Add task description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Link (optional)
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Tags (optional)
            </label>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))}
                      className="hover:text-primary/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type to search or create tag..."
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagInput.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {showTagSuggestions && filteredTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-auto scrollbar-thin"
              >
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagIds([...selectedTagIds, tag.id!]);
                      setNewTagInput("");
                      setShowTagSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                  >
                    {tag.name}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border">
            <div>
              <label className="text-sm font-medium cursor-pointer">
                Self-reported estimate
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                You decided the estimate (vs. PM/customer)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isSelfReportedEstimate}
              onClick={() =>
                setFormData({
                  ...formData,
                  isSelfReportedEstimate: !formData.isSelfReportedEstimate,
                })
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                formData.isSelfReportedEstimate ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  formData.isSelfReportedEstimate
                    ? "translate-x-6"
                    : "translate-x-1",
                )}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Create Task
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function EstimationStatusModal({
  estimationStatus,
  onClose,
  onSubmit,
}: {
  estimationStatus: "underestimated" | "overestimated";
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(reason);
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold">Mark as {estimationStatus}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Why was this task ${estimationStatus}?`}
              rows={4}
              className="w-full px-4 mt-8 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
