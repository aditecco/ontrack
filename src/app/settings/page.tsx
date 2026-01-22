"use client";

import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  Settings,
  Sun,
  Moon,
  FileText,
  Database,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SettingsPage() {
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
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsCategories.map((category, index) => (
                <motion.div
                  key={category.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Link href={category.href}>
                    <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent/30 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`p-3 rounded-lg bg-accent group-hover:bg-background transition-colors ${category.color}`}
                        >
                          <category.icon className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h3 className="font-semibold mb-1">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
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
