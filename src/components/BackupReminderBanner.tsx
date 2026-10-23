import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface BackupReminderBannerProps {
  onDismiss: () => void;
  className?: string;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  onDismiss,
  className = "",
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full mb-5 sm:mb-6 px-4 py-2.5 sm:py-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-3 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#D97706] shrink-0" />
        <p className="text-xs sm:text-sm text-[#92400E] font-medium leading-relaxed">
          Your prompts are saved in this browser. Export a backup before clearing your browser data to avoid losing them.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 sm:p-1.5 text-[#B45309] hover:text-[#78350F] hover:bg-[#FDE68A]/60 rounded-lg transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss backup reminder"
        title="Dismiss reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
