import { AppSettings, BackupData, Category, Prompt } from "../types";
import { DEFAULT_CATEGORIES, sortCategories } from "./starterData";

const DB_NAME = "PromptNookDB";
const DB_VERSION = 1;

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9);
}

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isResetting = false;
  private isImporting = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Prompts store
        if (!db.objectStoreNames.contains("prompts")) {
          const promptStore = db.createObjectStore("prompts", { keyPath: "id" });
          promptStore.createIndex("categoryId", "categoryId", { unique: false });
          promptStore.createIndex("isFavorite", "isFavorite", { unique: false });
          promptStore.createIndex("updatedAt", "updatedAt", { unique: false });
          promptStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains("categories")) {
          const categoryStore = db.createObjectStore("categories", { keyPath: "id" });
          categoryStore.createIndex("name", "name", { unique: false });

          // Seed default categories upon initial creation
          DEFAULT_CATEGORIES.forEach((cat) => {
            categoryStore.add(cat);
          });
        }

        // Settings store
        if (!db.objectStoreNames.contains("settings")) {
          const settingsStore = db.createObjectStore("settings", { keyPath: "id" });
          const defaultSettings: AppSettings = {
            id: "app",
            schemaVersion: 1,
            sortBy: "updatedAt",
            sortDirection: "desc",
            categoriesInitialized: true,
          };
          settingsStore.add(defaultSettings);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error("Failed to open IndexedDB"));
      };
    });

    return this.dbPromise;
  }

  // --- Prompts CRUD ---

  async getPrompts(): Promise<Prompt[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["prompts"], "readonly");
      const store = transaction.objectStore("prompts");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as Prompt[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["prompts"], "readonly");
      const store = transaction.objectStore("prompts");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as Prompt | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async savePrompt(prompt: Prompt): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["prompts"], "readwrite");
      const store = transaction.objectStore("prompts");
      const request = store.put(prompt);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePrompt(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["prompts"], "readwrite");
      const store = transaction.objectStore("prompts");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Categories CRUD ---

  async getCategories(): Promise<Category[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["categories", "settings"], "readwrite");
      const categoryStore = transaction.objectStore("categories");
      const settingsStore = transaction.objectStore("settings");

      const settingsRequest = settingsStore.get("app");
      const catRequest = categoryStore.getAll();

      let categoriesResult: Category[] = [];
      let settingsResult: AppSettings | undefined;
      let pending = 2;

      const checkAndSeed = () => {
        pending--;
        if (pending > 0) return;

        // Check if categories have already been initialized
        if (!settingsResult || !settingsResult.categoriesInitialized) {
          const currentSettings: AppSettings = settingsResult || {
            id: "app",
            schemaVersion: 1,
            sortBy: "updatedAt",
            sortDirection: "desc",
          };

          if (categoriesResult.length === 0) {
            // Fresh installation: seed exactly the four default categories
            DEFAULT_CATEGORIES.forEach((cat) => {
              categoryStore.put(cat);
            });
            categoriesResult = [...DEFAULT_CATEGORIES];
          }

          // Mark categories as permanently initialized
          currentSettings.categoriesInitialized = true;
          settingsStore.put(currentSettings);
        }
      };

      settingsRequest.onsuccess = () => {
        settingsResult = settingsRequest.result as AppSettings | undefined;
        checkAndSeed();
      };
      settingsRequest.onerror = () => {
        checkAndSeed();
      };

      catRequest.onsuccess = () => {
        categoriesResult = (catRequest.result as Category[]) || [];
        checkAndSeed();
      };
      catRequest.onerror = () => {
        reject(catRequest.error);
      };

      transaction.oncomplete = () => {
        resolve(sortCategories(categoriesResult));
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async saveCategory(category: Category): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["categories"], "readwrite");
      const store = transaction.objectStore("categories");
      const request = store.put(category);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCategory(
    id: string,
    action?: { mode: "move"; targetCategoryId: string } | { mode: "delete_prompts" }
  ): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["categories", "prompts"], "readwrite");
      const categoryStore = transaction.objectStore("categories");
      const promptStore = transaction.objectStore("prompts");

      // Delete the category record
      categoryStore.delete(id);

      // Handle prompts referencing this category
      const promptReq = promptStore.getAll();
      promptReq.onsuccess = () => {
        const prompts = (promptReq.result as Prompt[]) || [];
        const affectedPrompts = prompts.filter((p) => p.categoryId === id);

        if (affectedPrompts.length > 0) {
          if (action?.mode === "move" && action.targetCategoryId) {
            affectedPrompts.forEach((p) => {
              promptStore.put({
                ...p,
                categoryId: action.targetCategoryId,
                updatedAt: new Date().toISOString(),
              });
            });
          } else if (action?.mode === "delete_prompts") {
            affectedPrompts.forEach((p) => {
              promptStore.delete(p.id);
            });
          }
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- Settings ---

  async getSettings(): Promise<AppSettings> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(["settings"], "readonly");
      const store = transaction.objectStore("settings");
      const request = store.get("app");

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as AppSettings);
        } else {
          resolve({
            id: "app",
            schemaVersion: 1,
            sortBy: "updatedAt",
            sortDirection: "desc",
          });
        }
      };
      request.onerror = () => {
        resolve({
          id: "app",
          schemaVersion: 1,
          sortBy: "updatedAt",
          sortDirection: "desc",
        });
      };
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["settings"], "readwrite");
      const store = transaction.objectStore("settings");
      const request = store.put(settings);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }



  // --- Backup & Restore ---

  async exportAllData(): Promise<BackupData> {
    const [prompts, categories, settings] = await Promise.all([
      this.getPrompts(),
      this.getCategories(),
      this.getSettings(),
    ]);

    const exportTimestamp = new Date().toISOString();

    // Update last backup timestamp
    await this.saveSettings({
      ...settings,
      lastBackupAt: exportTimestamp,
    });

    return {
      app: "PromptNook",
      formatVersion: 1,
      exportedAt: exportTimestamp,
      prompts,
      categories,
      settings: {
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
        lastBackupAt: exportTimestamp,
        backupReminderDismissed: settings.backupReminderDismissed,
      },
    };
  }

  async importData(
    data: BackupData,
    mode: "merge" | "replace"
  ): Promise<{ importedPrompts: number; importedCategories: number }> {
    if (this.isImporting) {
      throw new Error("An import operation is already in progress.");
    }
    this.isImporting = true;

    try {
      // 1. Fetch current database state before starting write transaction
      const [existingPrompts, existingCategories] = await Promise.all([
        this.getPrompts(),
        this.getCategories(),
      ]);

      // 2. Prevalidate & resolve records in memory
      // Validate settings if provided
      if (data.settings !== undefined) {
        if (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
          throw new Error("Invalid backup settings: 'settings' must be an object.");
        }
        const s = data.settings as Record<string, unknown>;
        const allowedSettingsKeys = new Set([
          "id",
          "schemaVersion",
          "sortBy",
          "sortDirection",
          "categoriesInitialized",
          "lastBackupAt",
          "backupReminderDismissed",
        ]);

        for (const key of Object.keys(s)) {
          if (!allowedSettingsKeys.has(key)) {
            throw new Error(`Invalid backup settings: Unrecognized setting '${key}'.`);
          }
        }

        if (s.id !== undefined && s.id !== "app") {
          throw new Error("Invalid backup settings: 'id' must be the string 'app'.");
        }
        if (s.schemaVersion !== undefined && (typeof s.schemaVersion !== "number" || s.schemaVersion !== 1)) {
          throw new Error("Invalid backup settings: 'schemaVersion' must be the number 1.");
        }
        if (s.sortBy !== undefined && !["updatedAt", "createdAt", "title"].includes(s.sortBy as string)) {
          throw new Error("Invalid backup settings: 'sortBy' must be 'updatedAt', 'createdAt', or 'title'.");
        }
        if (s.sortDirection !== undefined && !["asc", "desc"].includes(s.sortDirection as string)) {
          throw new Error("Invalid backup settings: 'sortDirection' must be 'asc' or 'desc'.");
        }
        if (s.categoriesInitialized !== undefined && typeof s.categoriesInitialized !== "boolean") {
          throw new Error("Invalid backup settings: 'categoriesInitialized' must be a boolean.");
        }
        if (s.lastBackupAt !== undefined) {
          if (
            typeof s.lastBackupAt !== "string" ||
            !s.lastBackupAt.trim() ||
            isNaN(new Date(s.lastBackupAt).getTime())
          ) {
            throw new Error("Invalid backup settings: 'lastBackupAt' must be a valid ISO date timestamp string.");
          }
        }
        if (s.backupReminderDismissed !== undefined && typeof s.backupReminderDismissed !== "boolean") {
          throw new Error("Invalid backup settings: 'backupReminderDismissed' must be a boolean.");
        }
      }

      let categoriesToWrite: Category[] = [];
      let promptsToWrite: Prompt[] = [];
      let settingsToWrite: AppSettings | null = null;
      let promptCount = 0;
      let catCount = 0;

      if (mode === "replace") {
        // Validate that incoming categories are valid
        const incomingCategories =
          data.categories && data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES;
        const validCatIds = new Set<string>(incomingCategories.map((c) => c.id));

        // In Replace mode, preserve valid imported category relationships and reject invalid references
        for (const prompt of data.prompts) {
          if (!validCatIds.has(prompt.categoryId)) {
            throw new Error(
              `Cannot import prompt "${prompt.title}": Category reference "${prompt.categoryId}" does not exist in backup categories.`
            );
          }
        }

        categoriesToWrite = incomingCategories;
        catCount = incomingCategories.length;

        promptsToWrite = data.prompts.map((p) => ({ ...p }));
        promptCount = promptsToWrite.length;

        settingsToWrite = {
          id: "app",
          schemaVersion: 1,
          sortBy: data.settings?.sortBy || "updatedAt",
          sortDirection: data.settings?.sortDirection || "desc",
          categoriesInitialized: true,
          lastBackupAt: data.exportedAt || new Date().toISOString(),
          backupReminderDismissed: data.settings?.backupReminderDismissed,
        };
      } else {
        // Merge mode:
        // Prevalidate and resolve all category and prompt mappings before writing records.
        const existingCatIdSet = new Set(existingCategories.map((c) => c.id));
        const existingCatNameMap = new Map<string, Category>();
        existingCategories.forEach((c) => {
          existingCatNameMap.set(c.name.toLowerCase().trim(), c);
        });

        // Map from incoming Category ID -> resolved target Category ID in the database
        const categoryMapping = new Map<string, string>();

        for (const incomingCat of data.categories) {
          const normName = incomingCat.name.toLowerCase().trim();

          if (existingCatNameMap.has(normName)) {
            // Category with this name already exists: map prompts to existing category ID
            const matchedExisting = existingCatNameMap.get(normName)!;
            categoryMapping.set(incomingCat.id, matchedExisting.id);
          } else if (existingCatIdSet.has(incomingCat.id)) {
            // Category ID collision with a different name: generate a fresh unique ID to prevent collision
            const newId = generateId();
            const remappedCat: Category = { ...incomingCat, id: newId };
            categoriesToWrite.push(remappedCat);
            categoryMapping.set(incomingCat.id, newId);
            existingCatIdSet.add(newId);
            existingCatNameMap.set(normName, remappedCat);
            catCount++;
          } else {
            // New distinct category
            categoriesToWrite.push({ ...incomingCat });
            categoryMapping.set(incomingCat.id, incomingCat.id);
            existingCatIdSet.add(incomingCat.id);
            existingCatNameMap.set(normName, incomingCat);
            catCount++;
          }
        }

        // Map and validate prompts
        const existingPromptIds = new Set(existingPrompts.map((p) => p.id));

        for (const incomingPrompt of data.prompts) {
          // Resolve target category ID
          const targetCatId = categoryMapping.get(incomingPrompt.categoryId);
          if (!targetCatId || !existingCatIdSet.has(targetCatId)) {
            throw new Error(
              `Cannot import prompt "${incomingPrompt.title}": Unresolved category reference "${incomingPrompt.categoryId}".`
            );
          }

          if (existingPromptIds.has(incomingPrompt.id)) {
            // Prompt ID collision: generate a fresh unique ID and append (Imported) to avoid overwriting existing prompt
            const newPromptId = generateId();
            promptsToWrite.push({
              ...incomingPrompt,
              id: newPromptId,
              categoryId: targetCatId,
              title: `${incomingPrompt.title} (Imported)`,
              updatedAt: new Date().toISOString(),
            });
            existingPromptIds.add(newPromptId);
            promptCount++;
          } else {
            promptsToWrite.push({
              ...incomingPrompt,
              categoryId: targetCatId,
            });
            existingPromptIds.add(incomingPrompt.id);
            promptCount++;
          }
        }
      }

      // 3. Atomically perform the writes in a single IndexedDB transaction
      const db = await this.openDB();
      return await new Promise<{ importedPrompts: number; importedCategories: number }>((resolve, reject) => {
        const storeNames =
          mode === "replace"
            ? (["prompts", "categories", "settings"] as const)
            : (["prompts", "categories"] as const);

        const transaction = db.transaction(storeNames as unknown as string[], "readwrite");
        const promptStore = transaction.objectStore("prompts");
        const categoryStore = transaction.objectStore("categories");

        let hasError = false;
        transaction.onerror = () => {
          hasError = true;
          reject(transaction.error || new Error("Failed to commit import transaction"));
        };
        transaction.onabort = () => {
          hasError = true;
          reject(transaction.error || new Error("Import transaction was aborted"));
        };
        transaction.oncomplete = () => {
          if (!hasError) {
            resolve({ importedPrompts: promptCount, importedCategories: catCount });
          }
        };

        if (mode === "replace") {
          const settingsStore = transaction.objectStore("settings");
          promptStore.clear();
          categoryStore.clear();

          for (const cat of categoriesToWrite) {
            categoryStore.put(cat);
          }
          for (const prompt of promptsToWrite) {
            promptStore.put(prompt);
          }
          if (settingsToWrite) {
            settingsStore.put(settingsToWrite);
          }
        } else {
          for (const cat of categoriesToWrite) {
            categoryStore.put(cat);
          }
          for (const prompt of promptsToWrite) {
            promptStore.put(prompt);
          }
        }
      });
    } finally {
      this.isImporting = false;
    }
  }

  // --- Reset All Data ---
  async resetAllData(): Promise<void> {
    if (this.isResetting) {
      throw new Error("A reset operation is already in progress.");
    }
    this.isResetting = true;

    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(["prompts", "categories", "settings"], "readwrite");
        const promptStore = transaction.objectStore("prompts");
        const categoryStore = transaction.objectStore("categories");
        const settingsStore = transaction.objectStore("settings");

        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error || new Error("Failed to reset database"));
        };
        transaction.onabort = () => {
          reject(transaction.error || new Error("Reset transaction was aborted"));
        };

        // 1. Clear all prompts
        promptStore.clear();

        // 2. Clear categories and re-seed exactly the 4 default categories
        categoryStore.clear();
        DEFAULT_CATEGORIES.forEach((cat) => {
          categoryStore.add(cat);
        });

        // 3. Reset settings
        settingsStore.clear();
        const defaultSettings: AppSettings = {
          id: "app",
          schemaVersion: 1,
          sortBy: "updatedAt",
          sortDirection: "desc",
          categoriesInitialized: true,
        };
        settingsStore.add(defaultSettings);
      });
    } finally {
      this.isResetting = false;
    }
  }
}

export const dbService = new DatabaseService();
