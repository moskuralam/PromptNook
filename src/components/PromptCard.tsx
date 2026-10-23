import React, { useState } from "react";
import {
  Copy,
  Check,
  Star,
  MoreVertical,
  Edit3,
  CopyPlus,
  Trash2,
} from "lucide-react";
import { Category, Prompt } from "../types";
import { copyToClipboard } from "../utils/clipboard";

interface PromptCardProps {
  prompt: Prompt;
  category?: Category;
  onView: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDuplicate: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  category,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await copyToClipboard(prompt.content);
    if (result.success) {
      setCopied(true);
      onNotify("Prompt copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(result.error || "Failed to copy prompt", "error");
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(prompt);
  };

  const wordCount = prompt.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <article
      onClick={() => onView(prompt)}
      className="group relative bg-white border border-[#EAEAE8] hover:border-[#D5D5D2] rounded-2xl p-5 shadow-xs hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[220px]"
    >
      <div>
        {/* Card Header: Category indicator & Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F5F5F3] text-[11px] font-medium text-[#404040] max-w-[180px] truncate">
                {category.name}
              </span>
            )}
            <span className="text-[11px] text-[#737373] tabular-nums shrink-0">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 -mr-1">
            {/* Favorite toggle */}
            <button
              onClick={handleFavorite}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                prompt.isFavorite
                  ? "text-[#FF963D] hover:bg-[#FFF4EB]"
                  : "text-[#A3A3A3] hover:text-[#171717] hover:bg-[#F5F5F3]"
              }`}
              title={prompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-label={prompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`w-4 h-4 ${prompt.isFavorite ? "fill-[#FF963D]" : ""}`}
              />
            </button>

            {/* Menu trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] transition-colors cursor-pointer"
                title="More options"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#EAEAE8] rounded-xl shadow-lg py-1.5 z-40 text-xs font-medium text-[#171717]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(prompt);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F3] text-left transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#737373]" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDuplicate(prompt);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F3] text-left transition-colors cursor-pointer"
                    >
                      <CopyPlus className="w-3.5 h-3.5 text-[#737373]" />
                      <span>Duplicate</span>
                    </button>
                    <div className="my-1 border-t border-[#EAEAE8]" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(prompt);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#FEF2F2] text-[#EF4444] text-left transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 title={prompt.title} className="text-sm font-semibold text-[#17233F] leading-snug mb-2 group-hover:text-[#7655E8] transition-colors truncate">
          {prompt.title}
        </h2>

        {/* Content Preview */}
        <p className="text-xs text-[#525252] leading-relaxed line-clamp-2 whitespace-pre-line font-normal mb-3 font-sans">
          {prompt.content}
        </p>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {prompt.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium text-[#737373] bg-[#F7F7F6] px-2 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-[10px] text-[#A3A3A3] font-medium">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Action button & Notes indicator */}
      <div className="pt-3 border-t border-[#F5F5F3] flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-[#737373]">
          {(() => {
            const rawDate = prompt.createdAt;
            const parsedDate = rawDate ? new Date(rawDate) : null;
            const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
            const formattedDate = isValidDate
              ? parsedDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : null;
            const hasNotes = Boolean(prompt.notes && prompt.notes.trim());

            return (
              <>
                {formattedDate && (
                  <span className="shrink-0 text-[#A3A3A3]">
                    {formattedDate}
                  </span>
                )}
                {hasNotes && (
                  <>
                    {formattedDate && <span className="text-[#A3A3A3] shrink-0">·</span>}
                    <span
                      className="min-w-0 truncate text-[#737373]"
                      title={prompt.notes}
                    >
                      Notes attached
                    </span>
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* Primary Copy Action */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            copied
              ? "bg-[#10B981] text-white"
              : "bg-[#F5F5F3] hover:bg-[#E8DFFF] text-[#17233F] hover:text-[#7655E8]"
          }`}
          title="Copy full prompt to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
