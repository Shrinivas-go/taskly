'use client';

import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  Flag,
  Layers,
  Pencil,
  Trash2,
  Check,
  CornerDownRight,
  Folder,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { TaskItem as TaskModel, SectionItem, ProjectItem } from '../lib/api-client';

interface BoardViewProps {
  tasks: TaskModel[];
  sections: SectionItem[];
  project?: ProjectItem | null;
  onToggleComplete: (taskId: string) => void | Promise<void>;
  onEditTask: (task: TaskModel) => void;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAddTask: (opts?: { sectionId?: string | null; projectId?: string | null }) => void;
  onMoveTaskSection: (taskId: string, targetSectionId: string | null) => void | Promise<void>;
  onAddSection?: () => void;
  onEditSection?: (sectionId: string, name: string) => void;
  onDeleteSection?: (sectionId: string, name: string) => void;
}

export function BoardView({
  tasks,
  sections,
  project,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onMoveTaskSection,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: BoardViewProps) {
  // Track dragging state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null | 'unsectioned'>(null);
  const [showCompletedMap, setShowCompletedMap] = useState<Record<string, boolean>>({});

  // Date formatting helpers
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const formatDueDate = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    if (dueDate === todayStr) return { text: 'Today', isToday: true, isOverdue: false };
    if (dueDate === tomorrowStr) return { text: 'Tomorrow', isToday: false, isOverdue: false };

    const [year, month, day] = dueDate.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isOverdue = dueDate < todayStr;
    return { text: formatted, isToday: false, isOverdue };
  };

  const getPriorityStyle = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: 'P1', textClass: 'text-[#e15d62]', borderClass: 'border-[#e15d62]/40 bg-red-500/10' };
      case 2:
        return { label: 'P2', textClass: 'text-[#e0913e]', borderClass: 'border-[#e0913e]/40 bg-amber-500/10' };
      case 3:
        return { label: 'P3', textClass: 'text-[#5e94d7]', borderClass: 'border-[#5e94d7]/40 bg-blue-500/10' };
      default:
        return { label: 'P4', textClass: 'text-[#9ba0a9]', borderClass: 'border-slate-500/30 bg-slate-500/10' };
    }
  };

  // Group tasks by section
  // Unsectioned tasks (sectionId === null)
  const unsectionedTasks = tasks.filter((t) => !t.sectionId);
  const activeUnsectioned = unsectionedTasks.filter((t) => !t.isCompleted);
  const completedUnsectioned = unsectionedTasks.filter((t) => t.isCompleted);

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverSectionId(null);
  };

  const handleDragOver = (e: React.DragEvent, sectionKey: string | null | 'unsectioned') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSectionId !== sectionKey) {
      setDragOverSectionId(sectionKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, sectionKey: string | null | 'unsectioned') => {
    // Only reset if leaving the column element itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverSectionId === sectionKey) {
      setDragOverSectionId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string | null) => {
    e.preventDefault();
    setDragOverSectionId(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.sectionId !== targetSectionId) {
      onMoveTaskSection(taskId, targetSectionId);
    }
  };

  const toggleSectionCompleted = (key: string) => {
    setShowCompletedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Render a task card for the Kanban board
  const renderCard = (task: TaskModel) => {
    const priority = getPriorityStyle(task.priority);
    const dueInfo = formatDueDate(task.dueDate);
    const isDragging = draggedTaskId === task.id;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className={`group relative rounded-xl border border-[#e5e7eb] bg-white p-3.5 shadow-xs transition-all select-none hover:shadow-md dark:border-white/10 dark:bg-[#202328] ${
          isDragging ? 'opacity-40 scale-95 border-dashed border-[#6957d9]' : ''
        } ${task.isCompleted ? 'opacity-65' : ''}`}
      >
        <div className="flex items-start gap-2.5">
          {/* Completion Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={task.isCompleted ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id);
            }}
            className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition ${
              task.isCompleted
                ? 'border-[#6957d9] bg-[#6957d9] text-white'
                : 'border-[#c9ccd3] hover:border-[#6957d9] dark:border-white/20'
            }`}
          >
            {task.isCompleted && <Check size={10} strokeWidth={3} />}
          </button>

          {/* Card Content (Click to edit) */}
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => onEditTask(task)}
          >
            <p
              className={`text-[13px] font-medium leading-snug text-[#1b1d22] dark:text-[#f2f3f5] ${
                task.isCompleted ? 'line-through text-[#8b919e] dark:text-[#7a808c]' : ''
              }`}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="mt-1 line-clamp-2 text-[11px] text-[#717682] dark:text-[#969ba6]">
                {task.description}
              </p>
            )}

            {/* Badges / Metadata */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
              {/* Due Date */}
              {dueInfo && (
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                    dueInfo.isOverdue && !task.isCompleted
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                      : dueInfo.isToday
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-[#f0f1f4] text-[#6c727e] dark:bg-white/10 dark:text-[#a6abb5]'
                  }`}
                >
                  <Calendar size={10} />
                  <span>{dueInfo.text}</span>
                  {task.dueTime && (
                    <>
                      <Clock size={9} className="ml-0.5" />
                      <span>{task.dueTime}</span>
                    </>
                  )}
                </span>
              )}

              {/* Priority Flag */}
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${priority.textClass} ${priority.borderClass}`}
              >
                <Flag size={10} strokeWidth={2.5} />
                <span>{priority.label}</span>
              </span>

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <>
                  {task.labels.map((lbl) => (
                    <span
                      key={lbl.id}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: `${lbl.color || '#6957d9'}18`,
                        color: lbl.color || '#6957d9',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: lbl.color || '#6957d9' }}
                      />
                      <span>{lbl.name}</span>
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer: Quick Actions + Accessible Section Mover */}
        <div className="mt-3 flex items-center justify-between border-t border-[#f2f3f5] pt-2 dark:border-white/[.06]">
          {/* Accessible Section Mover Dropdown */}
          <div className="flex items-center gap-1">
            <label htmlFor={`move-section-${task.id}`} className="sr-only">
              Move task to section
            </label>
            <div className="relative inline-flex items-center text-[11px] text-[#717682] dark:text-[#969ba6]">
              <ArrowRightLeft size={11} className="pointer-events-none mr-1 shrink-0 text-[#9da2ad]" />
              <select
                id={`move-section-${task.id}`}
                aria-label={`Move task "${task.title}" to section`}
                value={task.sectionId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onMoveTaskSection(task.id, val ? val : null);
                }}
                className="cursor-pointer rounded bg-transparent pr-4 py-0.5 text-[11px] font-medium text-[#656b77] hover:text-[#1b1d22] focus:outline-none dark:text-[#a0a5b1] dark:hover:text-white"
              >
                <option value="" className="dark:bg-[#202328] dark:text-[#f2f3f5]">No Section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id} className="dark:bg-[#202328] dark:text-[#f2f3f5]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Edit/Delete Buttons (visible on mobile, hover/focus on desktop) */}
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Edit task "${task.title}"`}
              onClick={() => onEditTask(task)}
              className="rounded p-1 text-[#8f949f] hover:bg-[#f2f3f5] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              aria-label={`Delete task "${task.title}"`}
              onClick={() => onDeleteTask(task.id)}
              className="rounded p-1 text-[#8f949f] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Board Columns Container (Horizontally Scrollable) */}
      <div className="flex gap-4.5 overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {/* Unsectioned Tasks Column (Always present if there are unsectioned tasks or sections exist) */}
        {(unsectionedTasks.length > 0 || sections.length > 0) && (
          <div
            onDragOver={(e) => handleDragOver(e, 'unsectioned')}
            onDragLeave={(e) => handleDragLeave(e, 'unsectioned')}
            onDrop={(e) => handleDrop(e, null)}
            className={`flex w-[290px] shrink-0 flex-col rounded-2xl border bg-[#f7f8fa] p-3.5 transition-all dark:bg-[#1a1c20] ${
              dragOverSectionId === 'unsectioned'
                ? 'border-[#6957d9] ring-2 ring-[#6957d9]/20 bg-[#f1effc] dark:bg-[#25223c]'
                : 'border-[#e6e8eb] dark:border-white/[.08]'
            }`}
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Folder size={15} className="text-[#9da1aa]" />
                <h3 className="text-[14px] font-semibold text-[#1b1d22] dark:text-[#f2f3f5]">
                  No Section
                </h3>
                <span className="rounded-full bg-[#e8eaf0] px-2 py-0.5 text-[11px] font-semibold text-[#666c78] dark:bg-white/10 dark:text-[#a0a5b1]">
                  {activeUnsectioned.length}
                </span>
              </div>

              <button
                type="button"
                aria-label="Add task to No Section"
                onClick={() => onAddTask({ sectionId: null, projectId: project?.id || null })}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8f949f] hover:bg-[#e8eaf0] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Task Cards */}
            <div className="flex-1 space-y-2.5 min-h-[120px]">
              {activeUnsectioned.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[#dcdfe5] text-center dark:border-white/10">
                  <p className="text-[12px] text-[#9da2ad]">No tasks in this section</p>
                </div>
              ) : (
                activeUnsectioned.map(renderCard)
              )}
            </div>

            {/* Completed Tasks Accordion */}
            {completedUnsectioned.length > 0 && (
              <div className="mt-3 border-t border-[#e8eaf0] pt-2 dark:border-white/[.06]">
                <button
                  type="button"
                  onClick={() => toggleSectionCompleted('unsectioned')}
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
                >
                  <span>Completed ({completedUnsectioned.length})</span>
                  {showCompletedMap['unsectioned'] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {showCompletedMap['unsectioned'] && (
                  <div className="mt-2 space-y-2">
                    {completedUnsectioned.map(renderCard)}
                  </div>
                )}
              </div>
            )}

            {/* Column Footer Quick Add */}
            <button
              type="button"
              onClick={() => onAddTask({ sectionId: null, projectId: project?.id || null })}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d8dbe0] py-2 text-[12px] font-medium text-[#656b77] hover:border-[#6957d9] hover:bg-white hover:text-[#6957d9] dark:border-white/10 dark:text-[#a0a5b1] dark:hover:bg-[#202328] dark:hover:text-[#9688f0]"
            >
              <Plus size={14} />
              <span>Add task</span>
            </button>
          </div>
        )}

        {/* Section Columns */}
        {sections.map((section) => {
          const sectionTasks = tasks.filter((t) => t.sectionId === section.id);
          const activeSectionTasks = sectionTasks.filter((t) => !t.isCompleted);
          const completedSectionTasks = sectionTasks.filter((t) => t.isCompleted);
          const isDragOver = dragOverSectionId === section.id;

          return (
            <div
              key={section.id}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={(e) => handleDragLeave(e, section.id)}
              onDrop={(e) => handleDrop(e, section.id)}
              className={`flex w-[290px] shrink-0 flex-col rounded-2xl border bg-[#f7f8fa] p-3.5 transition-all dark:bg-[#1a1c20] ${
                isDragOver
                  ? 'border-[#6957d9] ring-2 ring-[#6957d9]/20 bg-[#f1effc] dark:bg-[#25223c]'
                  : 'border-[#e6e8eb] dark:border-white/[.08]'
              }`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers size={15} className="shrink-0 text-[#6957d9]" />
                  <h3 className="truncate text-[14px] font-semibold text-[#1b1d22] dark:text-[#f2f3f5]" title={section.name}>
                    {section.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#e8eaf0] px-2 py-0.5 text-[11px] font-semibold text-[#666c78] dark:bg-white/10 dark:text-[#a0a5b1]">
                    {activeSectionTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Add task to section ${section.name}`}
                    onClick={() => onAddTask({ sectionId: section.id, projectId: project?.id || null })}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8f949f] hover:bg-[#e8eaf0] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Plus size={15} />
                  </button>
                  {onEditSection && (
                    <button
                      type="button"
                      aria-label={`Rename section ${section.name}`}
                      onClick={() => onEditSection(section.id, section.name)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8f949f] hover:bg-[#e8eaf0] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {onDeleteSection && (
                    <button
                      type="button"
                      aria-label={`Delete section ${section.name}`}
                      onClick={() => onDeleteSection(section.id, section.name)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8f949f] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Cards */}
              <div className="flex-1 space-y-2.5 min-h-[120px]">
                {activeSectionTasks.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[#dcdfe5] text-center dark:border-white/10">
                    <p className="text-[12px] text-[#9da2ad]">No tasks in this section</p>
                  </div>
                ) : (
                  activeSectionTasks.map(renderCard)
                )}
              </div>

              {/* Completed Tasks Accordion */}
              {completedSectionTasks.length > 0 && (
                <div className="mt-3 border-t border-[#e8eaf0] pt-2 dark:border-white/[.06]">
                  <button
                    type="button"
                    onClick={() => toggleSectionCompleted(section.id)}
                    className="flex w-full items-center justify-between text-left text-[11px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
                  >
                    <span>Completed ({completedSectionTasks.length})</span>
                    {showCompletedMap[section.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  {showCompletedMap[section.id] && (
                    <div className="mt-2 space-y-2">
                      {completedSectionTasks.map(renderCard)}
                    </div>
                  )}
                </div>
              )}

              {/* Column Footer Quick Add */}
              <button
                type="button"
                onClick={() => onAddTask({ sectionId: section.id, projectId: project?.id || null })}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d8dbe0] py-2 text-[12px] font-medium text-[#656b77] hover:border-[#6957d9] hover:bg-white hover:text-[#6957d9] dark:border-white/10 dark:text-[#a0a5b1] dark:hover:bg-[#202328] dark:hover:text-[#9688f0]"
              >
                <Plus size={14} />
                <span>Add task</span>
              </button>
            </div>
          );
        })}

        {/* Add Section Column / Button */}
        {onAddSection && (
          <div className="flex w-[260px] shrink-0 items-start">
            <button
              type="button"
              onClick={onAddSection}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cfd2d8] p-4 text-[13px] font-medium text-[#656b77] transition hover:border-[#6957d9] hover:bg-white hover:text-[#6957d9] dark:border-white/15 dark:text-[#a0a5b1] dark:hover:bg-[#202328] dark:hover:text-[#9688f0]"
            >
              <Plus size={16} />
              <span>Add Section</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
