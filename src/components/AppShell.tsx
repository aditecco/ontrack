"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Menu, Zap } from "lucide-react";
import { Navigation } from "./Navigation";
import { CreateTaskModal } from "./CreateTaskModal";
import { useTaskStore } from "@/store/useTaskStore";
import { useTimeEntryStore } from "@/store/useTimeEntryStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { fetchTasks, fetchTags } = useTaskStore();
  const { fetchTimeEntries } = useTimeEntryStore();

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchTimeEntries();
  }, [fetchTasks, fetchTags, fetchTimeEntries]);

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

      {/* Global FAB — create task */}
      <motion.button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 bg-primary text-primary-foreground rounded-full p-4 shadow-lg z-30"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        title="Create new task"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Global create task modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
