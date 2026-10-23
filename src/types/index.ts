export interface Prompt {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "app";
  schemaVersion: number;
  sortBy: "updatedAt" | "createdAt" | "title";
  sortDirection: "asc" | "desc";
  categoriesInitialized?: boolean;
  lastBackupAt?: string;
  backupReminderDismissed?: boolean;
}

export interface BackupData {
  app: "PromptNook";
  formatVersion: number;
  exportedAt: string;
  prompts: Prompt[];
  categories: Category[];
  settings?: Partial<AppSettings>;
}

export type SortOption = "updatedAt" | "createdAt" | "title";
export type SortDirection = "asc" | "desc";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
