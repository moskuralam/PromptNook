import React, { useState } from "react";
import { X, Plus, Edit2, Trash2, Check, AlertCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Category, Prompt } from "../types";

interface CategoryModalProps {
  isOpen: boolean;
  categories: Category[];
  prompts: Prompt[];
  onClose: () => void;
  onSaveCategory: (category: Category) => Promise<void>;
  onCategoryCreated?: (category: Category) => void;
  onDeleteCategory: (
    id: string,
    action?: { mode: "move"; targetCategoryId: string } | { mode: "delete_prompts" }
  ) => Promise<void>;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  categories,
  prompts,
  onClose,
  onSaveCategory,
  onCategoryCreated,
  onDeleteCategory,
  onNotify,
}) => {
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Delete modal state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete_prompts">("move");
  const [targetMoveCategoryId, setTargetMoveCategoryId] = useState<string>("");
  const [confirmDeletePromptsChecked, setConfirmDeletePromptsChecked] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("A category with this name already exists.");
      return;
    }

    try {
      const now = new Date().toISOString();
      const newCategory: Category = {
        id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      await onSaveCategory(newCategory);
      setNewCatName("");
      setErrorMsg("");
      onNotify(`Category "${trimmed}" created!`, "success");
      onCategoryCreated?.(newCategory);
    } catch {
      setErrorMsg("Failed to create category. Please try again.");
    }
  };

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setErrorMsg("");
  };

  const handleUpdate = async (cat: Category) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    if (
      categories.some(
        (c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setErrorMsg("Another category already has this name.");
      return;
    }

    try {
      await onSaveCategory({
        ...cat,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      });
      setEditingCatId(null);
      setErrorMsg("");
      onNotify(`Category renamed to "${trimmed}"!`, "success");
    } catch {
      setErrorMsg("Failed to update category.");
    }
  };

  const startDelete = (cat: Category) => {
    setCategoryToDelete(cat);
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setTargetMoveCategoryId(otherCats[0]?.id || "");
    setDeleteMode("move");
    setConfirmDeletePromptsChecked(false);
    setErrorMsg("");
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const count = prompts.filter((p) => p.categoryId === categoryToDelete.id).length;

    try {
      if (count === 0) {
        await onDeleteCategory(categoryToDelete.id);
        onNotify(`Category "${categoryToDelete.name}" deleted.`, "info");
      } else if (deleteMode === "move") {
        if (!targetMoveCategoryId) {
          setErrorMsg("Please select a target category to move prompts to.");
          return;
        }
        await onDeleteCategory(categoryToDelete.id, {
          mode: "move",
          targetCategoryId: targetMoveCategoryId,
        });
        const targetCatName =
          categories.find((c) => c.id === targetMoveCategoryId)?.name || "selected category";
        onNotify(
          `Category "${categoryToDelete.name}" deleted and prompts moved to "${targetCatName}".`,
          "info"
        );
      } else {
        // delete_prompts mode
        if (!confirmDeletePromptsChecked) {
          setErrorMsg("Please check the confirmation box to delete all prompts in this category.");
          return;
        }
        await onDeleteCategory(categoryToDelete.id, { mode: "delete_prompts" });
        onNotify(
          `Category "${categoryToDelete.name}" and all its prompts were deleted.`,
          "info"
        );
      }
      setCategoryToDelete(null);
    } catch {
      setErrorMsg("Failed to delete category.");
    }
  };

  const remainingCategoriesForMove = categoryToDelete
    ? categories.filter((c) => c.id !== categoryToDelete.id)
    : [];

  const promptsInSelectedCategory = categoryToDelete
    ? prompts.filter((p) => p.categoryId === categoryToDelete.id).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#EAEAE8] rounded-2xl shadow-xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAE8]">
          <h2 id="category-modal-title" className="text-base font-bold text-[#17233F]">
            Manage Categories
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add New Category Form */}
          <form onSubmit={handleCreate} className="p-4 bg-[#F7F7F6] border border-[#EAEAE8] rounded-xl space-y-2.5">
            <span className="block text-xs font-bold text-[#17233F]">
              Add New Category
            </span>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="e.g. Email Campaigns, Blog Posts..."
                className="flex-1 px-3 py-2 bg-white border border-[#EAEAE8] rounded-xl text-xs text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20 focus:border-[#7655E8]"
              />

              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7655E8] hover:bg-[#6242D6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Category List */}
          <div>
            <span className="block text-xs font-bold text-[#17233F] mb-2.5">
              Categories ({categories.length})
            </span>

            <div className="divide-y divide-[#F5F5F3] border border-[#EAEAE8] rounded-xl overflow-hidden bg-white">
              {categories.map((cat) => {
                const count = prompts.filter((p) => p.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                if (isEditing) {
                  return (
                    <div key={cat.id} className="p-3 bg-[#FAF9F7] space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-[#EAEAE8] rounded-lg text-xs font-medium text-[#171717]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdate(cat);
                            }
                            if (e.key === "Escape") {
                              setEditingCatId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(cat)}
                          className="p-1.5 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 bg-[#EAEAE8] text-[#171717] rounded-lg hover:bg-[#D5D5D2] cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FDFDFD] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-xs font-medium text-[#171717] truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-[#737373] tabular-nums">
                        {count} {count === 1 ? "prompt" : "prompts"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="p-1 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] rounded transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => startDelete(cat)}
                          className="p-1 text-[#737373] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#EAEAE8] bg-[#F7F7F6] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#17233F] bg-white border border-[#EAEAE8] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Delete Category Confirmation Dialog */}
        {categoryToDelete && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-2xl">
            <div className="bg-white border border-[#EAEAE8] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-2.5 mb-2 text-[#EF4444]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-[#17233F]">
                  Delete Category: {categoryToDelete.name}?
                </h3>
              </div>

              {promptsInSelectedCategory === 0 ? (
                <div>
                  <p className="text-xs text-[#525252] leading-relaxed mb-4">
                    This category currently contains no prompts. Are you sure you want to delete it?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#404040] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-xl transition-colors cursor-pointer"
                    >
                      Delete Category
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[#525252] leading-relaxed">
                    This category contains{" "}
                    <strong>
                      {promptsInSelectedCategory}{" "}
                      {promptsInSelectedCategory === 1 ? "prompt" : "prompts"}
                    </strong>
                    . What would you like to do with these prompts?
                  </p>

                  {/* Choice 1: Move prompts */}
                  {remainingCategoriesForMove.length > 0 && (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#EAEAE8] bg-[#F7F7F6] cursor-pointer">
                      <input
                        type="radio"
                        name="deleteMode"
                        checked={deleteMode === "move"}
                        onChange={() => setDeleteMode("move")}
                        className="mt-0.5 text-[#7655E8]"
                      />
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-[#17233F] block mb-1">
                          Move prompts to another category
                        </span>
                        {deleteMode === "move" && (
                          <select
                            value={targetMoveCategoryId}
                            onChange={(e) => setTargetMoveCategoryId(e.target.value)}
                            className="w-full mt-1.5 px-2.5 py-1.5 bg-white border border-[#EAEAE8] rounded-lg text-xs text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20"
                          >
                            {remainingCategoriesForMove.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Choice 2: Delete prompts */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === "delete_prompts"}
                      onChange={() => setDeleteMode("delete_prompts")}
                      className="mt-0.5 text-[#EF4444]"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-[#DC2626] block mb-1">
                        Delete category and its {promptsInSelectedCategory} prompts
                      </span>
                      {deleteMode === "delete_prompts" && (
                        <div className="mt-2 flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="confirm-delete-prompts"
                            checked={confirmDeletePromptsChecked}
                            onChange={(e) => setConfirmDeletePromptsChecked(e.target.checked)}
                            className="mt-0.5"
                          />
                          <label htmlFor="confirm-delete-prompts" className="text-[11px] text-[#991B1B] cursor-pointer leading-tight">
                            I understand this will permanently delete all {promptsInSelectedCategory} prompts in this category.
                          </label>
                        </div>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#404040] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleteMode === "delete_prompts" && !confirmDeletePromptsChecked}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                    >
                      {deleteMode === "move" ? "Move & Delete" : "Delete All"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
