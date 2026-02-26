"use client";

import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  Sun,
  Moon,
  FileText,
  Database,
  ChevronRight,
  Calendar,
  Timer,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useWeeklyCapacity } from "@/hooks/useWeeklyCapacity";
import { useWorkDayConfig } from "@/hooks/useWorkDayConfig";
import { DATE_FORMAT_OPTIONS } from "@/lib/utils";

export default function SettingsPage() {
  const { dateFormat, setDateFormat } = useDateFormat();
  const { weeklyCapacity, setWeeklyCapacity } = useWeeklyCapacity();
  const { config: workDayConfig, updateConfig: updateWorkDayConfig } = useWorkDayConfig();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "dark";
  });

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const settingsCategories = [
    {
      title: "Report Configuration",
      description: "Manage report presets and templates",
      icon: FileText,
      href: "/settings/reports",
      color: "text-blue-500",
    },
    {
      title: "Data Management",
      description: "Export and import your data",
      icon: Database,
      href: "/settings/export",
      color: "text-green-500",
    },
  ];

  return (
    <PageTransition>
      <div className="h-full p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your preferences and data
            </p>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            className="bg-card border border-border rounded-lg p-6 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold">Appearance</h2>

            {/* Theme toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-border" />

            {/* Date format */}
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">Date format</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  How dates are displayed across the app. Data is always stored
                  as ISO (YYYY-MM-DD) internally.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDateFormat(opt.value)}
                    className={[
                      "px-3 py-2 rounded-lg border text-sm transition-colors font-mono",
                      dateFormat === opt.value
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:border-primary/50 hover:bg-accent/50 text-muted-foreground",
                    ].join(" ")}
                    title={opt.label}
                  >
                    {opt.example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Plan Mode Section */}
          <motion.div
            className="bg-card border border-border rounded-lg overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {/* Section header */}
            <div className="px-6 py-4 border-b border-border bg-accent/20 flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Plan Mode</h2>
            </div>

            <div className="p-6 space-y-0 divide-y divide-border">
              {/* Capacity subsection */}
              <div className="pb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Capacity</p>
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-medium text-sm">Weekly capacity</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Total hours you plan to work per week
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={weeklyCapacity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v > 0 && v <= 168) setWeeklyCapacity(v);
                      }}
                      className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-sm text-muted-foreground">h / week</span>
                  </div>
                </div>
              </div>

              {/* Work day subsection */}
              <div className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Work Day Schedule</p>
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-medium text-sm">Day start &amp; lunch</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Shown as tick marks in Plan day columns
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 flex-wrap justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Start</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={workDayConfig.dayStartHour}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 0 && v <= 23)
                            updateWorkDayConfig({ dayStartHour: v });
                        }}
                        className="w-16 px-3 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Lunch</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={workDayConfig.lunchHour}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 0 && v <= 23)
                            updateWorkDayConfig({ lunchHour: v });
                        }}
                        className="w-16 px-3 py-2 rounded-lg border border-border bg-background text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Settings Categories Grid */}
          <div>
            <motion.h2
              className="text-xl font-semibold mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Configuration
            </motion.h2>
            <div className="space-y-3">
              {settingsCategories.map((category, index) => (
                <motion.div
                  key={category.href}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Link href={category.href}>
                    <div className="bg-card border border-border rounded-lg hover:bg-accent/30 transition-all cursor-pointer group flex items-center gap-4 p-5">
                      <div
                        className={`p-3 rounded-lg bg-accent group-hover:bg-background transition-colors flex-shrink-0 ${category.color}`}
                      >
                        <category.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{category.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
