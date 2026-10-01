'use client';

import React from 'react';
import {
  Check,
  Flag,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Folder,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  CornerDownRight,
} from 'lucide-react';
import { TaskItem as TaskModel } from '../lib/api-client';

interface TaskItemProps {
  task: TaskModel;
  onToggleComplete: (taskId: string) => void | Promise<void>;
  onEdit: (task: TaskModel) => void;
  onDelete: (taskId: string) => void | Promise<void>;
  onAddSubtask?: (parentTask: TaskModel) => void;
  showProjectBadge?: boolean;
  showSectionBadge?: boolean;
  depth?: number;
  hasChildren?: boolean;
  childrenCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddSubtask,
  showProjectBadge = true,
  showSectionBadge = true,
  depth = 0,
  hasChildren = false,
  childrenCount = 0,
  isExpanded = true,
  onToggleExpand,
}: TaskItemProps) {
  // Format Today/Tomorrow/Overdue comparison
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  let dueDateLabel: string | null = null;
  let isOverdue = false;
  let isToday = false;

  if (task.dueDate) {
    if (task.dueDate === todayStr) {
      dueDateLabel = 'Today';
      isToday = true;
    } else if (task.dueDate === tomorrowStr) {
      dueDateLabel = 'Tomorrow';
    } else if (task.dueDate < todayStr) {
      isOverdue = !task.isCompleted;
      // Format as MMM D
      const [year, month, day] = task.dueDate.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      dueDateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      const [year, month, day] = task.dueDate.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      dueDateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  // Priority Styles
  const getPriorityStyle = (priority: number) => {
    switch (priority) {
      case 1:
        return {
          label: 'P1',
          textClass: 'text-[#e15d62]',
          borderClass: 'hover:border-[#e15d62]',
        };
      case 2:
        return {
          label: 'P2',
          textClass: 'text-[#e0913e]',
          borderClass: 'hover:border-[#e0913e]',
        };
      case 3:
        return {
          label: 'P3',
          textClass: 'text-[#5e94d7]',
          borderClass: 'hover:border-[#5e94d7]',
        };
      default:
        return {
          label: 'P4',
          textClass: 'text-[#9ba0a9]',
          borderClass: 'hover:border-[#6957d9]',
        };
    }
  };

  const priorityStyle = getPriorityStyle(task.priority);

  return (
    <div
      style={{ paddingLeft: `${Math.max(depth * 24 + 16, 16)}px` }}
      className={`group relative flex items-start gap-3 border-b border-[#eef0f2] pr-4 py-3.5 transition-colors last:border-0 hover:bg-[#fafafc] dark:border-white/[.06] dark:hover:bg-white/[.02] ${
        task.isCompleted ? 'opacity-60' : ''
      } ${depth > 0 ? 'bg-[#fcfdfe]/60 dark:bg-white/[.01]' : ''}`}
    >
      {/* Subtask Hierarchy Connector for depth > 0 */}
      {depth > 0 && (
        <span
          className="mt-1 text-[#b5bac4] dark:text-[#5c616d]"
          aria-hidden="true"
        >
          <CornerDownRight size={13} strokeWidth={2.2} />
        </span>
      )}

      {/* Children Expand/Collapse Chevron (if task has children) */}
      {hasChildren ? (
        <button
          type="button"
          aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          className="mt-0.5 -mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#8b919e] hover:bg-[#ebedf1] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : depth > 0 ? null : (
        <div className="w-1 shrink-0" />
      )}

      {/* Complete Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.isCompleted}
        aria-label={
          task.isCompleted
            ? `Mark "${task.title}" as incomplete`
            : `Mark "${task.title}" as complete`
        }
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
        className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 transition ${
          task.isCompleted
            ? 'border-[#6957d9] bg-[#6957d9] text-white'
            : `border-[#c9ccd3] dark:border-white/20 ${priorityStyle.borderClass}`
        }`}
      >
        {task.isCompleted && <Check size={11} strokeWidth={3} />}
      </button>

      {/* Main Content Area */}
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        {/* Title */}
        <p
          className={`text-[14px] leading-snug font-medium text-[#1b1d22] dark:text-[#f2f3f5] ${
            task.isCompleted ? 'line-through text-[#8b919e] dark:text-[#7a808c]' : ''
          }`}
        >
          {task.title}
        </p>

        {/* Description Snippet */}
        {task.description && (
          <p className="mt-1 line-clamp-1 text-[12px] text-[#717682] dark:text-[#969ba6]">
            {task.description}
          </p>
        )}

        {/* Metadata Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#8e939e] dark:text-[#9196a0]">
          {/* Subtasks Count Badge */}
          {childrenCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#f0f1f4] px-1.5 py-0.5 font-medium text-[#656b77] hover:bg-[#e6e8ec] dark:bg-white/10 dark:text-[#a6abb5] dark:hover:bg-white/15"
            >
              <CornerDownRight size={10} />
              <span>
                {childrenCount} {childrenCount === 1 ? 'subtask' : 'subtasks'}
              </span>
            </span>
          )}

          {/* Due Date & Time */}
          {dueDateLabel && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
                isOverdue
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : isToday
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-[#f0f1f4] text-[#6c727e] dark:bg-white/10 dark:text-[#a6abb5]'
              }`}
            >
              <Calendar size={11} />
              <span>{dueDateLabel}</span>
              {task.dueTime && (
                <>
                  <Clock size={10} className="ml-0.5" />
                  <span>{task.dueTime}</span>
                </>
              )}
            </span>
          )}

          {/* Project Badge */}
          {showProjectBadge && task.project && (
            <span className="inline-flex items-center gap-1 font-medium text-[#656b77] dark:text-[#aeb3bd]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: task.project.color || '#6957d9' }}
              />
              <span>{task.project.name}</span>
            </span>
          )}

          {/* Section Badge */}
          {showSectionBadge && task.section && (
            <span className="inline-flex items-center gap-1 text-[#787e8b] dark:text-[#9ba0ad]">
              <Layers size={11} />
              <span>{task.section.name}</span>
            </span>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {task.labels.map((lbl) => (
                <span
                  key={lbl.id}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${lbl.color || '#6957d9'}15`,
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
            </div>
          )}
        </div>
      </div>

      {/* Priority Flag */}
      <span
        className={`flex items-center gap-1 text-[11px] font-semibold ${priorityStyle.textClass}`}
      >
        <Flag size={12} strokeWidth={2.2} />
        <span>{priorityStyle.label}</span>
      </span>

      {/* Action Buttons (visible on mobile, hover/focus on desktop) */}
      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
        {onAddSubtask && (
          <button
            type="button"
            aria-label={`Add subtask to "${task.title}"`}
            title="Add subtask"
            onClick={(e) => {
              e.stopPropagation();
              onAddSubtask(task);
            }}
            className="rounded-lg p-1.5 text-[#8f949f] hover:bg-[#f0eefc] hover:text-[#5d4bcf] dark:hover:bg-[#332d59] dark:hover:text-[#c3baff]"
          >
            <Plus size={14} />
          </button>
        )}
        <button
          type="button"
          aria-label={`Edit task "${task.title}"`}
          onClick={() => onEdit(task)}
          className="rounded-lg p-1.5 text-[#8f949f] hover:bg-[#f0f1f3] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          aria-label={`Delete task "${task.title}"`}
          onClick={() => onDelete(task.id)}
          className="rounded-lg p-1.5 text-[#8f949f] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
