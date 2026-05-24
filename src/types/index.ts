// ============================================
// PRAYUSH STUDIOS — TypeScript Type Definitions
// ============================================

export type UserRole = 'admin' | 'member';
export type ProjectStatus = 'planning' | 'in-progress' | 'review' | 'completed';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue';
export type FileType = 'drive' | 'figma' | 'url' | 'upload';
export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'closed';

// --------------------------------
// User / Profile
// --------------------------------
export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

// --------------------------------
// Client
// --------------------------------
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  notes?: string;
  portal_token?: string;
  created_at: string;
  // Joined
  projects?: Project[];
  active_projects_count?: number;
}

// --------------------------------
// Portal Types
// --------------------------------
export interface PortalData {
  client: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone?: string;
  };
  projects: {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    progress: number;
    due_date?: string;
    priority: Priority;
    files: ProjectFile[];
    payments: Payment[];
    tasks: { id: string; title: string; status: TaskStatus; priority: Priority; due_date?: string }[];
    notes?: Note[];
    
    // Optional customized portal attributes
    portal_welcome_title?: string;
    portal_welcome_message?: string;
    portal_current_phase?: string;
    portal_next_phase?: string;
    portal_pm_name?: string;
    portal_pm_email?: string;
    portal_quick_start?: string;
    portal_roadmap?: string;
  }[];
}

// --------------------------------
// Project
// --------------------------------
export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number; // 0-100
  due_date?: string;
  created_at: string;
  // Joined
  client?: Client;
  members?: Profile[];
  tasks?: Task[];
  payment?: Payment;
  notes?: Note[];
  
  // Optional customized portal attributes
  portal_welcome_title?: string;
  portal_welcome_message?: string;
  portal_current_phase?: string;
  portal_next_phase?: string;
  portal_pm_name?: string;
  portal_pm_email?: string;
  portal_quick_start?: string;
  portal_roadmap?: string;
}

// --------------------------------
// Task
// --------------------------------
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  // Joined
  project?: Project;
  assignee?: Profile;
  notes?: Note[];
}

// --------------------------------
// Note
// --------------------------------
export interface Note {
  id: string;
  author_id: string;
  entity_id: string;
  entity_type: 'project' | 'task';
  content: string;
  created_at: string;
  // Joined
  author?: Profile;
}

// --------------------------------
// File / Link
// --------------------------------
export interface ProjectFile {
  id: string;
  project_id: string | null;
  task_id?: string | null;
  name: string;
  url: string;
  type: FileType;
  uploaded_by: string;
  created_at: string;
  // Joined
  project?: Project;
  uploader?: Profile;
  task?: { id: string; title: string };
}

// --------------------------------
// Payment
// --------------------------------
export interface Payment {
  id: string;
  project_id: string;
  total_amount: number;
  advance_paid: number;
  balance: number;
  status: PaymentStatus;
  invoice_url?: string;
  notes?: string;
  created_at: string;
  // Joined
}

// --------------------------------
// Expense
// --------------------------------
export interface Expense {
  id: string;
  category: 'business' | 'team' | 'client' | 'revenue';
  title: string;
  amount: number;
  date: string;
  recipient?: string;
  user_id?: string;
  project_id?: string;
  description?: string;
  created_at: string;
  // Joined
  user?: Profile;
  project?: {
    id: string;
    name: string;
    client?: {
      name: string;
    };
  };
}

// --------------------------------
// Activity Log
// --------------------------------
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: 'project' | 'task' | 'client' | 'file' | 'payment' | 'note';
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  // Joined
  user?: Profile;
}

// --------------------------------
// Notification
// --------------------------------
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type?: 'task' | 'project' | 'payment' | 'deadline' | 'note';
  created_at: string;
}

// --------------------------------
// Dashboard Stats
// --------------------------------
export interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  overdueItems: number;
  totalRevenue: number;
  pendingPayments: number;
  projectsStartedThisMonth?: number;
  myEarnings: number;
}

// --------------------------------
// Kanban Column
// --------------------------------
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}
