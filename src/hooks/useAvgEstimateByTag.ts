import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db";
import { useTaskStore } from "@/store/useTaskStore";

export interface AvgEstimateEntry {
  tagId: number;
  tagName: string;
  avgEstimate: number;
  taskCount: number;
}

export function useAvgEstimateByTag(): AvgEstimateEntry[] {
  const { tasks, tags } = useTaskStore();
  const [allTaskTags, setAllTaskTags] = useState<
    Array<{ taskId: number; tagId: number }>
  >([]);

  useEffect(() => {
    db.taskTags.toArray().then(
      (rows) => setAllTaskTags(rows.map((r) => ({ taskId: r.taskId, tagId: r.tagId }))),
    );
  }, [tasks]);

  return useMemo(() => {
    const tagMap = new Map(tags.map((t) => [t.id!, t]));
    const taskMap = new Map(tasks.map((t) => [t.id!, t]));
    const acc = new Map<number, { total: number; count: number; tagName: string }>();

    for (const { taskId, tagId } of allTaskTags) {
      const task = taskMap.get(taskId);
      const tag = tagMap.get(tagId);
      if (!task || !tag) continue;
      const existing = acc.get(tagId) ?? { total: 0, count: 0, tagName: tag.name };
      existing.total += task.estimatedHours;
      existing.count++;
      acc.set(tagId, existing);
    }

    return Array.from(acc.entries())
      .map(([tagId, data]) => ({
        tagId,
        tagName: data.tagName,
        avgEstimate: data.total / data.count,
        taskCount: data.count,
      }))
      .sort((a, b) => b.avgEstimate - a.avgEstimate);
  }, [tasks, tags, allTaskTags]);
}
