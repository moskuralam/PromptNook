import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  offsetBottom?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  offsetBottom = "bottom-5",
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className={`fixed ${offsetBottom} right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none transition-all duration-200`}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-[#17233F] text-white rounded-xl shadow-lg border border-[#2A3756] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-4 h-4 text-[#7655E8] shrink-0" />
            )}
            <p className="text-xs font-medium truncate">{toast.message}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
