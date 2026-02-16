"use client";

import { useEffect, useState, useMemo } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";
import { formatDecimalHours, cn } from "@/lib/utils";
import type { Tag } from "@/lib/db";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

export default function AnalyzePage() {
  const { tasks, tags, fetchTasks, fetchTags, getTaskTags } = useTaskStore();
  const { timeEntries, fetchTimeEntries } = useTimeEntryStore();
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [taskTagsMap, setTaskTagsMap] = useState<Map<number, Tag[]>>(
    new Map()
  );

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchTimeEntries();
  }, [fetchTasks, fetchTags, fetchTimeEntries]);

  useEffect(() => {
    async function fetchAllTaskTags() {
      const map = new Map<number, Tag[]>();
      for (const task of tasks) {
        if (task.id) {
          const taskTags = await getTaskTags(task.id);
          map.set(task.id, taskTags);
        }
      }
      setTaskTagsMap(map);
    }
    if (tasks.length > 0) {
      fetchAllTaskTags();
    }
  }, [tasks, getTaskTags]);

  // Tasks filtered by selected tag
  const filteredTasks = useMemo(() => {
    if (!selectedTagId) return tasks;
    return tasks.filter(
      (task) =>
        task.id &&
        taskTagsMap.has(task.id) &&
        taskTagsMap
          .get(task.id)!
          .some((tag) => tag.id?.toString() === selectedTagId)
    );
  }, [tasks, selectedTagId, taskTagsMap]);

  // Compute actual hours per task
  const taskActualHours = useMemo(() => {
    const map = new Map<number, number>();
    for (const task of tasks) {
      if (!task.id) continue;
      const entries = timeEntries.filter((e) => e.taskId === task.id);
      const totalMinutes = entries.reduce(
        (sum, e) => sum + (e.hours * 60 + e.minutes),
        0
      );
      map.set(task.id, totalMinutes / 60);
    }
    return map;
  }, [tasks, timeEntries]);

  // 1. Average estimate per tag (bar chart)
  const avgEstimateByTag = useMemo(() => {
    const tagEstimates = new Map<string, { total: number; count: number }>();
    for (const task of tasks) {
      if (!task.id || !taskTagsMap.has(task.id)) continue;
      for (const tag of taskTagsMap.get(task.id)!) {
        const key = tag.name;
        const existing = tagEstimates.get(key) || { total: 0, count: 0 };
        existing.total += task.estimatedHours;
        existing.count++;
        tagEstimates.set(key, existing);
      }
    }
    return Array.from(tagEstimates.entries())
      .map(([name, data]) => ({
        name,
        avgEstimate: Number((data.total / data.count).toFixed(1)),
        taskCount: data.count,
      }))
      .sort((a, b) => b.avgEstimate - a.avgEstimate);
  }, [tasks, taskTagsMap]);

  // 2. Estimation accuracy distribution for filtered tasks
  const estimationDistribution = useMemo(() => {
    const completedTasks = filteredTasks.filter(
      (t) => t.status === "completed" || t.estimationStatus
    );
    const under = completedTasks.filter(
      (t) => t.estimationStatus === "underestimated"
    ).length;
    const over = completedTasks.filter(
      (t) => t.estimationStatus === "overestimated"
    ).length;
    const onTrack = completedTasks.filter(
      (t) => t.estimationStatus === "on_track"
    ).length;
    const noStatus = completedTasks.filter((t) => !t.estimationStatus).length;

    return [
      { name: "Underestimated", value: under, color: "#f97316" },
      { name: "Overestimated", value: over, color: "#a855f7" },
      { name: "On Track", value: onTrack, color: "#22c55e" },
      { name: "No Status", value: noStatus, color: "#64748b" },
    ].filter((d) => d.value > 0);
  }, [filteredTasks]);

  // 3. Estimated vs Actual scatter data for filtered tasks
  const estimatedVsActual = useMemo(() => {
    return filteredTasks
      .filter((t) => t.id && taskActualHours.has(t.id))
      .map((t) => {
        const actual = taskActualHours.get(t.id!) || 0;
        return {
          name: t.name,
          estimated: t.estimatedHours,
          actual: Number(actual.toFixed(1)),
          status: t.estimationStatus || "none",
        };
      })
      .filter((d) => d.actual > 0);
  }, [filteredTasks, taskActualHours]);

  // 4. Estimation accuracy over time (monthly)
  const accuracyOverTime = useMemo(() => {
    const monthlyData = new Map<
      string,
      { total: number; accurate: number; under: number; over: number }
    >();

    for (const task of filteredTasks) {
      if (!task.estimationStatus || !task.createdAt) continue;
      const date = new Date(task.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyData.get(monthKey) || {
        total: 0,
        accurate: 0,
        under: 0,
        over: 0,
      };
      existing.total++;
      if (task.estimationStatus === "on_track") existing.accurate++;
      if (task.estimationStatus === "underestimated") existing.under++;
      if (task.estimationStatus === "overestimated") existing.over++;
      monthlyData.set(monthKey, existing);
    }

    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        accuracyRate:
          data.total > 0
            ? Number(((data.accurate / data.total) * 100).toFixed(0))
            : 0,
        underRate:
          data.total > 0
            ? Number(((data.under / data.total) * 100).toFixed(0))
            : 0,
        overRate:
          data.total > 0
            ? Number(((data.over / data.total) * 100).toFixed(0))
            : 0,
        total: data.total,
      }));
  }, [filteredTasks]);

  // 5. Average estimation error by tag
  const estimationErrorByTag = useMemo(() => {
    const tagErrors = new Map<
      string,
      { totalError: number; totalPctError: number; count: number }
    >();

    for (const task of tasks) {
      if (!task.id || !taskTagsMap.has(task.id)) continue;
      const actual = taskActualHours.get(task.id) || 0;
      if (actual === 0) continue;

      const error = actual - task.estimatedHours;
      const pctError =
        task.estimatedHours > 0
          ? ((actual - task.estimatedHours) / task.estimatedHours) * 100
          : 0;

      for (const tag of taskTagsMap.get(task.id)!) {
        const existing = tagErrors.get(tag.name) || {
          totalError: 0,
          totalPctError: 0,
          count: 0,
        };
        existing.totalError += error;
        existing.totalPctError += pctError;
        existing.count++;
        tagErrors.set(tag.name, existing);
      }
    }

    return Array.from(tagErrors.entries())
      .map(([name, data]) => ({
        name,
        avgError: Number((data.totalError / data.count).toFixed(1)),
        avgPctError: Number((data.totalPctError / data.count).toFixed(0)),
        taskCount: data.count,
      }))
      .sort((a, b) => Math.abs(b.avgPctError) - Math.abs(a.avgPctError));
  }, [tasks, taskTagsMap, taskActualHours]);

  // Summary stats for filtered tasks
  const summaryStats = useMemo(() => {
    const withEstimation = filteredTasks.filter((t) => t.estimationStatus);
    const onTrack = withEstimation.filter(
      (t) => t.estimationStatus === "on_track"
    ).length;
    const under = withEstimation.filter(
      (t) => t.estimationStatus === "underestimated"
    ).length;
    const accuracyRate =
      withEstimation.length > 0
        ? ((onTrack / withEstimation.length) * 100).toFixed(0)
        : "N/A";

    const tasksWithActual = filteredTasks.filter(
      (t) => t.id && (taskActualHours.get(t.id) || 0) > 0
    );
    const avgOverrun =
      tasksWithActual.length > 0
        ? tasksWithActual.reduce((sum, t) => {
            const actual = taskActualHours.get(t.id!) || 0;
            return sum + (actual - t.estimatedHours);
          }, 0) / tasksWithActual.length
        : 0;

    return {
      totalTasks: filteredTasks.length,
      withEstimation: withEstimation.length,
      onTrack,
      underestimated: under,
      accuracyRate,
      avgOverrun: avgOverrun.toFixed(1),
    };
  }, [filteredTasks, taskActualHours]);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--card-foreground))",
  };

  return (
    <PageTransition>
      <div className="h-full overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2">Analyze</h1>
            <p className="text-muted-foreground text-sm">
              Estimation insights to help you create reliable, spot-on estimates
            </p>
          </motion.div>

          {/* Tag filter */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <label className="text-sm font-medium">Filter by tag:</label>
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id?.toString()}>
                  {tag.name}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              className="bg-card border border-border rounded-lg p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Accuracy Rate</h3>
              </div>
              <p className="text-2xl font-bold">
                {summaryStats.accuracyRate}
                {summaryStats.accuracyRate !== "N/A" && "%"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.onTrack} of {summaryStats.withEstimation} on track
              </p>
            </motion.div>

            <motion.div
              className={cn(
                "border rounded-lg p-5",
                Number(summaryStats.avgOverrun) > 0
                  ? "bg-destructive/5 border-destructive/50"
                  : "bg-card border-border"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h3 className="font-semibold text-sm">Avg Overrun</h3>
              </div>
              <p className="text-2xl font-bold">
                {summaryStats.avgOverrun}h
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                average actual - estimated
              </p>
            </motion.div>

            <motion.div
              className="bg-card border border-border rounded-lg p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Tasks Analyzed</h3>
              </div>
              <p className="text-2xl font-bold">{summaryStats.totalTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedTagId ? "with selected tag" : "total tasks"}
              </p>
            </motion.div>

            <motion.div
              className={cn(
                "border rounded-lg p-5",
                summaryStats.underestimated > 0
                  ? "bg-orange-500/5 border-orange-500/30"
                  : "bg-card border-border"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-sm">Underestimated</h3>
              </div>
              <p className="text-2xl font-bold">
                {summaryStats.underestimated}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                tasks that ran over estimate
              </p>
            </motion.div>
          </div>

          {/* Row 1: Average Estimate by Tag + Estimation Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              className="bg-card border border-border rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-4">
                Average Estimate by Tag
              </h2>
              {avgEstimateByTag.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={avgEstimateByTag} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      tickLine={false}
                      label={{
                        value: "Hours",
                        position: "insideBottom",
                        offset: -5,
                        fill: "hsl(var(--foreground))",
                      }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value}h`,
                        "Avg Estimate",
                      ]}
                    />
                    <Bar
                      dataKey="avgEstimate"
                      fill="hsl(210 90% 60%)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No tagged tasks yet
                </div>
              )}
            </motion.div>

            <motion.div
              className="bg-card border border-border rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h2 className="text-lg font-bold mb-4">
                Estimation Accuracy Distribution
              </h2>
              {estimationDistribution.length > 0 ? (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={250}>
                    <PieChart>
                      <Pie
                        data={estimationDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        {estimationDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {estimationDistribution.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No estimation data yet
                </div>
              )}
            </motion.div>
          </div>

          {/* Row 2: Estimated vs Actual scatter */}
          <motion.div
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-bold mb-2">
              Estimated vs Actual Hours
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Points above the diagonal line took longer than estimated
            </p>
            {estimatedVsActual.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="estimated"
                    type="number"
                    name="Estimated"
                    stroke="hsl(var(--border))"
                    tick={{
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                    label={{
                      value: "Estimated (h)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "hsl(var(--foreground))",
                    }}
                  />
                  <YAxis
                    dataKey="actual"
                    type="number"
                    name="Actual"
                    stroke="hsl(var(--border))"
                    tick={{
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                    label={{
                      value: "Actual (h)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "hsl(var(--foreground))",
                    }}
                  />
                  <ZAxis range={[60, 200]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => `${value}h`}
                    labelFormatter={(label) => {
                      const item = estimatedVsActual.find(
                        (d) => d.estimated === label
                      );
                      return item?.name || "";
                    }}
                  />
                  <Scatter
                    data={estimatedVsActual}
                    fill="hsl(210 90% 60%)"
                  >
                    {estimatedVsActual.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.actual > entry.estimated
                            ? "#f97316"
                            : "#22c55e"
                        }
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No tracked tasks yet
              </div>
            )}
          </motion.div>

          {/* Row 3: Estimation Error by Tag + Accuracy Over Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              className="bg-card border border-border rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="text-lg font-bold mb-2">
                Average Estimation Error by Tag
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Positive = actual exceeded estimate
              </p>
              {estimationErrorByTag.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={estimationErrorByTag} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      tickLine={false}
                      label={{
                        value: "Avg Error %",
                        position: "insideBottom",
                        offset: -5,
                        fill: "hsl(var(--foreground))",
                      }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        "Avg Error",
                      ]}
                    />
                    <Bar dataKey="avgPctError" radius={[0, 4, 4, 0]}>
                      {estimationErrorByTag.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.avgPctError > 0 ? "#f97316" : "#22c55e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No data yet
                </div>
              )}
            </motion.div>

            <motion.div
              className="bg-card border border-border rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-lg font-bold mb-2">
                Estimation Accuracy Over Time
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Monthly breakdown of estimation outcomes
              </p>
              {accuracyOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={accuracyOverTime}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 11,
                      }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--border))"
                      tick={{
                        fill: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      tickLine={false}
                      domain={[0, 100]}
                      label={{
                        value: "%",
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--foreground))",
                      }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name,
                      ]}
                    />
                    <Legend iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="accuracyRate"
                      stroke="#22c55e"
                      name="On Track"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="underRate"
                      stroke="#f97316"
                      name="Underestimated"
                      strokeWidth={2}
                      dot={{ fill: "#f97316", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="overRate"
                      stroke="#a855f7"
                      name="Overestimated"
                      strokeWidth={2}
                      dot={{ fill: "#a855f7", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No estimation history yet
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
