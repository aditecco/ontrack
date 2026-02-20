"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { cn } from "@/lib/utils";

export function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { addTask, addTag, tasks, tags: availableTags } = useTaskStore();
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
    const unselectedTags = availableTags.filter(
      (t) => !selectedTagIds.includes(t.id!),
    );
    if (!newTagInput) return unselectedTags;
    return unselectedTags.filter((t) =>
      t.name.toLowerCase().includes(newTagInput.toLowerCase()),
    );
  }, [newTagInput, availableTags, selectedTagIds]);

  const selectedTags = useMemo(() => {
    return availableTags.filter((t) => selectedTagIds.includes(t.id!));
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
    await addTask(
      {
        name: formData.name,
        customer: formData.customer,
        estimatedHours: parseFloat(formData.estimatedHours),
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        status: formData.status,
        isSelfReportedEstimate: formData.isSelfReportedEstimate,
        description: formData.description || undefined,
        link: formData.link || undefined,
      },
      selectedTagIds,
    );
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
        className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">Customer</label>
            <input
              type="text"
              required
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
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
            <label className="block text-sm font-medium mb-2">Estimated Hours</label>
            <input
              type="number"
              required
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Budget (€, optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Add task description..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Link (optional)</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">Tags (optional)</label>
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
                      onClick={() => setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id))}
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
                  if (e.key === "Enter") {
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
              <label className="text-sm font-medium cursor-pointer">Self-reported estimate</label>
              <p className="text-xs text-muted-foreground mt-0.5">
                You decided the estimate (vs. PM/customer)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isSelfReportedEstimate}
              onClick={() =>
                setFormData({ ...formData, isSelfReportedEstimate: !formData.isSelfReportedEstimate })
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                formData.isSelfReportedEstimate ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  formData.isSelfReportedEstimate ? "translate-x-6" : "translate-x-1",
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
