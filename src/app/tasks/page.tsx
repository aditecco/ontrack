"use client";

import { PageTransition } from "@/components/PageTransition";

export default function TasksPage() {
  return (
    <PageTransition>
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Select a task to view details</p>
          <p className="text-sm">or create a new task with the + button</p>
        </div>
      </div>
    </PageTransition>
  );
}
