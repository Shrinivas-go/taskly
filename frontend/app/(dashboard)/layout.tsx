'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  Inbox,
  Calendar,
  Tag,
  Plus,
  Settings,
  X,
  Menu,
  LogOut,
  Loader2,
  ChevronDown,
  CalendarDays,
  Search,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { ThemeToggle } from '../../components/theme-toggle';
import { apiClient, ProjectItem } from '../../lib/api-client';

const COLOR_PALETTES = [
  '#6957d9', // Brand Purple
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#6b7280', // Slate
];

function SidebarNav({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);

  // New Project Modal State
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(COLOR_PALETTES[0]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams ? searchParams.get('project') : null;
  const activeView = searchParams ? searchParams.get('view') : null;

  // Load Projects from Backend API
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingProjects(true);
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch {
      // Handled silently
    } finally {
      setLoadingProjects(false);
    }
  }, [isAuthenticated]);

  // Load Task Counts for Inbox, Today & Upcoming
  const loadTaskCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const allTasks = await apiClient.getTasks();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const activeInbox = allTasks.filter((t) => !t.isCompleted && !t.projectId);
      const activeToday = allTasks.filter((t) => !t.isCompleted && t.dueDate === todayStr);
      const activeUpcoming = allTasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate > todayStr);

      setInboxCount(activeInbox.length);
      setTodayCount(activeToday.length);
      setUpcomingCount(activeUpcoming.length);
    } catch {
      // Handled silently
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProjects();
    loadTaskCounts();

    const handleRefresh = () => {
      loadProjects();
      loadTaskCounts();
    };

    window.addEventListener('refresh-task-counts', handleRefresh);
    return () => {
      window.removeEventListener('refresh-task-counts', handleRefresh);
    };
  }, [loadProjects, loadTaskCounts]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!createProjectModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreateProjectModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createProjectModalOpen]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setCreatingProject(true);
      setProjectError(null);
      const created = await apiClient.createProject({
        name: newProjectName.trim(),
        color: newProjectColor,
      });
      setProjects((prev) => [...prev, created]);
      setNewProjectName('');
      setCreateProjectModalOpen(false);
      router.push(`/?project=${created.id}`);
    } catch (err: any) {
      setProjectError(err.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  if (!user) return null;

  const userInitials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';
  const userName = user.email ? user.email.split('@')[0] : 'User';

  const isInboxActive = !activeProjectId && (!activeView || activeView === 'inbox');
  const isTodayActive = !activeProjectId && activeView === 'today';
  const isUpcomingActive = !activeProjectId && activeView === 'upcoming';
  const isLabelsActive = activeView === 'labels';

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[#e6e7ea] bg-white px-3 py-4 transition-transform dark:border-white/[.08] dark:bg-[#202328] md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Mobile Close */}
        <div className="flex items-center justify-between px-3 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6957d9] text-white shadow-sm">
              <Check size={16} strokeWidth={3} />
            </div>
            <span className="text-[16px] font-semibold tracking-[-.02em]">
              taskly
            </span>
          </div>
          <button
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-[#9297a2] hover:bg-[#f2f3f5] dark:hover:bg-white/5 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Add Task Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-task-modal'));
            setSidebarOpen(false);
          }}
          className="mb-5 flex h-10 w-full items-center gap-2 rounded-lg bg-[#6957d9] px-3 text-[13px] font-medium text-white shadow-[0_4px_10px_rgba(105,87,217,.18)] transition hover:bg-[#5d4bcf]"
        >
          <Plus size={17} />
          <span>Add task</span>
          <span className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">N</span>
        </button>

        {/* Main Navigation */}
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => {
              router.push('/?view=inbox');
              setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
              isInboxActive
                ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]'
                : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'
            }`}
          >
            <Inbox size={17} strokeWidth={1.8} />
            <span>Inbox</span>
            {inboxCount > 0 && (
              <span className="ml-auto text-[11px] font-medium text-[#8f949f] dark:text-[#9ea3ae]">
                {inboxCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push('/?view=today');
              setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
              isTodayActive
                ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]'
                : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'
            }`}
          >
            <Calendar size={17} strokeWidth={1.8} />
            <span>Today</span>
            {todayCount > 0 && (
              <span className="ml-auto text-[11px] font-medium text-[#8f949f] dark:text-[#9ea3ae]">
                {todayCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push('/?view=upcoming');
              setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
              isUpcomingActive
                ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]'
                : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'
            }`}
          >
            <CalendarDays size={17} strokeWidth={1.8} />
            <span>Upcoming</span>
            {upcomingCount > 0 && (
              <span className="ml-auto text-[11px] font-medium text-[#8f949f] dark:text-[#9ea3ae]">
                {upcomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              router.push('/?view=labels');
              setSidebarOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
              isLabelsActive
                ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]'
                : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'
            }`}
          >
            <Tag size={17} strokeWidth={1.8} />
            <span>Labels</span>
          </button>
        </nav>

        {/* Projects Section */}
        <div className="mt-8 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-[#9da1aa]">
            <span>Projects</span>
            <button
              aria-label="Add project"
              onClick={() => setCreateProjectModalOpen(true)}
              className="rounded p-0.5 hover:bg-[#f0f1f3] dark:hover:bg-white/5"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-0.5">
            {loadingProjects ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#9da2ad]">
                <Loader2 size={13} className="animate-spin" />
                <span>Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-[#9da2ad]">No projects yet</p>
            ) : (
              projects.map((project) => {
                const isSelected = activeProjectId === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      router.push(`/?project=${project.id}`);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] transition ${
                      isSelected
                        ? 'bg-[#f0eefc] font-medium text-[#5d4bcf] dark:bg-[#332d59] dark:text-[#c3baff]'
                        : 'text-[#656b77] hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || '#6957d9' }}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* User Account & Logout Footer */}
        <div className="relative mt-auto space-y-1 border-t border-[#ececef] pt-3 dark:border-white/[.08]">
          <div className="flex items-center justify-between px-3 py-1 mb-1">
            <span className="text-[12px] text-[#747985] dark:text-[#9da2ad]">Theme</span>
            <ThemeToggle />
          </div>

          {/* User Profile Dropdown Trigger */}
          <button
            type="button"
            id="user-profile-menu-button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-[#656b77] transition hover:bg-[#f5f5f7] dark:text-[#aeb3bd] dark:hover:bg-white/5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9d3ff] text-[11px] font-semibold text-[#5948c7]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[#1b1d22] dark:text-[#f2f3f5]">
                {userName}
              </p>
              <p className="truncate text-[11px] text-[#9da2ad]">
                {user.email}
              </p>
            </div>
            <ChevronDown size={14} className="shrink-0 text-[#9da2ad]" />
          </button>

          {/* User Popover / Dropdown with Logout */}
          {userDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-[#e6e7ea] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#252930]">
              <div className="px-2.5 py-2 border-b border-[#ececef] dark:border-white/10 mb-1">
                <p className="text-[11px] text-[#777c87] dark:text-[#9da2ad]">Signed in as</p>
                <p className="truncate text-[13px] font-medium">{user.email}</p>
              </div>
              <button
                type="button"
                id="logout-button"
                onClick={() => logout()}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Modal: Create Project */}
      {createProjectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateProjectModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-[#e6e7ea] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#202328]">
            <div className="flex items-center justify-between pb-4 border-b border-[#eef0f2] dark:border-white/10">
              <h3 id="create-project-title" className="text-[17px] font-semibold">Create Project</h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setCreateProjectModalOpen(false)}
                className="rounded-lg p-1 text-[#9da1aa] hover:bg-[#f4f5f7] dark:hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              {projectError && (
                <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  {projectError}
                </div>
              )}

              <div>
                <label htmlFor="create-project-name" className="block text-[13px] font-medium text-[#4b5260] dark:text-[#a0a5b1] mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-project-name"
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  placeholder="e.g. Work, Personal, College"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e4e8] bg-transparent px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[#6957d9] dark:border-white/10 dark:text-[#f2f3f5]"
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
                      onClick={() => setNewProjectColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full transition transform hover:scale-110 ${
                        newProjectColor === color
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
                  onClick={() => setCreateProjectModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#656b77] hover:bg-[#f2f3f5] dark:text-[#aeb3bd] dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject || !newProjectName.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[#6957d9] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf] disabled:opacity-50"
                >
                  {creatingProject && <Loader2 size={14} className="animate-spin" />}
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function TopHeader({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get('q') || '' : '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Sync with URL query parameter
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  // Global Ctrl+K / Cmd+K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?view=search&q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/?view=inbox');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#e6e7ea] bg-white/95 px-4 backdrop-blur-md dark:border-white/[.08] dark:bg-[#202328]/95 sm:px-6">
      <div className="flex items-center gap-3 flex-1 max-w-[540px]">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-[#707580] hover:bg-[#f0f1f3] dark:text-[#aeb3bd] dark:hover:bg-white/5 md:hidden"
        >
          <Menu size={19} />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba0a9] dark:text-[#7a808c]"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks, projects, labels... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="h-9 w-full rounded-xl border border-[#e2e4e8] bg-[#f8f9fb] pl-9 pr-8 text-[13px] text-[#1b1d22] placeholder-[#9ba0a9] outline-none transition focus:border-[#6957d9] focus:bg-white dark:border-white/10 dark:bg-white/[.04] dark:text-[#f2f3f5] dark:placeholder-[#7a808c] dark:focus:bg-[#202328]"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('');
                router.push('/?view=inbox');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9ba0a9] hover:text-[#1b1d22] dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-task-modal'))}
          className="flex items-center gap-1.5 rounded-lg bg-[#6957d9] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:bg-[#5d4bcf]"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] dark:bg-[#17191d]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6957d9] text-white shadow-[0_5px_16px_rgba(105,87,217,.25)]">
            <Check size={26} strokeWidth={2.8} />
          </div>
          <div className="flex items-center justify-center gap-2 text-[14px] text-[#747985] dark:text-[#9da2ad]">
            <Loader2 size={16} className="animate-spin text-[#6957d9]" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] text-[#1b1d22] transition-colors dark:bg-[#17191d] dark:text-[#f2f3f5]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar with Suspense boundary for useSearchParams */}
      <Suspense
        fallback={
          <aside className="hidden w-[260px] border-r border-[#e6e7ea] bg-white p-4 dark:border-white/[.08] dark:bg-[#202328] md:flex md:flex-col" />
        }
      >
        <SidebarNav
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </Suspense>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header with Search and Mobile Nav Trigger */}
        <Suspense fallback={<div className="h-14 border-b border-[#e6e7ea] dark:border-white/[.08]" />}>
          <TopHeader setSidebarOpen={setSidebarOpen} />
        </Suspense>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
