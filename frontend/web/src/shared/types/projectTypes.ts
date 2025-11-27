export interface Project {
  title: string;
  project_name: string;
  id: string;
  team: string;
  team_name: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: number;
  created_by: string;
  created_by_name: string;
  members: ProjectMember[];
  member_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
  progress?: number;
  days_remaining?: number;
}

export interface ProjectMember {
  id: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  role: number;
  joined_at: string;
}

export interface Task {
  id: string;
  project: string;
  project_name: string;
  title: string;
  description: string;
  status: number;
  priority: number;
  start_date: string | null;  
  end_date: string | null;    
  due_date: string | null;
  assignee: string | null;
  assignee_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar: string | null;
  } | null;
  created_by: string;
  created_by_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  subtask_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task: string;
  task_title: string;
  title: string;
  description: string;
  status: number;
  due_date: string | null;
  assignee: string | null;
  assignee_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar: string | null;
  } | null;
  created_by: string;
  created_by_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task: string;
  user: string;
  user_details: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar: string | null;
  };
  content: string;
  created_at: string;
  updated_at: string;
}

// Enums
export enum ProjectStatus {
  PLANNING = 1,
  ACTIVE = 2,
  ON_HOLD = 3,
  COMPLETED = 4,
  CANCELLED = 5,
  ARCHIVED = 6  
}

export enum TaskStatus {
  BACKLOG = 1,
  TODO = 2,
  IN_PROGRESS = 3,
  IN_REVIEW = 4,      
  DONE = 5,
  BLOCKED = 6      
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

export enum ProjectMemberRole {
  VIEWER = 1,
  CONTRIBUTOR = 2,
  MANAGER = 3
}