import Dexie, { type Table } from "dexie";

export type TaskStatus = "active" | "completed" | "archived" | "pending" | "canceled";
export type EstimationStatus = "underestimated" | "overestimated" | "on_track" | null;

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

export interface ReportPreset {
  id?: number;
  name: string;
  daysBack: number;
  includeCurrentDay: boolean;
  includeDayNotes: boolean;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id?: number;
  name: string;
  content: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id?: number;
  title: string;
  content: string;
  presetId?: number;
  templateId?: number;
  dateRange: {
    from: string;
    to: string;
  };
  includedDayNotes: boolean;
  createdAt: Date;
}

export class OnTrackDB extends Dexie {
  tasks!: Table<Task>;
  timeEntries!: Table<TimeEntry>;
  dayNotes!: Table<DayNote>;
  tags!: Table<Tag>;
  taskTags!: Table<TaskTag>;
  reports!: Table<Report>;
  reportPresets!: Table<ReportPreset>;
  reportTemplates!: Table<ReportTemplate>;

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
    this.version(6).stores({
      tasks:
        "++id, name, customer, status, estimationStatus, isSelfReportedEstimate, createdAt",
      timeEntries: "++id, taskId, date, createdAt",
      dayNotes: "++id, &date, createdAt",
      tags: "++id, &name, createdAt",
      taskTags: "++id, taskId, tagId, [taskId+tagId]",
      reports: "++id, createdAt",
      reportPresets: "++id, name, isDefault, createdAt",
      reportTemplates: "++id, name, isDefault, createdAt",
    });
  }
}

export const db = new OnTrackDB();
