import React from "react";
import { Plus, Menu, ArrowUpDown } from "lucide-react";
import { SortDirection, SortOption } from "../types";

interface HeaderProps {
  title: string;
  count: number;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (option: SortOption, direction: SortDirection) => void;
  onOpenAddPrompt: () => void;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  count,
  sortBy,
  sortDirection,
  onSortChange,
  onOpenAddPrompt,
  onOpenMobileSidebar,
}) => {
  const handleSortSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "updatedAt-desc") onSortChange("updatedAt", "desc");
    else if (val === "updatedAt-asc") onSortChange("updatedAt", "asc");
    else if (val === "createdAt-desc") onSortChange("createdAt", "desc");
    else if (val === "createdAt-asc") onSortChange("createdAt", "asc");
    else if (val === "title-asc") onSortChange("title", "asc");
    else if (val === "title-desc") onSortChange("title", "desc");
  };

  const currentSortValue = `${sortBy}-${sortDirection}`;

  return (
    <header className="sticky top-0 z-10 shrink-0 bg-[#F5F5F3]/90 backdrop-blur-md border-b border-[#EAEAE8] px-4 sm:px-6 lg:px-8 h-[72px]">
      <div className="h-full flex items-center justify-between gap-4">
        {/* Title, Badge & Mobile Menu */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 -ml-1 text-[#171717] hover:bg-white rounded-xl border border-[#EAEAE8] shadow-2xs shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#17233F] truncate">
              {title}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-[#EAEAE8] text-[#737373] tabular-nums font-semibold shadow-2xs shrink-0">
              {count}
            </span>
          </div>
        </div>

        {/* Right Controls: Sort & Add Prompt */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sort Control */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white border border-[#EAEAE8] rounded-xl text-xs font-medium text-[#404040] shadow-2xs hover:bg-[#FBFBFA] transition-colors cursor-pointer">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#737373] shrink-0" />
              <select
                value={currentSortValue}
                onChange={handleSortSelect}
                aria-label="Sort prompts"
                className="bg-transparent text-xs font-medium text-[#171717] focus:outline-none cursor-pointer pr-1"
              >
                <option value="updatedAt-desc">Recently updated</option>
                <option value="updatedAt-asc">Oldest updated</option>
                <option value="createdAt-desc">Recently created</option>
                <option value="createdAt-asc">Oldest created</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={onOpenAddPrompt}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Prompt</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
