"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Menu, Zap, Clock, ClipboardList, BarChart2, X } from "lucide-react";
import { Navigation } from "./Navigation";
import { CreateTaskModal } from "./CreateTaskModal";
import { QuickTrackModal } from "./QuickTrackModal";
import { CreateReportModal } from "./CreateReportModal";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";

const fabActions = [
  {
    id: "task",
    label: "Task",
    icon: ClipboardList,
  },
  {
    id: "report",
    label: "Report",
    icon: BarChart2,
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: Clock,
  },
] as const;

type FabActionId = (typeof fabActions)[number]["id"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickTrackModal, setShowQuickTrackModal] = useState(false);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const { fetchTasks, fetchTags } = useTaskStore();
  const { fetchTimeEntries } = useTimeEntryStore();
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchTimeEntries();
  }, [fetchTasks, fetchTags, fetchTimeEntries]);

  // Close FAB menu when clicking outside
  useEffect(() => {
    if (!fabOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fabOpen]);

  function handleFabAction(id: FabActionId) {
    setFabOpen(false);
    if (id === "task") setShowCreateModal(true);
    else if (id === "tracking") setShowQuickTrackModal(true);
    else if (id === "report") setShowCreateReportModal(true);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Navigation />

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <Navigation mobile onClose={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-semibold text-sm">OnTrack</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Global FAB — speed dial */}
      <div ref={fabRef} className="fixed bottom-8 right-8 z-30 flex flex-col items-end gap-3">
        {/* Sub-actions */}
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              className="flex flex-col items-end gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {fabActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.85 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 28,
                      delay: i * 0.04,
                    }}
                  >
                    <span className="px-2.5 py-1 bg-card border border-border rounded-lg text-sm font-medium shadow-sm whitespace-nowrap">
                      {action.label}
                    </span>
                    <motion.button
                      onClick={() => handleFabAction(action.id)}
                      className="w-11 h-11 bg-card border border-border text-foreground rounded-full shadow-md flex items-center justify-center hover:bg-accent transition-colors"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.93 }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          title={fabOpen ? "Close menu" : "Create new…"}
          aria-label={fabOpen ? "Close menu" : "Create new…"}
        >
          <motion.div
            animate={{ rotate: fabOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal onClose={() => setShowCreateModal(false)} />
        )}
        {showQuickTrackModal && (
          <QuickTrackModal onClose={() => setShowQuickTrackModal(false)} />
        )}
        {showCreateReportModal && (
          <CreateReportModal onClose={() => setShowCreateReportModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
