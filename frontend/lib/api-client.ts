const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface UserProfile {
  id: string;
  email: string;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface SectionItem {
  id: string;
  projectId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  sections?: SectionItem[];
}

export interface LabelItem {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  parentTaskId?: string | null;
  projectId?: string | null;
  sectionId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  section?: {
    id: string;
    name: string;
  } | null;
  labels?: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
  subtasks?: TaskItem[];
}

export interface SubtaskSuggestion {
  title: string;
  description?: string;
  priority: string;
  estimatedMinutes?: number;
}

export interface TaskBreakdownResponse {
  originalTitle: string;
  suggestions: SubtaskSuggestion[];
  subtasks: SubtaskSuggestion[];
  provider: string;
  reasoning?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('taskly_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('taskly_token', token);
      } else {
        localStorage.removeItem('taskly_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('taskly_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(35000),
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText || 'An unexpected error occurred' };
      }

      // Handle class-validator array messages
      const message = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Request failed';

      const error: ApiError = {
        statusCode: response.status,
        message,
        error: errorData.error,
      };

      throw error;
    }

    return response.json();
  }

  // --- Auth Endpoints ---

  async register(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me', {
      method: 'GET',
    });
  }

  async logout(): Promise<{ message: string }> {
    try {
      const res = await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      return res;
    } finally {
      this.setToken(null);
    }
  }

  // --- Projects Endpoints ---

  async getProjects(): Promise<ProjectItem[]> {
    return this.request<ProjectItem[]>('/projects', { method: 'GET' });
  }

  async getProject(id: string): Promise<ProjectItem> {
    return this.request<ProjectItem>(`/projects/${id}`, { method: 'GET' });
  }

  async createProject(data: { name: string; color?: string }): Promise<ProjectItem> {
    return this.request<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; color?: string }): Promise<ProjectItem> {
    return this.request<ProjectItem>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Sections Endpoints ---

  async getSections(projectId: string): Promise<SectionItem[]> {
    return this.request<SectionItem[]>(`/projects/${projectId}/sections`, {
      method: 'GET',
    });
  }

  async createSection(projectId: string, data: { name: string; order?: number }): Promise<SectionItem> {
    return this.request<SectionItem>(`/projects/${projectId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSection(id: string, data: { name?: string; order?: number }): Promise<SectionItem> {
    return this.request<SectionItem>(`/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSection(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/sections/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Labels Endpoints ---

  async getLabels(): Promise<LabelItem[]> {
    return this.request<LabelItem[]>('/labels', { method: 'GET' });
  }

  async createLabel(data: { name: string; color?: string }): Promise<LabelItem> {
    return this.request<LabelItem>('/labels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLabel(id: string, data: { name?: string; color?: string }): Promise<LabelItem> {
    return this.request<LabelItem>(`/labels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLabel(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/labels/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Tasks Endpoints ---

  async getTasks(): Promise<TaskItem[]> {
    return this.request<TaskItem[]>('/tasks', { method: 'GET' });
  }

  async getTask(id: string): Promise<TaskItem> {
    return this.request<TaskItem>(`/tasks/${id}`, { method: 'GET' });
  }

  async createTask(data: {
    title: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: number;
    parentTaskId?: string;
    projectId?: string;
    sectionId?: string;
    labelIds?: string[];
  }): Promise<TaskItem> {
    return this.request<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      dueDate?: string | null;
      dueTime?: string | null;
      priority?: number;
      isCompleted?: boolean;
      parentTaskId?: string | null;
      projectId?: string | null;
      sectionId?: string | null;
      labelIds?: string[];
    },
  ): Promise<TaskItem> {
    return this.request<TaskItem>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async toggleTaskComplete(id: string): Promise<TaskItem> {
    return this.request<TaskItem>(`/tasks/${id}/complete`, {
      method: 'PATCH',
    });
  }

  async searchTasks(query: string): Promise<TaskItem[]> {
    const trimmed = encodeURIComponent(query.trim());
    return this.request<TaskItem[]>(`/tasks/search?q=${trimmed}`, { method: 'GET' });
  }

  async getTaskChildren(id: string): Promise<TaskItem[]> {
    return this.request<TaskItem[]>(`/tasks/${id}/children`, { method: 'GET' });
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // --- AI Breakdown Endpoint ---

  async breakDownTask(data: {
    title?: string;
    task?: string;
    description?: string;
    maxSubtasks?: number;
  }): Promise<TaskBreakdownResponse> {
    return this.request<TaskBreakdownResponse>('/ai/tasks/breakdown', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();

