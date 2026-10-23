import React from "react";
import {
  Layers,
  Star,
  Plus,
  HardDriveDownload,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Folder,
} from "lucide-react";
import { Category, Prompt } from "../types";
import { Logo } from "./Logo";

interface SidebarProps {
  categories: Category[];
  prompts: Prompt[];
  selectedCategoryId: string | null; // null = all prompts, 'favorites' = favorites, or categoryId
  onSelectCategory: (id: string | null) => void;
  onOpenNewCategory: () => void;
  onOpenManageCategories: () => void;
  onOpenBackup: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  prompts,
  selectedCategoryId,
  onSelectCategory,
  onOpenNewCategory,
  onOpenManageCategories,
  onOpenBackup,
  isOpenMobile,
  onCloseMobile,
}) => {
  const totalCount = prompts.length;
  const favoriteCount = prompts.filter((p) => p.isFavorite).length;

  const getCategoryCount = (catId: string) => {
    return prompts.filter((p) => p.categoryId === catId).length;
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-[72px] shrink-0 border-b border-[#EAEAE8]">
        <Logo size="md" />
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F5F5F3]"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Views */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onSelectCategory(null);
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? "bg-[#17233F] text-white shadow-sm"
                : "text-[#171717] hover:bg-[#F5F5F3]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className={`w-4 h-4 ${selectedCategoryId === null ? "text-[#E8DFFF]" : "text-[#737373]"}`} />
              <span>All Prompts</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full tabular-nums font-semibold ${
                selectedCategoryId === null
                  ? "bg-[#2A3756] text-[#E8DFFF]"
                  : "bg-[#F5F5F3] text-[#737373]"
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectCategory("favorites");
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              selectedCategoryId === "favorites"
                ? "bg-[#17233F] text-white shadow-sm"
                : "text-[#171717] hover:bg-[#F5F5F3]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star
                className={`w-4 h-4 ${
                  selectedCategoryId === "favorites"
                    ? "fill-[#FF963D] text-[#FF963D]"
                    : "text-[#737373]"
                }`}
              />
              <span>Favorites</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full tabular-nums font-semibold ${
                selectedCategoryId === "favorites"
                  ? "bg-[#2A3756] text-[#E8DFFF]"
                  : "bg-[#F5F5F3] text-[#737373]"
              }`}
            >
              {favoriteCount}
            </span>
          </button>
        </div>

        {/* Categories Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Categories
            </span>
            <button
              onClick={onOpenNewCategory}
              className="flex items-center gap-1 text-[11px] font-medium text-[#7655E8] hover:text-[#5F3CD6] p-1 rounded hover:bg-[#F5F5F3] transition-colors"
              title="Add New Category"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-1">
            {categories.map((category) => {
              const count = getCategoryCount(category.id);
              const isSelected = selectedCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelectCategory(category.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                    isSelected
                      ? "bg-[#17233F] text-white shadow-xs"
                      : "text-[#404040] hover:bg-[#F5F5F3] hover:text-[#171717]"
                  }`}
                >
                  <div className="flex items-center min-w-0 pr-1">
                    <span className="truncate">{category.name}</span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full tabular-nums font-semibold ${
                      isSelected
                        ? "bg-[#2A3756] text-[#E8DFFF]"
                        : "text-[#737373] group-hover:text-[#171717]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Utility Actions */}
      <div className="p-3 border-t border-[#EAEAE8] space-y-1">
        <button
          onClick={() => {
            onOpenManageCategories();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#404040] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-xl transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#737373]" />
          <span>Manage Categories</span>
        </button>

        <button
          onClick={() => {
            onOpenBackup();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#404040] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-xl transition-colors"
        >
          <HardDriveDownload className="w-4 h-4 text-[#737373]" />
          <span>Backup & Restore</span>
        </button>

        {/* Local Storage Privacy Pill */}
        <div className="mt-2 pt-2 px-3 pb-1 flex items-center gap-2 text-[11px] text-[#737373]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
          <span className="truncate">Local IndexedDB · 100% Private</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-[#EAEAE8] z-20">
        {navContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
