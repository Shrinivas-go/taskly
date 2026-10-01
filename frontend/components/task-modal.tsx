'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Flag,
  Calendar,
  Clock,
  Folder,
  Layers,
  Tag,
  Loader2,
  Trash2,
  AlertCircle,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';
import {
  TaskItem as TaskModel,
  ProjectItem,
  SectionItem,
  LabelItem,
  SubtaskSuggestion,
  apiClient,
} from '../lib/api-client';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: number;
    projectId?: string | null;
    sectionId?: string | null;
    labelIds?: string[];
    parentTaskId?: string | null;
  }) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  initialTask?: TaskModel | null;
  projects: ProjectItem[];
  labels: LabelItem[];
  allTasks?: TaskModel[];
  defaultProjectId?: string | null;
  defaultSectionId?: string | null;
  defaultDueDate?: string | null;
  defaultParentTaskId?: string | null;
}

const PRIORITIES = [
  { value: 1, label: 'P1', name: 'Urgent', color: '#e15d62', textClass: 'text-[#e15d62]' },
  { value: 2, label: 'P2', name: 'High', color: '#e0913e', textClass: 'text-[#e0913e]' },
  { value: 3, label: 'P3', name: 'Medium', color: '#5e94d7', textClass: 'text-[#5e94d7]' },
  { value: 4, label: 'P4', name: 'Default', color: '#9ba0a9', textClass: 'text-[#9ba0a9]' },
];

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  projects,
  labels,
  allTasks = [],
  defaultProjectId,
  defaultSectionId,
  defaultDueDate,
  defaultParentTaskId,
}: TaskModalProps) {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(4);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string>('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Project sections loaded dynamically when project selection changes
  const [availableSections, setAvailableSections] = useState<SectionItem[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Breakdown states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SubtaskSuggestion[] | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<string[]>([]);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setAiLoading(false);
    setAiError(null);
    setAiSuggestions(null);
    setAddedSuggestions([]);
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 4);
      setDueDate(initialTask.dueDate || '');
      setDueTime(initialTask.dueTime || '');
      setSelectedProjectId(initialTask.projectId || '');
      setSelectedSectionId(initialTask.sectionId || '');
      setSelectedParentTaskId(initialTask.parentTaskId || '');
      setSelectedLabelIds(
        initialTask.labels ? initialTask.labels.map((l) => l.id) : []
      );
    } else {
      setTitle('');
      setDescription('');
      setPriority(4);
      setDueDate(defaultDueDate || '');
      setDueTime('');
      setSelectedProjectId(defaultProjectId || '');
      setSelectedSectionId(defaultSectionId || '');
      setSelectedParentTaskId(defaultParentTaskId || '');
      setSelectedLabelIds([]);
    }
  }, [isOpen, initialTask, defaultProjectId, defaultSectionId, defaultDueDate, defaultParentTaskId]);

  // Keyboard accessibility: Escape to close, Ctrl/Cmd+Enter to submit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('task-modal-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch sections whenever selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
      setAvailableSections([]);
      setSelectedSectionId('');
      return;
    }

    let active = true;
    const fetchSections = async () => {
      try {
        setLoadingSections(true);
        const secs = await apiClient.getSections(selectedProjectId);
        if (active) {
          setAvailableSections(secs);
          // If the currently selected section does not belong to this project, clear it
          if (selectedSectionId && !secs.some((s) => s.id === selectedSectionId)) {
            setSelectedSectionId('');
          }
        }
      } catch {
        if (active) setAvailableSections([]);
      } finally {
        if (active) setLoadingSections(false);
      }
    };

    fetchSections();

    return () => {
      active = false;
    };
  }, [selectedProjectId, selectedSectionId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        projectId: selectedProjectId || null,
        sectionId: selectedProjectId && selectedSectionId ? selectedSectionId : null,
        labelIds: selectedLabelIds,
        parentTaskId: selectedParentTaskId || null,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask || !onDelete) return;
    if (!window.confirm(`Delete task "${initialTask.title}"?`)) return;

    try {
      setDeleting(true);
      setError(null);
      await onDelete(initialTask.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleAIBreakdown = async () => {
    if (!title.trim()) {
      setAiError('Please enter a task title first');
      return;
    }

    try {
      setAiLoading(true);
      setAiError(null);
      setAiSuggestions(null);
      setAddedSuggestions([]);

      const response = await apiClient.breakDownTask({
        title: title.trim(),
        description: description.trim() || undefined,
        maxSubtasks: 4,
      });

      const list = response.suggestions || response.subtasks || [];
      if (list.length === 0) {
        setAiError('No suggestions returned for this task.');
      } else {
        setAiSuggestions(list);
      }
    } catch (err: any) {
      setAiError(err.message || 'AI service is temporarily unavailable. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestionAsSubtask = async (suggestion: SubtaskSuggestion) => {
    if (!initialTask?.id) return;
    try {
      await apiClient.createTask({
        title: suggestion.title,
        parentTaskId: initialTask.id,
        priority: 4,
        projectId: selectedProjectId || undefined,
      });
      setAddedSuggestions((prev) => [...prev, suggestion.title]);
    } catch (err: any) {
      setAiError(err.message || 'Failed to add subtask');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col rounded-2xl border border-[#e6e7ea] bg-white shadow-2xl dark:border-white/10 dark:bg-[#202328]">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#eef0f2] px-6 py-4 dark:border-white/10">
          <h3 id="task-modal-heading" className="text-[17px] font-semibold tracking-tight text-[#1b1d22] dark:text-[#f2f3f5]">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form id="task-modal-form" onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Subtask Context Banner */}
          {selectedParentTaskId && (
            <div className="flex items-center justify-between rounded-xl bg-[#f0eefc] px-3.5 py-2.5 text-[12px] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]">
              <div className="flex items-center gap-2 min-w-0">
                <CornerDownRight size={14} className="shrink-0" />
                <span className="truncate">
                  Subtask of:{' '}
                  <strong>
                    {allTasks.find((t) => t.id === selectedParentTaskId)?.title ||
                      'Selected Parent Task'}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParentTaskId('')}
                className="shrink-0 rounded p-1 text-[#5d4bcf] hover:bg-white/40 dark:text-[#c3baff] dark:hover:bg-white/10"
                title="Detach from parent"
                aria-label="Detach from parent"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label
              htmlFor="task-modal-title"
              className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="task-modal-title"
              type="text"
              required
              autoFocus
              maxLength={500}
              placeholder="e.g. Schedule team sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label
              htmlFor="task-modal-description"
              className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
            >
              Description
            </label>
            <textarea
              id="task-modal-description"
              rows={3}
              placeholder="Add details, markdown, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2 text-[13px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
            />
          </div>

          {/* AI Task Breakdown Section */}
          <div className="rounded-xl border border-[#e8e9ee] bg-[#fbfbfe] p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#4b5260] dark:text-[#a0a5b1]">
                <Sparkles size={14} className="text-[#6957d9]" />
                <span>AI Subtask Breakdown</span>
              </div>
              <button
                type="button"
                disabled={aiLoading || !title.trim()}
                onClick={handleAIBreakdown}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#6957d9]/30 bg-[#f4f2ff] px-2.5 py-1 text-[12px] font-medium text-[#5d4bcf] transition hover:bg-[#eae6fc] disabled:opacity-50 dark:border-[#6957d9]/40 dark:bg-[#2b244d] dark:text-[#c3baff] dark:hover:bg-[#342b5e]"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Suggest Subtasks</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle size={14} className="shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuggestions && aiSuggestions.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-[#e8e9ee] pt-2.5 dark:border-white/10">
                <div className="flex items-center justify-between text-[11px] text-[#717684] dark:text-[#8e93a0]">
                  <span>AI Suggestions (Click &quot;+ Add&quot; to create as subtask):</span>
                  <button
                    type="button"
                    onClick={() => setAiSuggestions(null)}
                    className="hover:text-red-500"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1.5">
                  {aiSuggestions.map((sugg, idx) => {
                    const isAdded = addedSuggestions.includes(sugg.title);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-[#e8e9ee] bg-white px-3 py-2 text-[13px] dark:border-white/5 dark:bg-[#242830]"
                      >
                        <span className="truncate pr-2 text-[#2d3139] dark:text-[#e1e4ea]">
                          {sugg.title}
                        </span>
                        {initialTask?.id ? (
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddSuggestionAsSubtask(sugg)}
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                              isAdded
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                : 'bg-[#6957d9] text-white hover:bg-[#5d4bcf]'
                            }`}
                          >
                            {isAdded ? 'Added ✓' : '+ Add'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#9da1aa]">
                            (Save task first to attach)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Priority">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-medium transition ${
                    priority === p.value
                      ? 'border-[#6957d9] bg-[#f0eefc] text-[#5d4bcf] dark:border-[#6957d9] dark:bg-[#332d59] dark:text-[#c3baff]'
                      : 'border-[#e4e5e8] bg-transparent text-[#656b77] hover:bg-[#f8f9fb] dark:border-white/10 dark:text-[#aeb3bd] dark:hover:bg-white/5'
                  }`}
                >
                  <Flag size={13} style={{ color: p.color }} />
                  <span>{p.label} - {p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-modal-due-date"
                className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
              >
                Due Date
              </label>
              <div className="relative">
                <input
                  id="task-modal-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3 py-2 text-[13px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="task-modal-due-time"
                className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
              >
                Due Time (Optional)
              </label>
              <div className="relative">
                <input
                  id="task-modal-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3 py-2 text-[13px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
                />
              </div>
            </div>
          </div>

          {/* Project & Section Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-modal-project"
                className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
              >
                Project
              </label>
              <select
                id="task-modal-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3 py-2 text-[13px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
              >
                <option value="" className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                  Inbox (No Project)
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-modal-section"
                className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
              >
                Section
              </label>
              <select
                id="task-modal-section"
                disabled={!selectedProjectId || loadingSections || availableSections.length === 0}
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3 py-2 text-[13px] outline-none transition focus:border-[#6957d9] disabled:opacity-50 dark:border-white/10 dark:text-[#f2f3f5]"
              >
                <option value="" className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                  No Section
                </option>
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Parent Task Selector (Optional) */}
          {allTasks.length > 0 && (
            <div>
              <label
                htmlFor="task-modal-parent-task"
                className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5"
              >
                Parent Task (Optional)
              </label>
              <select
                id="task-modal-parent-task"
                value={selectedParentTaskId}
                onChange={(e) => setSelectedParentTaskId(e.target.value)}
                className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3 py-2 text-[13px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
              >
                <option value="" className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                  None (Top-level task)
                </option>
                {allTasks
                  .filter((t) => !initialTask || t.id !== initialTask.id)
                  .map((t) => (
                    <option key={t.id} value={t.id} className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Labels Selector */}
          {labels.length > 0 && (
            <div>
              <label className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                Labels
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Labels">
                {labels.map((lbl) => {
                  const isSelected = selectedLabelIds.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleLabel(lbl.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                        isSelected
                          ? 'border border-[#6957d9] bg-[#f0eefc] text-[#5d4bcf] dark:border-[#6957d9] dark:bg-[#332d59] dark:text-[#c3baff]'
                          : 'border border-[#e4e5e8] bg-transparent text-[#656b77] hover:bg-[#f8f9fb] dark:border-white/10 dark:text-[#aeb3bd] dark:hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: lbl.color || '#6957d9' }}
                      />
                      <span>{lbl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          {/* Footer Controls */}
          <div className="flex shrink-0 items-center justify-between border-t border-[#eef0f2] px-6 py-4 dark:border-white/10">
            {isEditing && onDelete ? (
              <button
                type="button"
                aria-label="Delete this task"
                disabled={deleting || submitting}
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3.5 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:border-red-950/60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf] disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isEditing ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
