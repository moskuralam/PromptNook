import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  promptTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  promptTitle,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white border border-[#EAEAE8] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="delete-dialog-title" className="text-base font-bold text-[#17233F]">
              Delete Prompt?
            </h2>
            <p className="text-xs text-[#737373]">
              This action removes the prompt from your local library.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#FAF9F7] border border-[#EAEAE8] rounded-xl mb-5">
          <p className="text-xs font-semibold text-[#171717] break-words line-clamp-2">
            "{promptTitle}"
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#404040] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Prompt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
