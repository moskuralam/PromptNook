import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Star,
  Edit3,
  CopyPlus,
  Trash2,
  FileText,
  Calendar,
} from "lucide-react";
import { Category, Prompt } from "../types";
import { copyToClipboard } from "../utils/clipboard";

interface PromptViewModalProps {
  prompt: Prompt | null;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
  onDuplicate: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}

export const PromptViewModal: React.FC<PromptViewModalProps> = ({
  prompt,
  category,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !prompt) return null;

  const handleCopy = async () => {
    const result = await copyToClipboard(prompt.content);
    if (result.success) {
      setCopied(true);
      onNotify("Prompt copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(result.error || "Failed to copy prompt", "error");
    }
  };

  const wordCount = prompt.content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = prompt.content.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-prompt-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white border border-[#EAEAE8] rounded-2xl shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAE8]">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            {category && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F5F5F3] text-xs font-medium text-[#404040]">
                {category.name}
              </span>
            )}
            <div className="flex items-center gap-1 text-[11px] text-[#737373] tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[#A3A3A3]" />
              <span>
                Updated {new Date(prompt.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Favorite toggle */}
            <button
              onClick={() => onToggleFavorite(prompt)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                prompt.isFavorite
                  ? "text-[#FF963D] hover:bg-[#FFF4EB]"
                  : "text-[#A3A3A3] hover:text-[#171717] hover:bg-[#F5F5F3]"
              }`}
              title={prompt.isFavorite ? "Remove favorite" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${prompt.isFavorite ? "fill-[#FF963D]" : ""}`} />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <h2 id="view-prompt-title" className="text-xl font-bold text-[#17233F] tracking-tight leading-snug">
              {prompt.title}
            </h2>
          </div>

          {/* Prompt Content Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                Full Prompt Content
              </span>
              <span className="text-[11px] text-[#737373] tabular-nums font-mono">
                {wordCount} words · {charCount} characters
              </span>
            </div>

            <div className="bg-[#FAF9F7] border border-[#EAEAE8] rounded-xl p-4 sm:p-5">
              <pre className="font-mono text-xs sm:text-sm text-[#171717] leading-relaxed whitespace-pre-wrap break-words select-text">
                {prompt.content}
              </pre>
            </div>
          </div>

          {/* Notes */}
          {prompt.notes && (
            <div className="bg-[#FFFDF9] border border-[#F5E6CC] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-[#92400E]">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Model Guidance</span>
              </div>
              <p className="text-xs sm:text-sm text-[#78350F] whitespace-pre-wrap leading-relaxed">
                {prompt.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-[#737373] mb-2">
                Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium text-[#17233F] bg-[#F7F7F6] border border-[#EAEAE8] px-2.5 py-1 rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAEAE8] bg-[#F7F7F6] rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(prompt);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#171717] bg-white border border-[#EAEAE8] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#737373]" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onDuplicate(prompt);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#171717] bg-white border border-[#EAEAE8] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
            >
              <CopyPlus className="w-3.5 h-3.5 text-[#737373]" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onDelete(prompt);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#EF4444] bg-white border border-[#EAEAE8] hover:bg-[#FEF2F2] rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer ${
              copied
                ? "bg-[#10B981] text-white"
                : "bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Prompt Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
