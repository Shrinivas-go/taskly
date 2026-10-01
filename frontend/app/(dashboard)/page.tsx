'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Folder,
  Tag,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Layers,
  Loader2,
  X,
  AlertCircle,
  Calendar,
  CalendarDays,
  Search,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Inbox,
  Check,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import {
  apiClient,
  ProjectItem,
  SectionItem,
  LabelItem,
  TaskItem as TaskModel,
} from '../../lib/api-client';
import { TaskItem } from '../../components/task-item';
import { TaskModal } from '../../components/task-modal';
import { BoardView } from '../../components/board-view';
import { CalendarView } from '../../components/calendar-view';

const COLOR_PALETTES = [
  '#6957d9', // Purple
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#6b7280', // Slate
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeProjectId = searchParams ? searchParams.get('project') : null;
  const activeView = searchParams ? searchParams.get('view') : null;

  // Projects, Sections & Labels State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Task Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskModel | null>(null);
  const [modalDefaultProjectId, setModalDefaultProjectId] = useState<string | null>(null);
  const [modalDefaultSectionId, setModalDefaultSectionId] = useState<string | null>(null);
  const [modalDefaultDueDate, setModalDefaultDueDate] = useState<string | null>(null);
  const [modalDefaultParentTaskId, setModalDefaultParentTaskId] = useState<string | null>(null);

  // Subtask Collapse/Expand State
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());

  // Search State
  const searchQuery = searchParams ? searchParams.get('q') || '' : '';
  const [searchResults, setSearchResults] = useState<TaskModel[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Completed Tasks Accordion
  const [showCompleted, setShowCompleted] = useState(false);

  // Project Modals
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectColor, setEditProjectColor] = useState(COLOR_PALETTES[0]);

  // Section Modals
  const [createSectionModalOpen, setCreateSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editSectionModalOpen, setEditSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Label Modals
  const [createLabelModalOpen, setCreateLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(COLOR_PALETTES[4]);
  const [editLabelModalOpen, setEditLabelModalOpen] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [editingLabelColor, setEditingLabelColor] = useState(COLOR_PALETTES[0]);

  // Common Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Today Date Calculation (Local)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Layout State & Switching (?layout=list | board | calendar)
  const layoutParam = searchParams ? searchParams.get('layout') : null;
  const currentLayout: 'list' | 'board' | 'calendar' =
    layoutParam === 'board' || layoutParam === 'calendar' ? layoutParam : 'list';

  const handleSwitchLayout = (layout: 'list' | 'board' | 'calendar') => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (layout === 'list') {
      params.delete('layout');
    } else {
      params.set('layout', layout);
    }
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/');
  };

  const handleMoveTaskSection = async (taskId: string, targetSectionId: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.sectionId === targetSectionId) return;

    const prevTasks = [...tasks];
    const targetSection = targetSectionId ? sections.find((s) => s.id === targetSectionId) || null : null;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, sectionId: targetSectionId, section: targetSection } : t
      )
    );

    try {
      const updated = await apiClient.updateTask(taskId, { sectionId: targetSectionId });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      setTasks(prevTasks);
      setActionError(err.message || 'Failed to move task to section');
    }
  };

  const handleMoveTaskDate = async (taskId: string, targetDateStr: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.dueDate === targetDateStr) return;

    const prevTasks = [...tasks];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDate: targetDateStr } : t))
    );

    try {
      const updated = await apiClient.updateTask(taskId, { dueDate: targetDateStr });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      setTasks(prevTasks);
      setActionError(err.message || 'Failed to reschedule task');
    }
  };

  const renderLayoutSwitcher = () => (
    <div className="flex items-center gap-1 rounded-xl border border-[#e4e5e8] p-1 dark:border-white/10">
      <button
        type="button"
        aria-label="List view"
        onClick={() => handleSwitchLayout('list')}
        className={`rounded-lg p-1.5 transition ${
          currentLayout === 'list'
            ? 'bg-[#f0f1f3] text-[#33363c] dark:bg-white/10 dark:text-white'
            : 'text-[#999da6] hover:text-[#33363c] dark:hover:text-white'
        }`}
      >
        <List size={16} />
      </button>
      <button
        type="button"
        aria-label="Board view"
        onClick={() => handleSwitchLayout('board')}
        className={`rounded-lg p-1.5 transition ${
          currentLayout === 'board'
            ? 'bg-[#f0f1f3] text-[#33363c] dark:bg-white/10 dark:text-white'
            : 'text-[#999da6] hover:text-[#33363c] dark:hover:text-white'
        }`}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        aria-label="Calendar view"
        onClick={() => handleSwitchLayout('calendar')}
        className={`rounded-lg p-1.5 transition ${
          currentLayout === 'calendar'
            ? 'bg-[#f0f1f3] text-[#33363c] dark:bg-white/10 dark:text-white'
            : 'text-[#999da6] hover:text-[#33363c] dark:hover:text-white'
        }`}
      >
        <CalendarDays size={16} />
      </button>
    </div>
  );

  // Global Escape key listener for open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editProjectModalOpen) setEditProjectModalOpen(false);
        if (createSectionModalOpen) setCreateSectionModalOpen(false);
        if (editSectionModalOpen) setEditSectionModalOpen(false);
        if (createLabelModalOpen) setCreateLabelModalOpen(false);
        if (editLabelModalOpen) setEditLabelModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editProjectModalOpen,
    createSectionModalOpen,
    editSectionModalOpen,
    createLabelModalOpen,
    editLabelModalOpen,
  ]);

  // Load All Tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const data = await apiClient.getTasks();
      setTasks(data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Load Projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch {
      // Handled silently
    }
  }, []);

  // Load Labels
  const loadLabels = useCallback(async () => {
    try {
      setLoadingLabels(true);
      const data = await apiClient.getLabels();
      setLabels(data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load labels');
    } finally {
      setLoadingLabels(false);
    }
  }, []);

  // Load Project & Sections
  const loadProjectData = useCallback(async (id: string) => {
    try {
      setLoadingProject(true);
      setActionError(null);
      const proj = await apiClient.getProject(id);
      setProject(proj);
      const secs = await apiClient.getSections(id);
      setSections(secs);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load project');
    } finally {
      setLoadingProject(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadTasks();
    loadProjects();
    loadLabels();
  }, [loadTasks, loadProjects, loadLabels]);

  // Search Execution Effect (Server-side keyword search across 5 fields)
  useEffect(() => {
    if (activeView !== 'search') return;

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const executeSearch = async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const results = await apiClient.searchTasks(searchQuery.trim());
        if (active) {
          setSearchResults(results);
        }
      } catch (err: any) {
        if (active) {
          setSearchError(err.message || 'Search failed');
          setSearchResults([]);
        }
      } finally {
        if (active) setSearching(false);
      }
    };

    executeSearch();
    return () => {
      active = false;
    };
  }, [activeView, searchQuery]);

  // Handle View / Project Switch
  useEffect(() => {
    if (activeProjectId) {
      loadProjectData(activeProjectId);
    } else {
      setProject(null);
      setSections([]);
    }
    // Reset completed accordion state on view switch
    setShowCompleted(false);
  }, [activeProjectId, loadProjectData]);

  // Global Add Task Event Listener
  useEffect(() => {
    const handleOpenModal = () => {
      setEditingTask(null);
      setModalDefaultProjectId(activeProjectId || null);
      setModalDefaultSectionId(null);
      setModalDefaultDueDate(activeView === 'today' ? todayStr : null);
      setModalDefaultParentTaskId(null);
      setTaskModalOpen(true);
    };

    window.addEventListener('open-task-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-task-modal', handleOpenModal);
    };
  }, [activeProjectId, activeView, todayStr]);

  // ==========================================
  // TASK CRUD HANDLERS
  // ==========================================

  const handleOpenCreateTask = (opts?: {
    projectId?: string | null;
    sectionId?: string | null;
    dueDate?: string | null;
    parentTaskId?: string | null;
  }) => {
    setEditingTask(null);
    setModalDefaultProjectId(opts?.projectId !== undefined ? opts.projectId : activeProjectId || null);
    setModalDefaultSectionId(opts?.sectionId !== undefined ? opts.sectionId : null);
    setModalDefaultDueDate(opts?.dueDate !== undefined ? opts.dueDate : activeView === 'today' ? todayStr : null);
    setModalDefaultParentTaskId(opts?.parentTaskId !== undefined ? opts.parentTaskId : null);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskModel) => {
    setEditingTask(task);
    setModalDefaultProjectId(null);
    setModalDefaultSectionId(null);
    setModalDefaultDueDate(null);
    setModalDefaultParentTaskId(null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: {
    title: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: number;
    projectId?: string | null;
    sectionId?: string | null;
    labelIds?: string[];
    parentTaskId?: string | null;
  }) => {
    if (editingTask) {
      // Update existing task
      const updated = await apiClient.updateTask(editingTask.id, {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        priority: taskData.priority,
        projectId: taskData.projectId,
        sectionId: taskData.sectionId,
        labelIds: taskData.labelIds,
        parentTaskId: taskData.parentTaskId,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create new task
      const created = await apiClient.createTask({
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        priority: taskData.priority,
        projectId: taskData.projectId || undefined,
        sectionId: taskData.sectionId || undefined,
        labelIds: taskData.labelIds,
        parentTaskId: taskData.parentTaskId || undefined,
      });
      setTasks((prev) => [created, ...prev]);
    }

    // Notify sidebar to refresh badges
    window.dispatchEvent(new Event('refresh-task-counts'));
  };

  // Toggle Collapse / Expand for Task Tree
  const toggleCollapse = (taskId: string) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Build recursive in-memory task tree in O(N) time with arbitrary depth
  interface TaskNode {
    task: TaskModel;
    children: TaskNode[];
  }

  const buildTaskTree = useCallback((taskList: TaskModel[]): TaskNode[] => {
    const nodeMap = new Map<string, TaskNode>();
    taskList.forEach((t) => nodeMap.set(t.id, { task: t, children: [] }));

    const roots: TaskNode[] = [];
    taskList.forEach((t) => {
      const node = nodeMap.get(t.id)!;
      if (t.parentTaskId && nodeMap.has(t.parentTaskId)) {
        nodeMap.get(t.parentTaskId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  // Recursive Tree Renderer for Nested Tasks
  const renderTaskTree = (
    nodes: TaskNode[],
    depth = 0,
    opts?: { showProjectBadge?: boolean; showSectionBadge?: boolean }
  ): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = !collapsedTaskIds.has(node.task.id);
      const hasChildren = node.children.length > 0;

      return (
        <React.Fragment key={node.task.id}>
          <TaskItem
            task={node.task}
            depth={depth}
            hasChildren={hasChildren}
            childrenCount={node.children.length}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleCollapse(node.task.id)}
            onToggleComplete={handleToggleComplete}
            onEdit={handleOpenEditTask}
            onDelete={handleDeleteTask}
            onAddSubtask={(parent) =>
              handleOpenCreateTask({
                parentTaskId: parent.id,
                projectId: parent.projectId,
                sectionId: parent.sectionId,
              })
            }
            showProjectBadge={opts?.showProjectBadge ?? true}
            showSectionBadge={opts?.showSectionBadge ?? true}
          />
          {hasChildren && isExpanded && (
            renderTaskTree(node.children, depth + 1, opts)
          )}
        </React.Fragment>
      );
    });
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      const toggled = await apiClient.toggleTaskComplete(taskId);
      setTasks((prev) => prev.map((t) => (t.id === toggled.id ? toggled : t)));
      window.dispatchEvent(new Event('refresh-task-counts'));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update task completion');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiClient.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      window.dispatchEvent(new Event('refresh-task-counts'));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete task');
    }
  };

  // ==========================================
  // PROJECT CRUD HANDLERS
  // ==========================================

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editProjectName.trim()) return;

    try {
      setActionLoading(true);
      const updated = await apiClient.updateProject(project.id, {
        name: editProjectName.trim(),
        color: editProjectColor,
      });
      setProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditProjectModalOpen(false);
      window.dispatchEvent(new Event('refresh-task-counts'));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}" and all its tasks?`)) return;

    try {
      setActionLoading(true);
      await apiClient.deleteProject(project.id);
      router.push('/?view=inbox');
      window.dispatchEvent(new Event('refresh-task-counts'));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete project');
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // SECTION CRUD HANDLERS
  // ==========================================

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newSectionName.trim()) return;

    try {
      setActionLoading(true);
      const created = await apiClient.createSection(project.id, {
        name: newSectionName.trim(),
        order: sections.length + 1,
      });
      setSections((prev) => [...prev, created]);
      setNewSectionName('');
      setCreateSectionModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create section');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionId || !editingSectionName.trim()) return;

    try {
      setActionLoading(true);
      const updated = await apiClient.updateSection(editingSectionId, {
        name: editingSectionName.trim(),
      });
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditSectionModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update section');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string, name: string) => {
    if (!window.confirm(`Delete section "${name}"? Tasks will become unsectioned.`)) return;

    try {
      setActionLoading(true);
      await apiClient.deleteSection(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      // Re-fetch tasks to update resolved sections
      loadTasks();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete section');
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // LABEL CRUD HANDLERS
  // ==========================================

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    try {
      setActionLoading(true);
      const created = await apiClient.createLabel({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setLabels((prev) => [...prev, created]);
      setNewLabelName('');
      setCreateLabelModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create label');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabelId || !editingLabelName.trim()) return;

    try {
      setActionLoading(true);
      const updated = await apiClient.updateLabel(editingLabelId, {
        name: editingLabelName.trim(),
        color: editingLabelColor,
      });
      setLabels((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditLabelModalOpen(false);
      // Re-fetch tasks to reflect updated label color/name
      loadTasks();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update label');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: string, name: string) => {
    if (!window.confirm(`Delete label "${name}"?`)) return;

    try {
      setActionLoading(true);
      await apiClient.deleteLabel(labelId);
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      loadTasks();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete label');
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // VIEW: LABELS MANAGEMENT
  // ==========================================
  if (activeView === 'labels') {
    return (
      <section className="mx-auto max-w-[920px] px-5 py-8 sm:px-8 sm:py-11">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6957d9]/10 text-[#6957d9]">
              <Tag size={22} />
            </div>
            <div>
              <h2 className="text-[26px] font-semibold tracking-tight">Labels</h2>
              <p className="text-[13px] text-[#747985] dark:text-[#9da2ad]">
                Categorize tasks across all your projects with tags
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreateLabelModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
          >
            <Plus size={16} />
            <span>New Label</span>
          </button>
        </div>

        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {loadingLabels ? (
          <div className="flex items-center justify-center py-20 text-[#9da2ad]">
            <Loader2 size={24} className="animate-spin text-[#6957d9]" />
          </div>
        ) : labels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
              <Tag size={24} />
            </div>
            <h4 className="text-[16px] font-semibold">No labels created yet</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              Labels help you filter and group tasks by category or context.
            </p>
            <button
              onClick={() => setCreateLabelModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf]"
            >
              <Plus size={16} />
              <span>Create your first label</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between rounded-xl border border-[#e6e7ea] bg-white p-4 shadow-sm transition hover:border-[#6957d9]/40 dark:border-white/10 dark:bg-[#202328]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color || '#6957d9' }}
                  />
                  <span className="truncate font-medium text-[14px]">
                    {label.name}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit label "${label.name}"`}
                    onClick={() => {
                      setEditingLabelId(label.id);
                      setEditingLabelName(label.name);
                      setEditingLabelColor(label.color || COLOR_PALETTES[0]);
                      setEditLabelModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-[#8f949f] hover:bg-[#f2f3f5] hover:text-[#1b1d22] dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete label "${label.name}"`}
                    onClick={() => handleDeleteLabel(label.id, label.name)}
                    className="rounded-lg p-1.5 text-[#8f949f] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Label */}
        {createLabelModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCreateLabelModalOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-label-title"
              className="w-full max-w-[400px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
                <h3 id="create-label-title" className="text-[17px] font-semibold">New Label</h3>
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={() => setCreateLabelModalOpen(false)}
                  className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateLabel} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="create-label-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                    Label Name
                  </label>
                  <input
                    id="create-label-name"
                    type="text"
                    required
                    autoFocus
                    maxLength={50}
                    placeholder="e.g. Urgent, Bug, Review"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Label color">
                    {COLOR_PALETTES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Select color ${color}`}
                        onClick={() => setNewLabelColor(color)}
                        style={{ backgroundColor: color }}
                        className={`h-7 w-7 rounded-full transition transform hover:scale-110 ${
                          newLabelColor === color
                            ? 'ring-2 ring-offset-2 ring-[#6957d9] dark:ring-offset-[#202328]'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateLabelModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !newLabelName.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf] disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Create Label</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Label */}
        {editLabelModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditLabelModalOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-label-title"
              className="w-full max-w-[400px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
                <h3 id="edit-label-title" className="text-[17px] font-semibold">Edit Label</h3>
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={() => setEditLabelModalOpen(false)}
                  className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateLabel} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="edit-label-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                    Label Name
                  </label>
                  <input
                    id="edit-label-name"
                    type="text"
                    required
                    autoFocus
                    maxLength={50}
                    value={editingLabelName}
                    onChange={(e) => setEditingLabelName(e.target.value)}
                    className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Label color">
                    {COLOR_PALETTES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Select color ${color}`}
                        onClick={() => setEditingLabelColor(color)}
                        style={{ backgroundColor: color }}
                        className={`h-7 w-7 rounded-full transition transform hover:scale-110 ${
                          editingLabelColor === color
                            ? 'ring-2 ring-offset-2 ring-[#6957d9] dark:ring-offset-[#202328]'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditLabelModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !editingLabelName.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf] disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ==========================================
  // VIEW: PROJECT VIEW (WITH SECTION GROUPING)
  // ==========================================
  if (activeProjectId) {
    const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);
    const activeProjectTasks = projectTasks.filter((t) => !t.isCompleted);
    const completedProjectTasks = projectTasks.filter((t) => t.isCompleted);

    // Unsectioned tasks
    const unsectionedTasks = activeProjectTasks.filter((t) => !t.sectionId);

    return (
      <section className={`mx-auto px-5 py-8 sm:px-8 sm:py-11 ${currentLayout === 'board' ? 'max-w-[1400px]' : currentLayout === 'calendar' ? 'max-w-[1200px]' : 'max-w-[920px]'}`}>
        {loadingProject ? (
          <div className="flex items-center justify-center py-20 text-[#9da2ad]">
            <Loader2 size={24} className="animate-spin text-[#6957d9]" />
          </div>
        ) : !project ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <h4 className="text-[16px] font-semibold">Project not found</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              This project may have been deleted or belongs to another user.
            </p>
            <button
              onClick={() => router.push('/?view=inbox')}
              className="mt-4 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white"
            >
              Back to Inbox
            </button>
          </div>
        ) : (
          <>
            {/* Project Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#ececef] pb-6 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: project.color || '#6957d9' }}
                />
                <div>
                  <h2 className="text-[26px] font-semibold tracking-tight">
                    {project.name}
                  </h2>
                  <p className="text-[12px] text-[#747985] dark:text-[#9da2ad]">
                    {activeProjectTasks.length} {activeProjectTasks.length === 1 ? 'task' : 'tasks'} · {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {renderLayoutSwitcher()}

                <button
                  type="button"
                  onClick={() => {
                    setEditProjectName(project.name);
                    setEditProjectColor(project.color || COLOR_PALETTES[0]);
                    setEditProjectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e4e5e8] px-3 py-1.5 text-[13px] font-medium text-[#4c515c] hover:bg-[#f5f6f8] dark:border-white/10 dark:text-[#b6bbc6] dark:hover:bg-white/5"
                >
                  <Pencil size={14} />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:border-red-950/60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateSectionModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e4e5e8] px-3 py-1.5 text-[13px] font-medium text-[#4c515c] hover:bg-[#f5f6f8] dark:border-white/10 dark:text-[#b6bbc6] dark:hover:bg-white/5"
                >
                  <Layers size={14} />
                  <span>Add Section</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateTask({ projectId: project.id })}
                  className="flex items-center gap-1.5 rounded-xl bg-[#6957d9] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
                >
                  <Plus size={15} />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {actionError && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Sections & Tasks Container */}
            <div className="space-y-6">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-12 text-[#9da2ad]">
                  <Loader2 size={24} className="animate-spin text-[#6957d9]" />
                </div>
              ) : currentLayout === 'board' ? (
                <BoardView
                  tasks={projectTasks}
                  sections={sections}
                  project={project}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={handleOpenEditTask}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={(opts) => handleOpenCreateTask({ projectId: project.id, ...opts })}
                  onMoveTaskSection={handleMoveTaskSection}
                  onAddSection={() => setCreateSectionModalOpen(true)}
                  onEditSection={(id, name) => {
                    setEditingSectionId(id);
                    setEditingSectionName(name);
                    setEditSectionModalOpen(true);
                  }}
                  onDeleteSection={handleDeleteSection}
                />
              ) : currentLayout === 'calendar' ? (
                <CalendarView
                  tasks={projectTasks}
                  project={project}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={handleOpenEditTask}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={(opts) => handleOpenCreateTask({ projectId: project.id, ...opts })}
                  onMoveTaskDate={handleMoveTaskDate}
                />
              ) : activeProjectTasks.length === 0 && sections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-[16px] font-semibold">No tasks in this project</h4>
                  <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
                    Add tasks or organize with sections to keep your work structured.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleOpenCreateTask({ projectId: project.id })}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf]"
                    >
                      <Plus size={15} />
                      <span>Add a task</span>
                    </button>
                    <button
                      onClick={() => setCreateSectionModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#e2e4e8] px-4 py-2 text-[13px] font-medium text-[#4b5260] hover:bg-[#f7f8fa] dark:border-white/10 dark:text-[#a0a5b1] dark:hover:bg-white/5"
                    >
                      <Layers size={15} />
                      <span>Add section</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Defined Sections */}
                  {sections.map((section) => {
                    const sectionTasks = activeProjectTasks.filter(
                      (t) => t.sectionId === section.id
                    );

                    return (
                      <div
                        key={section.id}
                        className="rounded-2xl border border-[#e6e7ea] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#202328]"
                      >
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f4] dark:border-white/[.06]">
                          <div className="flex items-center gap-2.5">
                            <Layers size={16} className="text-[#6957d9]" />
                            <h4 className="font-semibold text-[15px]">{section.name}</h4>
                            <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#747985] dark:bg-white/10 dark:text-[#9da2ad]">
                              {sectionTasks.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Add task to section ${section.name}`}
                              onClick={() =>
                                handleOpenCreateTask({
                                  projectId: project.id,
                                  sectionId: section.id,
                                })
                              }
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6957d9] hover:bg-[#f0eefc] dark:hover:bg-[#332d59]"
                            >
                              <Plus size={13} />
                              <span>Add task</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Rename section ${section.name}`}
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionName(section.name);
                                setEditSectionModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-[#8f949f] hover:bg-[#f2f3f5] hover:text-[#1b1d22] dark:hover:bg-white/5 dark:hover:text-white"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete section ${section.name}`}
                              onClick={() => handleDeleteSection(section.id, section.name)}
                              className="rounded-lg p-1.5 text-[#8f949f] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Section Tasks */}
                        <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
                          {sectionTasks.length === 0 ? (
                            <div className="py-5 text-center">
                              <p className="text-[12px] text-[#9da2ad]">
                                No tasks in this section.
                              </p>
                            </div>
                          ) : (
                            renderTaskTree(buildTaskTree(sectionTasks), 0, {
                              showProjectBadge: false,
                              showSectionBadge: false,
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unsectioned Tasks (Tasks without a section in this project) */}
                  {(unsectionedTasks.length > 0 || sections.length > 0) && (
                    <div className="rounded-2xl border border-[#e6e7ea] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#202328]">
                      <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f4] dark:border-white/[.06]">
                        <div className="flex items-center gap-2.5">
                          <Folder size={16} className="text-[#9da1aa]" />
                          <h4 className="font-semibold text-[15px] text-[#555a66] dark:text-[#a0a5b1]">
                            No Section
                          </h4>
                          <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#747985] dark:bg-white/10 dark:text-[#9da2ad]">
                            {unsectionedTasks.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenCreateTask({
                              projectId: project.id,
                              sectionId: null,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6957d9] hover:bg-[#f0eefc] dark:hover:bg-[#332d59]"
                        >
                          <Plus size={13} />
                          <span>Add task</span>
                        </button>
                      </div>

                      <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
                        {unsectionedTasks.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-[12px] text-[#9da2ad]">
                              No unsectioned tasks.
                            </p>
                          </div>
                        ) : (
                          renderTaskTree(buildTaskTree(unsectionedTasks), 0, {
                            showProjectBadge: false,
                            showSectionBadge: false,
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks Accordion */}
                  {completedProjectTasks.length > 0 && (
                    <div className="mt-8 rounded-2xl border border-[#ececef] bg-white/60 p-4 dark:border-white/[.06] dark:bg-[#202328]/50">
                      <button
                        type="button"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex w-full items-center justify-between text-left text-[13px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span>Completed ({completedProjectTasks.length})</span>
                        </div>
                        {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {showCompleted && (
                        <div className="mt-3 divide-y divide-[#eef0f2] border-t border-[#f0f1f4] dark:divide-white/[.06] dark:border-white/[.06]">
                          {completedProjectTasks.map((t) => (
                            <TaskItem
                              key={t.id}
                              task={t}
                              onToggleComplete={handleToggleComplete}
                              onEdit={handleOpenEditTask}
                              onDelete={handleDeleteTask}
                              showProjectBadge={false}
                              showSectionBadge={true}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modals for Project and Section Management */}
            {editProjectModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setEditProjectModalOpen(false);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-project-title"
                  className="w-full max-w-[400px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
                    <h3 id="edit-project-title" className="text-[17px] font-semibold">Rename Project</h3>
                    <button
                      type="button"
                      aria-label="Close dialog"
                      onClick={() => setEditProjectModalOpen(false)}
                      className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProject} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="edit-project-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                        Project Name
                      </label>
                      <input
                        id="edit-project-name"
                        type="text"
                        required
                        autoFocus
                        maxLength={100}
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-2">
                        Color Tag
                      </label>
                      <div className="flex items-center gap-2.5" role="radiogroup" aria-label="Project color">
                        {COLOR_PALETTES.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Select color ${color}`}
                            onClick={() => setEditProjectColor(color)}
                            style={{ backgroundColor: color }}
                            className={`h-7 w-7 rounded-full transition transform hover:scale-110 ${
                              editProjectColor === color
                                ? 'ring-2 ring-offset-2 ring-[#6957d9] dark:ring-offset-[#202328]'
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditProjectModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading || !editProjectName.trim()}
                        className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf] disabled:opacity-50"
                      >
                        {actionLoading && <Loader2 size={14} className="animate-spin" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {createSectionModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setCreateSectionModalOpen(false);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-section-title"
                  className="w-full max-w-[400px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
                    <h3 id="create-section-title" className="text-[17px] font-semibold">New Section</h3>
                    <button
                      type="button"
                      aria-label="Close dialog"
                      onClick={() => setCreateSectionModalOpen(false)}
                      className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSection} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="create-section-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                        Section Name
                      </label>
                      <input
                        id="create-section-name"
                        type="text"
                        required
                        autoFocus
                        maxLength={100}
                        placeholder="e.g. In Progress, Quality Review, Deployed"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setCreateSectionModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading || !newSectionName.trim()}
                        className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf] disabled:opacity-50"
                      >
                        {actionLoading && <Loader2 size={14} className="animate-spin" />}
                        <span>Add Section</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editSectionModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setEditSectionModalOpen(false);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-section-title"
                  className="w-full max-w-[400px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
                    <h3 id="edit-section-title" className="text-[17px] font-semibold">Rename Section</h3>
                    <button
                      type="button"
                      aria-label="Close dialog"
                      onClick={() => setEditSectionModalOpen(false)}
                      className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateSection} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="edit-section-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                        Section Name
                      </label>
                      <input
                        id="edit-section-name"
                        type="text"
                        required
                        autoFocus
                        maxLength={100}
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditSectionModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading || !editingSectionName.trim()}
                        className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf] disabled:opacity-50"
                      >
                        {actionLoading && <Loader2 size={14} className="animate-spin" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Task Create / Edit Modal */}
            <TaskModal
              isOpen={taskModalOpen}
              onClose={() => setTaskModalOpen(false)}
              onSave={handleSaveTask}
              onDelete={handleDeleteTask}
              initialTask={editingTask}
              projects={projects}
              labels={labels}
              allTasks={tasks}
              defaultProjectId={modalDefaultProjectId}
              defaultSectionId={modalDefaultSectionId}
              defaultDueDate={modalDefaultDueDate}
              defaultParentTaskId={modalDefaultParentTaskId}
            />
          </>
        )}
      </section>
    );
  }

  // ==========================================
  // VIEW: BASIC SEARCH RESULTS (FR-SRCH-001)
  // ==========================================
  if (activeView === 'search') {
    return (
      <section className="mx-auto max-w-[920px] px-5 py-8 sm:px-8 sm:py-11">
        {/* View Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.12em] text-[#9b9fa8]">
              Search
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-.03em] flex items-center gap-2.5">
              <span>Search Results</span>
              {searchQuery.trim() && !searching && (
                <span className="rounded-full bg-[#f0eefc] px-2.5 py-0.5 text-[13px] font-semibold text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]">
                  {searchResults.length}
                </span>
              )}
            </h2>
            {searchQuery.trim() ? (
              <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
                Showing results matching &ldquo;{searchQuery}&rdquo; across titles, descriptions, projects, sections, and labels
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
                Type a keyword in the search bar above to search across your tasks
              </p>
            )}
          </div>
        </div>

        {searchError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {searching ? (
          <div className="flex items-center justify-center py-20 text-[#9da2ad]">
            <Loader2 size={24} className="animate-spin text-[#6957d9]" />
          </div>
        ) : !searchQuery.trim() ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
              <Search size={24} />
            </div>
            <h4 className="text-[16px] font-semibold">Start searching</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              Search for keywords across task titles, descriptions, projects, sections, or labels.
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
              <Search size={24} />
            </div>
            <h4 className="text-[16px] font-semibold">No tasks matched your search</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              We couldn&apos;t find any tasks matching &ldquo;{searchQuery}&rdquo;. Try another keyword.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e7e8eb] bg-white shadow-sm dark:border-white/[.08] dark:bg-[#202328]">
            <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
              {searchResults.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleOpenEditTask}
                  onDelete={handleDeleteTask}
                  onAddSubtask={(parent) =>
                    handleOpenCreateTask({
                      parentTaskId: parent.id,
                      projectId: parent.projectId,
                      sectionId: parent.sectionId,
                    })
                  }
                  showProjectBadge={true}
                  showSectionBadge={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={editingTask}
          projects={projects}
          labels={labels}
          allTasks={tasks}
          defaultProjectId={modalDefaultProjectId}
          defaultSectionId={modalDefaultSectionId}
          defaultDueDate={modalDefaultDueDate}
          defaultParentTaskId={modalDefaultParentTaskId}
        />
      </section>
    );
  }

  // ==========================================
  // VIEW: UPCOMING VIEW
  // ==========================================
  if (activeView === 'upcoming') {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    const upcomingTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate > todayStr
    );
    const activeUpcomingTasks = upcomingTasks.filter((t) => !t.isCompleted);
    const completedUpcomingTasks = upcomingTasks.filter((t) => t.isCompleted);

    // Grouping: Tomorrow, Later this week, Later
    const tomorrowTasks = activeUpcomingTasks.filter((t) => t.dueDate === tomorrowStr);
    const thisWeekTasks = activeUpcomingTasks.filter(
      (t) => t.dueDate && t.dueDate > tomorrowStr && t.dueDate <= nextWeekStr
    );
    const laterTasks = activeUpcomingTasks.filter(
      (t) => t.dueDate && t.dueDate > nextWeekStr
    );

    return (
      <section className={`mx-auto px-5 py-8 sm:px-8 sm:py-11 ${currentLayout === 'board' ? 'max-w-[1400px]' : currentLayout === 'calendar' ? 'max-w-[1200px]' : 'max-w-[920px]'}`}>
        {/* View Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.12em] text-[#9b9fa8]">
              Upcoming
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-.03em] flex items-center gap-2.5">
              <span>Upcoming</span>
              <span className="rounded-full bg-[#f0eefc] px-2.5 py-0.5 text-[13px] font-semibold text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]">
                {activeUpcomingTasks.length}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderLayoutSwitcher()}

            <button
              type="button"
              onClick={() => handleOpenCreateTask({ dueDate: tomorrowStr })}
              className="flex items-center gap-1.5 rounded-xl bg-[#6957d9] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
            >
              <Plus size={15} />
              <span>Add task</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Task List / Groups */}
        {loadingTasks ? (
          <div className="flex items-center justify-center py-20 text-[#9da2ad]">
            <Loader2 size={24} className="animate-spin text-[#6957d9]" />
          </div>
        ) : currentLayout === 'board' ? (
          <BoardView
            tasks={upcomingTasks}
            sections={[]}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={(opts) => handleOpenCreateTask({ dueDate: tomorrowStr, ...opts })}
            onMoveTaskSection={handleMoveTaskSection}
          />
        ) : currentLayout === 'calendar' ? (
          <CalendarView
            tasks={upcomingTasks}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={(opts) => handleOpenCreateTask({ dueDate: tomorrowStr, ...opts })}
            onMoveTaskDate={handleMoveTaskDate}
          />
        ) : activeUpcomingTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
              <CalendarDays size={24} />
            </div>
            <h4 className="text-[16px] font-semibold">No upcoming tasks</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              Plan ahead! Tasks scheduled for tomorrow and beyond will appear here.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateTask({ dueDate: tomorrowStr })}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf]"
            >
              <Plus size={15} />
              <span>Add task for tomorrow</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group 1: Tomorrow */}
            {tomorrowTasks.length > 0 && (
              <div className="rounded-2xl border border-[#e6e7ea] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#202328]">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f4] dark:border-white/[.06]">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={16} className="text-[#6957d9]" />
                    <h4 className="font-semibold text-[15px]">
                      Tomorrow <span className="text-[12px] font-normal text-[#8a8f9c]">({tomorrowFormatted})</span>
                    </h4>
                    <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#747985] dark:bg-white/10 dark:text-[#9da2ad]">
                      {tomorrowTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateTask({ dueDate: tomorrowStr })}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#6957d9] hover:bg-[#f0eefc] dark:hover:bg-[#332d59]"
                  >
                    <Plus size={13} />
                    <span>Add task</span>
                  </button>
                </div>
                <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
                  {renderTaskTree(buildTaskTree(tomorrowTasks), 0, {
                    showProjectBadge: true,
                    showSectionBadge: true,
                  })}
                </div>
              </div>
            )}

            {/* Group 2: Later This Week */}
            {thisWeekTasks.length > 0 && (
              <div className="rounded-2xl border border-[#e6e7ea] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#202328]">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f4] dark:border-white/[.06]">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={16} className="text-blue-500" />
                    <h4 className="font-semibold text-[15px]">Later this week</h4>
                    <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#747985] dark:bg-white/10 dark:text-[#9da2ad]">
                      {thisWeekTasks.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
                  {renderTaskTree(buildTaskTree(thisWeekTasks), 0, {
                    showProjectBadge: true,
                    showSectionBadge: true,
                  })}
                </div>
              </div>
            )}

            {/* Group 3: Later */}
            {laterTasks.length > 0 && (
              <div className="rounded-2xl border border-[#e6e7ea] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#202328]">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0f1f4] dark:border-white/[.06]">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays size={16} className="text-amber-500" />
                    <h4 className="font-semibold text-[15px]">Later</h4>
                    <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[11px] font-medium text-[#747985] dark:bg-white/10 dark:text-[#9da2ad]">
                      {laterTasks.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
                  {renderTaskTree(buildTaskTree(laterTasks), 0, {
                    showProjectBadge: true,
                    showSectionBadge: true,
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Upcoming Tasks Accordion */}
        {completedUpcomingTasks.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[#ececef] bg-white/60 p-4 dark:border-white/[.06] dark:bg-[#202328]/50">
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex w-full items-center justify-between text-left text-[13px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Completed upcoming ({completedUpcomingTasks.length})</span>
              </div>
              {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showCompleted && (
              <div className="mt-3 divide-y divide-[#eef0f2] border-t border-[#f0f1f4] dark:divide-white/[.06] dark:border-white/[.06]">
                {completedUpcomingTasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleOpenEditTask}
                    onDelete={handleDeleteTask}
                    showProjectBadge={true}
                    showSectionBadge={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={editingTask}
          projects={projects}
          labels={labels}
          allTasks={tasks}
          defaultProjectId={modalDefaultProjectId}
          defaultSectionId={modalDefaultSectionId}
          defaultDueDate={modalDefaultDueDate}
          defaultParentTaskId={modalDefaultParentTaskId}
        />
      </section>
    );
  }

  // ==========================================
  // VIEW: TODAY VIEW
  // ==========================================
  if (activeView === 'today') {
    const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
    const activeTodayTasks = todayTasks.filter((t) => !t.isCompleted);
    const completedTodayTasks = todayTasks.filter((t) => t.isCompleted);

    return (
      <section className={`mx-auto px-5 py-8 sm:px-8 sm:py-11 ${currentLayout === 'board' ? 'max-w-[1400px]' : currentLayout === 'calendar' ? 'max-w-[1200px]' : 'max-w-[920px]'}`}>
        {/* View Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.12em] text-[#9b9fa8]">
              {todayFormatted}
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-.03em] flex items-center gap-2.5">
              <span>Today</span>
              <span className="rounded-full bg-[#f0eefc] px-2.5 py-0.5 text-[13px] font-semibold text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]">
                {activeTodayTasks.length}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderLayoutSwitcher()}

            <button
              type="button"
              onClick={() => handleOpenCreateTask({ dueDate: todayStr })}
              className="flex items-center gap-1.5 rounded-xl bg-[#6957d9] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
            >
              <Plus size={15} />
              <span>Add task</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Task List */}
        {loadingTasks ? (
          <div className="flex items-center justify-center py-20 text-[#9da2ad]">
            <Loader2 size={24} className="animate-spin text-[#6957d9]" />
          </div>
        ) : currentLayout === 'board' ? (
          <BoardView
            tasks={todayTasks}
            sections={[]}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={(opts) => handleOpenCreateTask({ dueDate: todayStr, ...opts })}
            onMoveTaskSection={handleMoveTaskSection}
          />
        ) : currentLayout === 'calendar' ? (
          <CalendarView
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={(opts) => handleOpenCreateTask({ dueDate: todayStr, ...opts })}
            onMoveTaskDate={handleMoveTaskDate}
          />
        ) : activeTodayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Calendar size={24} />
            </div>
            <h4 className="text-[16px] font-semibold">No tasks due today</h4>
            <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
              What would you like to accomplish today? Stay ahead by planning your day.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateTask({ dueDate: todayStr })}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf]"
            >
              <Plus size={15} />
              <span>Add task for today</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e7e8eb] bg-white shadow-sm dark:border-white/[.08] dark:bg-[#202328]">
            <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
              {renderTaskTree(buildTaskTree(activeTodayTasks), 0, {
                showProjectBadge: true,
                showSectionBadge: true,
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks Accordion */}
        {completedTodayTasks.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[#ececef] bg-white/60 p-4 dark:border-white/[.06] dark:bg-[#202328]/50">
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex w-full items-center justify-between text-left text-[13px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Completed today ({completedTodayTasks.length})</span>
              </div>
              {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showCompleted && (
              <div className="mt-3 divide-y divide-[#eef0f2] border-t border-[#f0f1f4] dark:divide-white/[.06] dark:border-white/[.06]">
                {completedTodayTasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleOpenEditTask}
                    onDelete={handleDeleteTask}
                    showProjectBadge={true}
                    showSectionBadge={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={editingTask}
          projects={projects}
          labels={labels}
          allTasks={tasks}
          defaultProjectId={modalDefaultProjectId}
          defaultSectionId={modalDefaultSectionId}
          defaultDueDate={modalDefaultDueDate}
          defaultParentTaskId={modalDefaultParentTaskId}
        />
      </section>
    );
  }

  // ==========================================
  // VIEW: INBOX (DEFAULT)
  // ==========================================
  const inboxTasks = tasks.filter((t) => !t.projectId);
  const activeInboxTasks = inboxTasks.filter((t) => !t.isCompleted);
  const completedInboxTasks = inboxTasks.filter((t) => t.isCompleted);

  return (
    <section className={`mx-auto px-5 py-8 sm:px-8 sm:py-11 ${currentLayout === 'board' ? 'max-w-[1400px]' : currentLayout === 'calendar' ? 'max-w-[1200px]' : 'max-w-[920px]'}`}>
      {/* View Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.12em] text-[#9b9fa8]">
            {todayFormatted}
          </p>
          <h2 className="text-[26px] font-semibold tracking-[-.03em] flex items-center gap-2.5">
            <span>Inbox</span>
            <span className="rounded-full bg-[#f0eefc] px-2.5 py-0.5 text-[13px] font-semibold text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]">
              {activeInboxTasks.length}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {renderLayoutSwitcher()}

          <button
            type="button"
            onClick={() => handleOpenCreateTask({ projectId: null })}
            className="flex items-center gap-1.5 rounded-xl bg-[#6957d9] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
          >
            <Plus size={15} />
            <span>Add task</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e7e8eb] bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#202328]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Folder size={18} />
            </div>
            <button
              onClick={() => {
                const addBtn = document.querySelector('aside button[aria-label="Add project"]') as HTMLButtonElement;
                if (addBtn) addBtn.click();
              }}
              className="text-[12px] font-medium text-[#6957d9] hover:underline"
            >
              + New Project
            </button>
          </div>
          <h3 className="text-[15px] font-semibold">Projects ({projects.length})</h3>
          <p className="mt-1 text-[12px] text-[#747985] dark:text-[#9da2ad]">
            Organize complex initiatives into projects and stages.
          </p>
        </div>

        <div className="rounded-2xl border border-[#e7e8eb] bg-white p-5 shadow-sm dark:border-white/[.08] dark:bg-[#202328]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Tag size={18} />
            </div>
            <button
              onClick={() => router.push('/?view=labels')}
              className="text-[12px] font-medium text-[#6957d9] hover:underline"
            >
              Manage Labels &rarr;
            </button>
          </div>
          <h3 className="text-[15px] font-semibold">Labels ({labels.length})</h3>
          <p className="mt-1 text-[12px] text-[#747985] dark:text-[#9da2ad]">
            Categorize and filter tasks across projects with custom colors.
          </p>
        </div>
      </div>

      {/* Task List */}
      {loadingTasks ? (
        <div className="flex items-center justify-center py-20 text-[#9da2ad]">
          <Loader2 size={24} className="animate-spin text-[#6957d9]" />
        </div>
      ) : currentLayout === 'board' ? (
        <BoardView
          tasks={inboxTasks}
          sections={[]}
          onToggleComplete={handleToggleComplete}
          onEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onAddTask={(opts) => handleOpenCreateTask({ projectId: null, ...opts })}
          onMoveTaskSection={handleMoveTaskSection}
        />
      ) : currentLayout === 'calendar' ? (
        <CalendarView
          tasks={inboxTasks}
          onToggleComplete={handleToggleComplete}
          onEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onAddTask={(opts) => handleOpenCreateTask({ projectId: null, ...opts })}
          onMoveTaskDate={handleMoveTaskDate}
        />
      ) : activeInboxTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e2e4e8] p-12 text-center dark:border-white/10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6957d9]/10 text-[#6957d9]">
            <Inbox size={24} />
          </div>
          <h4 className="text-[16px] font-semibold">No tasks in Inbox</h4>
          <p className="mt-1 text-[13px] text-[#747985] dark:text-[#9da2ad]">
            You&apos;re all caught up! Enjoy your day or capture thoughts for later.
          </p>
          <button
            type="button"
            onClick={() => handleOpenCreateTask({ projectId: null })}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#5d4bcf]"
          >
            <Plus size={15} />
            <span>Add a task</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e7e8eb] bg-white shadow-sm dark:border-white/[.08] dark:bg-[#202328]">
          <div className="divide-y divide-[#eef0f2] dark:divide-white/[.06]">
            {renderTaskTree(buildTaskTree(activeInboxTasks), 0, {
              showProjectBadge: true,
              showSectionBadge: true,
            })}
          </div>
        </div>
      )}

      {/* Completed Tasks Accordion */}
      {completedInboxTasks.length > 0 && (
        <div className="mt-8 rounded-2xl border border-[#ececef] bg-white/60 p-4 dark:border-white/[.06] dark:bg-[#202328]/50">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center justify-between text-left text-[13px] font-medium text-[#707580] hover:text-[#1b1d22] dark:text-[#9da2ad] dark:hover:text-white"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Completed ({completedInboxTasks.length})</span>
            </div>
            {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showCompleted && (
            <div className="mt-3 divide-y divide-[#eef0f2] border-t border-[#f0f1f4] dark:divide-white/[.06] dark:border-white/[.06]">
              {completedInboxTasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleOpenEditTask}
                  onDelete={handleDeleteTask}
                  showProjectBadge={true}
                  showSectionBadge={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        projects={projects}
        labels={labels}
        allTasks={tasks}
        defaultProjectId={modalDefaultProjectId}
        defaultSectionId={modalDefaultSectionId}
        defaultDueDate={modalDefaultDueDate}
        defaultParentTaskId={modalDefaultParentTaskId}
      />
    </section>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#6957d9]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
