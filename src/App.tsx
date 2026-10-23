import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Star,
  Layers,
  FolderOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Category, Prompt, AppSettings, SortOption, SortDirection, ToastMessage } from "./types";
import { dbService, generateId } from "./services/db";
import { sortCategories } from "./services/starterData";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { PromptCard } from "./components/PromptCard";
import { PromptModal, PromptDraft } from "./components/PromptModal";
import { PromptViewModal } from "./components/PromptViewModal";
import { CategoryModal } from "./components/CategoryModal";
import { BackupModal } from "./components/BackupModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { ToastContainer } from "./components/ToastContainer";
import { BackupReminderBanner } from "./components/BackupReminderBanner";

export default function App() {
  // --- Data State ---
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    id: "app",
    schemaVersion: 1,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- Filtering & Sorting State ---
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // --- Modals & Overlays State ---
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [promptDraft, setPromptDraft] = useState<PromptDraft | null>(() => {
    try {
      const saved = sessionStorage.getItem("promptnook_prompt_draft");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [categoryModalSource, setCategoryModalSource] = useState<"prompt_modal" | "sidebar" | null>(null);

  // Keep in-progress draft synced in sessionStorage
  useEffect(() => {
    try {
      if (promptDraft) {
        sessionStorage.setItem("promptnook_prompt_draft", JSON.stringify(promptDraft));
      } else {
        sessionStorage.removeItem("promptnook_prompt_draft");
      }
    } catch {
      // ignore
    }
  }, [promptDraft]);

  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- Session-level Backup Reminder Banner Dismissal State ---
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  const handleDismissBackupReminder = () => {
    setIsBannerDismissed(true);
  };

  // --- Toast Notification State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Initial Data Load ---
  const loadDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      const [fetchedPrompts, fetchedCategories, fetchedSettings] = await Promise.all([
        dbService.getPrompts(),
        dbService.getCategories(),
        dbService.getSettings(),
      ]);

      setPrompts(fetchedPrompts);
      setCategories(sortCategories(fetchedCategories));
      setSettings(fetchedSettings);
      if (fetchedSettings.sortBy) setSortBy(fetchedSettings.sortBy);
      if (fetchedSettings.sortDirection) setSortDirection(fetchedSettings.sortDirection);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to load database. Please make sure IndexedDB is supported and enabled in your browser.";
      setDbError(errorMsg);
      throw err instanceof Error ? err : new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Banner visibility logic:
  // - Kept hidden until the user successfully saves their first prompt (prompts.length > 0)
  // - Remains visible as user saves additional prompts and navigates
  // - Dismissible via close (x) button; persisted across refreshes and future visits
  // - Displayed for existing users with saved prompts on next visit unless already dismissed
  // - Not re-triggered for edits to existing prompts
  const showBackupBanner = !isLoading && prompts.length > 0 && !isBannerDismissed;

  useEffect(() => {
    loadDatabase().catch(() => {});
  }, [loadDatabase]);

  // Handle Sort Change & persist
  const handleSortChange = async (option: SortOption, direction: SortDirection) => {
    setSortBy(option);
    setSortDirection(direction);
    try {
      const updated = {
        ...settings,
        sortBy: option,
        sortDirection: direction,
      };
      setSettings(updated);
      await dbService.saveSettings(updated);
    } catch {
      // Ignore settings save failure
    }
  };

  // --- Memoized Sorted Categories (Newest Created First) ---
  const sortedCategories = useMemo(() => {
    return sortCategories(categories);
  }, [categories]);

  // --- Category Map for O(1) lookup ---
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    sortedCategories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [sortedCategories]);

  // --- Filtered and Sorted Prompts ---
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];

    // Category / Favorites filter
    if (selectedCategoryId === "favorites") {
      result = result.filter((p) => p.isFavorite);
    } else if (selectedCategoryId) {
      result = result.filter((p) => p.categoryId === selectedCategoryId);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "title") {
        const comp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? comp : -comp;
      } else if (sortBy === "createdAt") {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      } else {
        // default: updatedAt
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
    });

    return result;
  }, [prompts, selectedCategoryId, sortBy, sortDirection]);

  // --- Handlers: Prompt Actions ---

  const handleOpenAddPrompt = () => {
    setEditingPrompt(null);
    setPromptDraft(null);
    setIsPromptModalOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setPromptDraft(null);
    setIsPromptModalOpen(true);
  };

  const handleOpenCreateCategoryFromPrompt = (draft: PromptDraft) => {
    setPromptDraft(draft);
    setCategoryModalSource("prompt_modal");
    setIsCategoryModalOpen(true);
  };

  const handleCategoryCreatedFromPrompt = (newCategory: Category) => {
    setPromptDraft((prev) => ({
      title: prev?.title || "",
      content: prev?.content || "",
      notes: prev?.notes || "",
      categoryId: newCategory.id,
    }));
    setIsCategoryModalOpen(false);
    setIsPromptModalOpen(true);
    setCategoryModalSource(null);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    if (categoryModalSource === "prompt_modal") {
      setIsPromptModalOpen(true);
    }
    setCategoryModalSource(null);
  };

  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
    setEditingPrompt(null);
    setPromptDraft(null);
  };

  const handleSavePrompt = async (data: {
    id?: string;
    title: string;
    content: string;
    categoryId: string;
    tags: string[];
    notes: string;
    isFavorite?: boolean;
    createdAt?: string;
  }) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(data.id);

    const promptToSave: Prompt = {
      id: data.id || generateId(),
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      tags: data.tags,
      notes: data.notes,
      isFavorite: data.isFavorite ?? false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await dbService.savePrompt(promptToSave);

    setPrompts((prev) => {
      if (isEdit) {
        return prev.map((p) => (p.id === promptToSave.id ? promptToSave : p));
      } else {
        return [promptToSave, ...prev];
      }
    });

    // Also update viewing prompt if currently open
    if (viewingPrompt && viewingPrompt.id === promptToSave.id) {
      setViewingPrompt(promptToSave);
    }

    setPromptDraft(null);
    setEditingPrompt(null);
    setIsPromptModalOpen(false);

    addToast(isEdit ? "Prompt updated successfully!" : "Prompt created successfully!", "success");
  };

  const handleDuplicatePrompt = async (prompt: Prompt) => {
    const now = new Date().toISOString();
    const duplicate: Prompt = {
      ...prompt,
      id: generateId(),
      title: `${prompt.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await dbService.savePrompt(duplicate);
      setPrompts((prev) => [duplicate, ...prev]);
      addToast(`Duplicated "${prompt.title}"`, "success");
    } catch {
      addToast("Failed to duplicate prompt", "error");
    }
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    setDeletingPrompt(prompt);
  };

  const confirmDeletePrompt = async () => {
    if (!deletingPrompt) return;
    try {
      await dbService.deletePrompt(deletingPrompt.id);
      setPrompts((prev) => prev.filter((p) => p.id !== deletingPrompt.id));
      if (viewingPrompt && viewingPrompt.id === deletingPrompt.id) {
        setViewingPrompt(null);
      }
      addToast("Prompt deleted", "info");
      setDeletingPrompt(null);
    } catch {
      addToast("Failed to delete prompt", "error");
    }
  };

  const handleToggleFavorite = async (prompt: Prompt) => {
    const updated: Prompt = {
      ...prompt,
      isFavorite: !prompt.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    try {
      await dbService.savePrompt(updated);
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (viewingPrompt && viewingPrompt.id === updated.id) {
        setViewingPrompt(updated);
      }
      addToast(
        updated.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        "info"
      );
    } catch {
      addToast("Failed to update favorite status", "error");
    }
  };

  // --- Handlers: Category Actions ---

  const handleSaveCategory = async (category: Category) => {
    await dbService.saveCategory(category);
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      const updated = exists
        ? prev.map((c) => (c.id === category.id ? category : c))
        : [category, ...prev];
      return sortCategories(updated);
    });
  };

  const handleDeleteCategory = async (
    categoryId: string,
    action?: { mode: "move"; targetCategoryId: string } | { mode: "delete_prompts" }
  ) => {
    await dbService.deleteCategory(categoryId, action);
    // Reload full database to get refreshed prompts and categories
    try {
      await loadDatabase();
    } catch {
      // Ignored here as error banner in UI will reflect failure
    }
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    }
  };

  const handleResetData = async () => {
    try {
      await dbService.resetAllData();
    } catch (resetErr) {
      addToast("Failed to reset library data. Stored data was not modified.", "error");
      throw resetErr;
    }

    // Reset succeeded in the database. Update UI state.
    setSelectedCategoryId(null);
    setSortBy("updatedAt");
    setSortDirection("desc");

    try {
      await loadDatabase();
      addToast("All data has been reset to defaults.", "info");
    } catch (refreshErr) {
      const msg = refreshErr instanceof Error ? refreshErr.message : "Failed to reload library display.";
      const errorWithFlag = new Error(msg);
      (errorWithFlag as any).isPostResetRefreshFailure = true;
      addToast("Data was reset to defaults, but could not refresh library screen.", "error");
      throw errorWithFlag;
    }
  };

  // Page Header Title
  const pageTitle = useMemo(() => {
    if (selectedCategoryId === null) return "All Prompts";
    if (selectedCategoryId === "favorites") return "Favorites";
    const cat = categoryMap.get(selectedCategoryId);
    return cat ? cat.name : "Prompts";
  }, [selectedCategoryId, categoryMap]);

  return (
    <div className="flex min-h-screen bg-[#F5F5F3] text-[#171717] antialiased selection:bg-[#E8DFFF] selection:text-[#17233F]">
      {/* Sidebar Navigation */}
      <Sidebar
        categories={sortedCategories}
        prompts={prompts}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onOpenNewCategory={() => {
          setCategoryModalSource("sidebar");
          setIsCategoryModalOpen(true);
        }}
        onOpenManageCategories={() => {
          setCategoryModalSource("sidebar");
          setIsCategoryModalOpen(true);
        }}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Header
          title={pageTitle}
          count={filteredPrompts.length}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onOpenAddPrompt={handleOpenAddPrompt}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {/* Backup Reminder Banner */}
          {showBackupBanner && (
            <BackupReminderBanner onDismiss={handleDismissBackupReminder} />
          )}

          {/* Database Error Banner */}
          {dbError && (
            <div className="p-4 mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#991B1B]">Database Error</h3>
                <p className="text-xs text-[#DC2626] mt-0.5">{dbError}</p>
                <button
                  onClick={loadDatabase}
                  className="mt-2 text-xs font-semibold text-[#991B1B] underline hover:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Content Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-[#EAEAE8] rounded-2xl p-5 h-52 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-[#F5F5F3] rounded w-24" />
                    <div className="h-5 bg-[#F5F5F3] rounded w-3/4" />
                    <div className="h-3 bg-[#F5F5F3] rounded w-full" />
                    <div className="h-3 bg-[#F5F5F3] rounded w-5/6" />
                  </div>
                  <div className="h-8 bg-[#F5F5F3] rounded-xl w-24 self-end" />
                </div>
              ))}
            </div>
          ) : filteredPrompts.length > 0 ? (
            /* Prompt Cards Grid - 3 columns on desktop, 2 on tablet, 1 on mobile */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  category={categoryMap.get(prompt.categoryId)}
                  onView={setViewingPrompt}
                  onEdit={handleEditPrompt}
                  onDuplicate={handleDuplicatePrompt}
                  onDelete={handleDeletePrompt}
                  onToggleFavorite={handleToggleFavorite}
                  onNotify={addToast}
                />
              ))}
            </div>
          ) : (
            /* Empty States */
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-lg mx-auto bg-white border border-[#EAEAE8] rounded-2xl shadow-xs my-6 sm:my-8">
              {prompts.length === 0 ? (
                /* Brand New Library Empty State */
                <>
                  <div className="w-11 h-11 rounded-xl bg-[#E8DFFF] text-[#7655E8] flex items-center justify-center mb-3 shadow-2xs">
                    <i className="hgi hgi-stroke hgi-rounded hgi-book-open-01 text-xl"></i>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#17233F] mb-1.5 tracking-tight">
                    Your prompt library starts here.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed max-w-sm mb-5">
                    Your prompts, all in one place. Save your favorite AI prompts and find them whenever you need them.
                  </p>
                  <button
                    onClick={handleOpenAddPrompt}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Your First Prompt</span>
                  </button>
                </>
              ) : selectedCategoryId === "favorites" ? (
                /* Empty Favorites State */
                <>
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF4EB] text-[#FF963D] flex items-center justify-center mb-3">
                    <Star className="w-6 h-6 fill-[#FF963D]" />
                  </div>
                  <h2 className="text-base font-bold text-[#17233F] mb-1">
                    No favorite prompts yet
                  </h2>
                  <p className="text-xs text-[#737373] mb-5">
                    Click the star icon on any prompt card in your library to quickly access it here.
                  </p>
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className="px-4 py-2 bg-[#7655E8] hover:bg-[#6242D6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Browse All Prompts
                  </button>
                </>
              ) : (
                /* Empty Category State */
                <>
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] text-[#737373] flex items-center justify-center mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-[#17233F] mb-1">
                    No prompts in this category yet
                  </h2>
                  <p className="text-xs text-[#737373] mb-5">
                    Start organizing this category by adding your first prompt.
                  </p>
                  <button
                    onClick={handleOpenAddPrompt}
                    className="flex items-center gap-2 px-4 py-2 bg-[#7655E8] hover:bg-[#6242D6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Prompt</span>
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* --- Dialogs and Modals --- */}

      {/* Prompt Create/Edit Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        editingPrompt={editingPrompt}
        defaultCategoryId={
          selectedCategoryId && selectedCategoryId !== "favorites"
            ? selectedCategoryId
            : undefined
        }
        categories={sortedCategories}
        initialDraft={promptDraft}
        onDraftChange={setPromptDraft}
        onClose={handleClosePromptModal}
        onSave={handleSavePrompt}
        onOpenCreateCategory={handleOpenCreateCategoryFromPrompt}
      />

      {/* Prompt Inspector / View Modal */}
      <PromptViewModal
        isOpen={Boolean(viewingPrompt)}
        prompt={viewingPrompt}
        category={viewingPrompt ? categoryMap.get(viewingPrompt.categoryId) : undefined}
        onClose={() => setViewingPrompt(null)}
        onEdit={(p) => {
          setViewingPrompt(null);
          handleEditPrompt(p);
        }}
        onDuplicate={(p) => {
          handleDuplicatePrompt(p);
        }}
        onDelete={(p) => {
          setViewingPrompt(null);
          handleDeletePrompt(p);
        }}
        onToggleFavorite={handleToggleFavorite}
        onNotify={addToast}
      />

      {/* Category Management Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        categories={sortedCategories}
        prompts={prompts}
        onClose={handleCloseCategoryModal}
        onSaveCategory={handleSaveCategory}
        onCategoryCreated={
          categoryModalSource === "prompt_modal"
            ? handleCategoryCreatedFromPrompt
            : undefined
        }
        onDeleteCategory={handleDeleteCategory}
        onNotify={addToast}
      />

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRefreshData={loadDatabase}
        onResetData={handleResetData}
        onNotify={addToast}
      />

      {/* Delete Prompt Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingPrompt)}
        promptTitle={deletingPrompt?.title || ""}
        onClose={() => setDeletingPrompt(null)}
        onConfirm={confirmDeletePrompt}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  );
}
