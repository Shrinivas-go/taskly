'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Flag,
  AlertCircle,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { TaskItem as TaskModel, ProjectItem } from '../lib/api-client';

interface CalendarViewProps {
  tasks: TaskModel[];
  project?: ProjectItem | null;
  onToggleComplete: (taskId: string) => void | Promise<void>;
  onEditTask: (task: TaskModel) => void;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAddTask: (opts?: { dueDate?: string | null; projectId?: string | null }) => void;
  onMoveTaskDate: (taskId: string, targetDateStr: string | null) => void | Promise<void>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  tasks,
  project,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onMoveTaskDate,
}: CalendarViewProps) {
  // Calendar Navigation State
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Build grid days for the month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  interface CalendarCell {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }

  const calendarCells: CalendarCell[] = [];

  // 1. Leading days from previous month
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const dateStr = `${prevMonthYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // 3. Trailing days from next month to complete the row/grid
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  const trailingCount = totalCells - calendarCells.length;
  for (let d = 1; d <= trailingCount; d++) {
    const dateStr = `${nextMonthYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Tasks mapping by date
  const tasksByDate = new Map<string, TaskModel[]>();
  const unscheduledTasks: TaskModel[] = [];

  for (const t of tasks) {
    if (t.dueDate) {
      const list = tasksByDate.get(t.dueDate) || [];
      list.push(t);
      tasksByDate.set(t.dueDate, list);
    } else {
      unscheduledTasks.push(t);
    }
  }

  // Count scheduled tasks in current month view
  const scheduledTasksInMonth = calendarCells.reduce((acc, cell) => {
    if (cell.isCurrentMonth) {
      const list = tasksByDate.get(cell.dateStr) || [];
      return acc + list.length;
    }
    return acc;
  }, 0);

  // Month and Year display label
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Priority indicator color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-[#e15d62] text-white';
      case 2:
        return 'bg-[#e0913e] text-white';
      case 3:
        return 'bg-[#5e94d7] text-white';
      default:
        return 'bg-[#9ba0a9] text-white';
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  const handleCellDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent, dateStr: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleCellDrop = (e: React.DragEvent, targetDateStr: string | null) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.dueDate !== targetDateStr) {
      onMoveTaskDate(taskId, targetDateStr);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Calendar Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[20px] font-semibold tracking-tight text-[#1b1d22] dark:text-[#f2f3f5]">
            {monthLabel}
          </h3>
          <button
            type="button"
            onClick={handleJumpToToday}
            className="rounded-xl border border-[#e4e5e8] bg-white px-3 py-1 text-[12px] font-medium text-[#4b515d] shadow-2xs hover:bg-[#f6f7f9] dark:border-white/10 dark:bg-[#202328] dark:text-[#b6bbc6] dark:hover:bg-white/5"
          >
            Today
          </button>
        </div>

        {/* Previous / Next Month Navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-[#e4e5e8] bg-white p-1 shadow-2xs dark:border-white/10 dark:bg-[#202328]">
          <button
            type="button"
            aria-label="Previous month"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#656b77] hover:bg-[#f1f2f5] hover:text-[#1b1d22] dark:text-[#a0a5b1] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#656b77] hover:bg-[#f1f2f5] hover:text-[#1b1d22] dark:text-[#a0a5b1] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Empty State Banner when no tasks are scheduled for this month */}
      {scheduledTasksInMonth === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#e2e4e8] bg-[#fafafc] px-4 py-3 text-[13px] text-[#747985] dark:border-white/10 dark:bg-white/[.02] dark:text-[#9da2ad]">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#8f949f]" />
            <span>No tasks scheduled for this period</span>
          </div>
          <button
            type="button"
            onClick={() => onAddTask({ dueDate: todayStr, projectId: project?.id || null })}
            className="text-[12px] font-medium text-[#6957d9] hover:underline dark:text-[#a89eff]"
          >
            + Schedule task
          </button>
        </div>
      )}

      {/* Calendar Grid Container (Responsive with horizontal scroll on small screens) */}
      <div className="overflow-x-auto rounded-2xl border border-[#e6e7ea] bg-white shadow-xs dark:border-white/10 dark:bg-[#202328]">
        <div className="min-w-[720px]">
          {/* Weekday Columns Header */}
          <div className="grid grid-cols-7 border-b border-[#eef0f2] bg-[#fafafc] dark:border-white/[.08] dark:bg-[#1a1c20]">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[12px] font-semibold text-[#8b919e] dark:text-[#808693]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#eef0f2] dark:divide-white/[.06]">
            {calendarCells.map((cell) => {
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const isDragOver = dragOverDate === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  onDragOver={(e) => handleCellDragOver(e, cell.dateStr)}
                  onDragLeave={(e) => handleCellDragLeave(e, cell.dateStr)}
                  onDrop={(e) => handleCellDrop(e, cell.dateStr)}
                  className={`group relative flex min-h-[112px] flex-col p-2 transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-[#fbfcfd]/50 dark:bg-white/[.01]'
                      : 'bg-white dark:bg-[#202328]'
                  } ${
                    isDragOver
                      ? 'bg-[#f1effc] ring-2 ring-inset ring-[#6957d9] dark:bg-[#2c2847]'
                      : ''
                  }`}
                >
                  {/* Cell Header: Day Number + Add Task Button */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium transition ${
                        cell.isToday
                          ? 'bg-[#6957d9] font-bold text-white shadow-2xs'
                          : cell.isCurrentMonth
                          ? 'text-[#2b2e35] dark:text-[#ebedf0]'
                          : 'text-[#b4b8c2] dark:text-[#5d6370]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <button
                      type="button"
                      aria-label={`Add task for ${cell.dateStr}`}
                      onClick={() =>
                        onAddTask({
                          dueDate: cell.dateStr,
                          projectId: project?.id || null,
                        })
                      }
                      className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 flex h-5 w-5 items-center justify-center rounded text-[#8b919e] hover:bg-[#ebedf1] hover:text-[#1b1d22] dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Task Chips inside Day Cell */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[110px] scrollbar-none">
                    {dayTasks.map((task) => {
                      const isDragging = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onEditTask(task)}
                          className={`group/chip flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e8eaee] bg-[#f8f9fa] px-2 py-1 text-[11px] shadow-2xs transition hover:border-[#6957d9] hover:bg-white dark:border-white/10 dark:bg-[#282b31] dark:hover:border-[#8b7be8] dark:hover:bg-[#30343c] ${
                            isDragging ? 'opacity-40 scale-95' : ''
                          } ${task.isCompleted ? 'opacity-60' : ''}`}
                        >
                          {/* Complete Checkbox */}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={task.isCompleted}
                            aria-label={
                              task.isCompleted
                                ? `Mark "${task.title}" incomplete`
                                : `Mark "${task.title}" complete`
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(task.id);
                            }}
                            className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition ${
                              task.isCompleted
                                ? 'border-[#6957d9] bg-[#6957d9] text-white'
                                : 'border-[#b8bcc6] hover:border-[#6957d9]'
                            }`}
                          >
                            {task.isCompleted && <Check size={8} strokeWidth={3} />}
                          </button>

                          {/* Priority dot */}
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${getPriorityColor(
                              task.priority
                            )}`}
                          />

                          {/* Time badge if present */}
                          {task.dueTime && (
                            <span className="shrink-0 text-[10px] font-medium text-[#7a808c] dark:text-[#a0a5b1]">
                              {task.dueTime}
                            </span>
                          )}

                          {/* Title */}
                          <span
                            className={`truncate font-medium text-[#1b1d22] dark:text-[#e4e6eb] ${
                              task.isCompleted ? 'line-through text-[#8f949f] dark:text-[#787e8b]' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Section (Collapsible) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => handleCellDrop(e, null)}
        className="rounded-2xl border border-[#e6e7ea] bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#202328]"
      >
        <button
          type="button"
          onClick={() => setShowUnscheduled(!showUnscheduled)}
          className="flex w-full items-center justify-between text-left text-[13px] font-semibold text-[#1b1d22] hover:text-[#6957d9] dark:text-[#f2f3f5] dark:hover:text-[#a89eff]"
        >
          <div className="flex items-center gap-2">
            <Inbox size={16} className="text-[#8f949f]" />
            <span>Unscheduled Tasks</span>
            <span className="rounded-full bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#656b77] dark:bg-white/10 dark:text-[#a0a5b1]">
              {unscheduledTasks.length}
            </span>
            <span className="text-[11px] font-normal text-[#9b9fa8]">
              (Drag onto any date to schedule)
            </span>
          </div>
          {showUnscheduled ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {showUnscheduled && (
          <div className="mt-3 pt-3 border-t border-[#f0f1f4] dark:border-white/[.06]">
            {unscheduledTasks.length === 0 ? (
              <p className="text-[12px] text-[#9da2ad] py-2">
                All tasks have scheduled due dates.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEditTask(task)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#e8eaee] bg-[#fafafc] p-2.5 transition hover:border-[#6957d9] hover:bg-white dark:border-white/10 dark:bg-[#1c1e22] dark:hover:bg-[#282b31]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.isCompleted}
                        aria-label={
                          task.isCompleted
                            ? `Mark "${task.title}" incomplete`
                            : `Mark "${task.title}" complete`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task.id);
                        }}
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition ${
                          task.isCompleted
                            ? 'border-[#6957d9] bg-[#6957d9] text-white'
                            : 'border-[#b8bcc6] hover:border-[#6957d9]'
                        }`}
                      >
                        {task.isCompleted && <Check size={8} strokeWidth={3} />}
                      </button>
                      <span
                        className={`truncate text-[12px] font-medium ${
                          task.isCompleted ? 'line-through text-[#8f949f]' : 'text-[#1b1d22] dark:text-[#f2f3f5]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${getPriorityColor(task.priority)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
