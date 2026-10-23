import React, { useState, useEffect, useRef } from "react";
import { X, AlertCircle, ChevronDown } from "lucide-react";
import { Category, Prompt } from "../types";

export interface PromptDraft {
  title: string;
  content: string;
  categoryId: string;
  notes: string;
}

interface PromptModalProps {
  isOpen: boolean;
  editingPrompt: Prompt | null;
  defaultCategoryId?: string;
  categories: Category[];
  initialDraft?: PromptDraft | null;
  onDraftChange?: (draft: PromptDraft) => void;
  onClose: () => void;
  onSave: (promptData: {
    id?: string;
    title: string;
    content: string;
    categoryId: string;
    tags: string[];
    notes: string;
    isFavorite?: boolean;
    createdAt?: string;
  }) => Promise<void>;
  onOpenCreateCategory: (currentDraft: PromptDraft) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  editingPrompt,
  defaultCategoryId,
  categories,
  initialDraft,
  onDraftChange,
  onClose,
  onSave,
  onOpenCreateCategory,
}) => {
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [content, setContent] = useState(initialDraft?.content ?? "");
  const [categoryId, setCategoryId] = useState(
    initialDraft?.categoryId ||
      (editingPrompt ? editingPrompt.categoryId : defaultCategoryId || (categories[0]?.id ?? "cat-other"))
  );
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; categoryId?: string }>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const prevEditingIdRef = useRef<string | undefined>(editingPrompt?.id);

  // Initialize or reset form values only when opening or switching editing prompt
  useEffect(() => {
    if (isOpen) {
      const isJustOpening = !wasOpenRef.current;
      const editingPromptChanged = editingPrompt?.id !== prevEditingIdRef.current;

      if (isJustOpening || editingPromptChanged) {
        if (initialDraft) {
          setTitle(initialDraft.title);
          setContent(initialDraft.content);
          setCategoryId(
            initialDraft.categoryId || defaultCategoryId || (categories[0]?.id ?? "cat-other")
          );
          setNotes(initialDraft.notes);
        } else if (editingPrompt) {
          setTitle(editingPrompt.title);
          setContent(editingPrompt.content);
          setCategoryId(editingPrompt.categoryId);
          setNotes(editingPrompt.notes || "");
        } else {
          setTitle("");
          setContent("");
          setCategoryId(defaultCategoryId || (categories[0]?.id ?? "cat-other"));
          setNotes("");
        }
        setErrors({});
        setShowUnsavedWarning(false);
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    }
    wasOpenRef.current = isOpen;
    prevEditingIdRef.current = editingPrompt?.id;
  }, [isOpen, editingPrompt, defaultCategoryId, initialDraft, categories]);

  // Synchronize newly created category while modal is open
  useEffect(() => {
    if (isOpen && initialDraft?.categoryId && initialDraft.categoryId !== categoryId) {
      setCategoryId(initialDraft.categoryId);
      if (errors.categoryId) {
        setErrors((prev) => ({ ...prev, categoryId: undefined }));
      }
    }
  }, [isOpen, initialDraft?.categoryId]);

  // Fallback if categoryId is empty
  useEffect(() => {
    if (isOpen && !categoryId && categories.length > 0) {
      setCategoryId(defaultCategoryId || categories[0].id);
    }
  }, [isOpen, categoryId, categories, defaultCategoryId]);

  if (!isOpen) return null;

  // Determine if form has dirty unsaved changes
  const isDirty = editingPrompt
    ? title !== editingPrompt.title ||
      content !== editingPrompt.content ||
      categoryId !== editingPrompt.categoryId ||
      notes !== (editingPrompt.notes || "")
    : title.trim() !== "" || content.trim() !== "" || notes.trim() !== "";

  const handleCloseAttempt = () => {
    if (isDirty && !isSubmitting) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const validate = () => {
    const newErrors: { title?: string; content?: string; categoryId?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Prompt title is required.";
    }
    if (!content.trim()) {
      newErrors.content = "Prompt content is required.";
    }
    if (!categoryId) {
      newErrors.categoryId = "Please select a category.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingPrompt ? editingPrompt.id : undefined,
        title: title.trim(),
        content: content, // preserve exact whitespace, indentation and line breaks
        categoryId,
        tags: editingPrompt?.tags || [],
        notes: notes.trim(),
        isFavorite: editingPrompt ? editingPrompt.isFavorite : false,
        createdAt: editingPrompt ? editingPrompt.createdAt : undefined,
      });
      onClose();
    } catch {
      // Keep modal open and preserve all entered text if saving fails
      setErrors((prev) => ({
        ...prev,
        content: "An unexpected error occurred while saving. Your text has been preserved. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !showUnsavedWarning) {
          handleCloseAttempt();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#EAEAE8] rounded-2xl shadow-xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAE8]">
          <h2 id="prompt-modal-title" className="text-base font-bold text-[#17233F]">
            {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
          </h2>
          <button
            onClick={handleCloseAttempt}
            disabled={isSubmitting}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="prompt-title" className="block text-xs font-semibold text-[#171717] mb-1.5">
              Title <span className="text-[#EF4444]">*</span>
            </label>
            <input
              id="prompt-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                onDraftChange?.({ title: nextTitle, content, categoryId, notes });
              }}
              placeholder="e.g. High-Converting Saas Landing Page"
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20 transition-all ${
                errors.title ? "border-[#EF4444] focus:border-[#EF4444]" : "border-[#EAEAE8] focus:border-[#7655E8]"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Prompt Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prompt-content" className="block text-xs font-semibold text-[#171717]">
                Prompt Content <span className="text-[#EF4444]">*</span>
              </label>
              <span className="text-[11px] text-[#737373] tabular-nums font-mono">
                {wordCount} words · {charCount} chars
              </span>
            </div>
            <textarea
              id="prompt-content"
              rows={8}
              value={content}
              onChange={(e) => {
                const nextContent = e.target.value;
                setContent(nextContent);
                if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                onDraftChange?.({ title, content: nextContent, categoryId, notes });
              }}
              placeholder="Write or paste your full prompt here. Line breaks, formatting, variables [LIKE_THIS], and spacing will be preserved exactly..."
              className={`w-full px-3.5 py-2.5 bg-[#FAF9F7] border rounded-xl text-xs sm:text-sm font-mono text-[#171717] placeholder:text-[#A3A3A3] placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20 focus:bg-white transition-all resize-y ${
                errors.content ? "border-[#EF4444] focus:border-[#EF4444]" : "border-[#EAEAE8] focus:border-[#7655E8]"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.content}</span>
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prompt-category" className="block text-xs font-semibold text-[#171717]">
                Category <span className="text-[#EF4444]">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onOpenCreateCategory({
                    title,
                    content,
                    categoryId,
                    notes,
                  });
                }}
                className="text-[11px] font-medium text-[#7655E8] hover:text-[#5F3CD6] cursor-pointer"
              >
                + Create Category
              </button>
            </div>
            <div className="relative">
              <select
                id="prompt-category"
                value={categoryId}
                onChange={(e) => {
                  const nextCatId = e.target.value;
                  setCategoryId(nextCatId);
                  if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  onDraftChange?.({ title, content, categoryId: nextCatId, notes });
                }}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#EAEAE8] rounded-xl text-xs sm:text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20 focus:border-[#7655E8] transition-all cursor-pointer appearance-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#737373]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="prompt-notes" className="block text-xs font-semibold text-[#171717] mb-1.5">
              Notes <span className="text-[#737373] font-normal">(Optional)</span>
            </label>
            <textarea
              id="prompt-notes"
              rows={3}
              value={notes}
              onChange={(e) => {
                const nextNotes = e.target.value;
                setNotes(nextNotes);
                onDraftChange?.({ title, content, categoryId, notes: nextNotes });
              }}
              placeholder="e.g. Best result with ChatGPT"
              className="w-full px-3.5 py-2.5 bg-white border border-[#EAEAE8] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#7655E8]/20 focus:border-[#7655E8] transition-all resize-y"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#EAEAE8] bg-[#F7F7F6] rounded-b-2xl">
          <button
            type="button"
            onClick={handleCloseAttempt}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-[#404040] hover:text-[#171717] hover:bg-[#EAEAE8] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <span>{editingPrompt ? "Save Changes" : "Save Prompt"}</span>
            )}
          </button>
        </div>

        {/* Unsaved Changes Confirmation Dialog */}
        {showUnsavedWarning && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-2xl">
            <div className="bg-white border border-[#EAEAE8] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
              <h3 className="text-sm font-bold text-[#17233F] mb-1.5">Unsaved Changes</h3>
              <p className="text-xs text-[#525252] leading-relaxed mb-4">
                You have unsaved changes in this prompt. If you discard now, your input will be lost.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnsavedWarning(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#404040] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedWarning(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-xl transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
