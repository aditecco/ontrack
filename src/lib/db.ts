import Dexie, { type Table } from "dexie";

export type TaskStatus = "active" | "completed" | "archived";
export type EstimationStatus = "underestimated" | "overestimated" | null;

export interface Task {
  id?: number;
  name: string;
  customer: string;
  estimatedHours: number;
  budget?: number;
  status: TaskStatus;
  estimationStatus?: EstimationStatus;
  estimationReason?: string;
  isSelfReportedEstimate?: boolean;
  description?: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface TaskTag {
  id?: number;
  taskId: number;
  tagId: number;
}

export interface TimeEntry {
  id?: number;
  taskId: number;
  date: string;
  hours: number;
  minutes: number;
  notes?: string;
  createdAt: Date;
}

export interface DayNote {
  id?: number;
  date: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export class OnTrackDB extends Dexie {
  tasks!: Table<Task>;
  timeEntries!: Table<TimeEntry>;
  dayNotes!: Table<DayNote>;
  tags!: Table<Tag>;
  taskTags!: Table<TaskTag>;

  constructor() {
    super("ontrack");
    this.version(1).stores({
      tasks: "++id, name, customer, status, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
    });
    this.version(2).stores({
      tasks: "++id, name, customer, status, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
      dayNotes: "++id, &date, createdAt",
    });
    this.version(3).stores({
      tasks: "++id, name, customer, status, estimationStatus, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
      dayNotes: "++id, &date, createdAt",
    });
    this.version(4).stores({
      tasks:
        "++id, name, customer, status, estimationStatus, isSelfReportedEstimate, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
      dayNotes: "++id, &date, createdAt",
    });
    this.version(5).stores({
      tasks:
        "++id, name, customer, status, estimationStatus, isSelfReportedEstimate, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
      dayNotes: "++id, &date, createdAt",
      tags: "++id, &name, createdAt",
      taskTags: "++id, taskId, tagId, [taskId+tagId]",
    });
  }
}

export const db = new OnTrackDB();
