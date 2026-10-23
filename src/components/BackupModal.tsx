import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileJson,
  RefreshCw,
  Layers,
  RotateCcw,
} from "lucide-react";
import { BackupData, Prompt, Category } from "../types";
import { dbService } from "../services/db";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  onResetData: () => Promise<void>;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onResetData,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [postResetRefreshError, setPostResetRefreshError] = useState<string | null>(null);

  // Import state
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<BackupData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [postImportRefreshError, setPostImportRefreshError] = useState<{
    message: string;
    importedPrompts: number;
    importedCategories: number;
  } | null>(null);
  const [isRetryingRefresh, setIsRetryingRefresh] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPostImportRefreshError(null);
      setIsRetryingRefresh(false);
      setValidationError(null);
      setParsedData(null);
      setFileName("");
      setFileContent(null);
      setReplaceConfirmed(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await dbService.exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().split("T")[0];
      const link = document.createElement("a");
      link.href = url;
      link.download = `promptnook-backup-${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onNotify(`Backup exported successfully (${data.prompts.length} prompts)!`, "success");
    } catch {
      onNotify("Failed to export backup. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidationError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setFileContent(text);
        validateAndParse(text);
      } catch (err) {
        setValidationError("Failed to read the file. Please ensure it is a valid text JSON file.");
      }
    };
    reader.onerror = () => {
      setValidationError("Error reading file from disk.");
    };
    reader.readAsText(file);
  };

  const validateAndParse = (rawText: string) => {
    try {
      if (!rawText || !rawText.trim()) {
        throw new Error("The selected file is empty.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error("Invalid JSON format. Please ensure the file contains valid JSON.");
      }

      // 1. Structure check
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid backup: Root must be a valid JSON object.");
      }

      const backup = parsed as Record<string, unknown>;

      if (backup.app !== "PromptNook") {
        throw new Error(
          `Invalid backup: Expected app identifier 'PromptNook', found '${backup.app || "unknown"}'.`
        );
      }

      if (typeof backup.formatVersion !== "number" || backup.formatVersion !== 1) {
        throw new Error(
          `Unsupported backup format version (${backup.formatVersion}). Only version 1 is supported.`
        );
      }

      if (
        typeof backup.exportedAt !== "string" ||
        !backup.exportedAt.trim() ||
        isNaN(new Date(backup.exportedAt).getTime())
      ) {
        throw new Error("Invalid backup: 'exportedAt' must be a valid ISO date timestamp.");
      }

      if (!Array.isArray(backup.categories)) {
        throw new Error("Invalid backup: Missing or invalid 'categories' list.");
      }

      if (!Array.isArray(backup.prompts)) {
        throw new Error("Invalid backup: Missing or invalid 'prompts' list.");
      }

      // 2. Validate categories
      const categoryIdSet = new Set<string>();
      const validatedCategories: Category[] = [];

      for (let i = 0; i < backup.categories.length; i++) {
        const c = backup.categories[i];
        if (!c || typeof c !== "object" || Array.isArray(c)) {
          throw new Error(`Invalid category at position ${i + 1}: Record must be an object.`);
        }
        const cat = c as Record<string, unknown>;
        if (typeof cat.id !== "string" || !cat.id.trim()) {
          throw new Error(
            `Invalid category at position ${i + 1}: Category ID is required and must be a non-empty string.`
          );
        }
        const trimmedCatId = cat.id.trim();
        if (categoryIdSet.has(trimmedCatId)) {
          throw new Error(`Invalid backup: Duplicate category ID '${trimmedCatId}' found.`);
        }
        if (typeof cat.name !== "string" || !cat.name.trim()) {
          throw new Error(
            `Invalid category at position ${i + 1}: Category name is required and cannot be empty.`
          );
        }
        if (cat.isDefault !== undefined && typeof cat.isDefault !== "boolean") {
          throw new Error(`Invalid category "${cat.name}": 'isDefault' must be a boolean.`);
        }

        // Timestamps validation with explicit legacy compatibility handling
        let catCreatedAt = cat.createdAt;
        let catUpdatedAt = cat.updatedAt;
        if (catCreatedAt === undefined && catUpdatedAt !== undefined) {
          catCreatedAt = catUpdatedAt;
        } else if (catCreatedAt !== undefined && catUpdatedAt === undefined) {
          catUpdatedAt = catCreatedAt;
        }
        if (typeof catCreatedAt !== "string" || isNaN(new Date(catCreatedAt).getTime())) {
          throw new Error(`Invalid category "${cat.name}": 'createdAt' must be a valid ISO date timestamp.`);
        }
        if (typeof catUpdatedAt !== "string" || isNaN(new Date(catUpdatedAt).getTime())) {
          throw new Error(`Invalid category "${cat.name}": 'updatedAt' must be a valid ISO date timestamp.`);
        }

        categoryIdSet.add(trimmedCatId);
        validatedCategories.push({
          id: trimmedCatId,
          name: cat.name.trim(),
          color: typeof cat.color === "string" ? cat.color : undefined,
          isDefault: typeof cat.isDefault === "boolean" ? cat.isDefault : false,
          createdAt: new Date(catCreatedAt).toISOString(),
          updatedAt: new Date(catUpdatedAt).toISOString(),
        });
      }

      // 3. Validate prompts
      const promptIdSet = new Set<string>();
      const validatedPrompts: Prompt[] = [];

      for (let i = 0; i < backup.prompts.length; i++) {
        const p = backup.prompts[i];
        if (!p || typeof p !== "object" || Array.isArray(p)) {
          throw new Error(`Invalid prompt at position ${i + 1}: Record must be an object.`);
        }
        const prompt = p as Record<string, unknown>;
        if (typeof prompt.id !== "string" || !prompt.id.trim()) {
          throw new Error(
            `Invalid prompt at position ${i + 1}: Prompt ID is required and must be a non-empty string.`
          );
        }
        const trimmedPromptId = prompt.id.trim();
        if (promptIdSet.has(trimmedPromptId)) {
          throw new Error(`Invalid backup: Duplicate prompt ID '${trimmedPromptId}' found.`);
        }
        if (typeof prompt.title !== "string" || !prompt.title.trim()) {
          throw new Error(
            `Invalid prompt at position ${i + 1}: Prompt title is required and cannot be empty.`
          );
        }
        if (typeof prompt.content !== "string") {
          throw new Error(
            `Invalid prompt "${prompt.title}": Prompt content is required and must be a string.`
          );
        }
        if (typeof prompt.categoryId !== "string" || !prompt.categoryId.trim()) {
          throw new Error(`Invalid prompt "${prompt.title}": Prompt must be associated with a valid category ID.`);
        }
        const trimmedCatId = prompt.categoryId.trim();
        if (!categoryIdSet.has(trimmedCatId)) {
          throw new Error(
            `Invalid prompt "${prompt.title}": Category ID "${prompt.categoryId}" does not exist in the backup categories.`
          );
        }
        if (prompt.notes !== undefined && typeof prompt.notes !== "string") {
          throw new Error(`Invalid prompt "${prompt.title}": 'notes' must be a string.`);
        }
        if (prompt.isFavorite !== undefined && typeof prompt.isFavorite !== "boolean") {
          throw new Error(`Invalid prompt "${prompt.title}": 'isFavorite' must be a boolean.`);
        }
        if (prompt.tags !== undefined) {
          if (!Array.isArray(prompt.tags) || prompt.tags.some((t) => typeof t !== "string")) {
            throw new Error(`Invalid prompt "${prompt.title}": 'tags' must be a list of strings.`);
          }
        }

        // Timestamps validation with explicit legacy compatibility handling
        let pCreatedAt = prompt.createdAt;
        let pUpdatedAt = prompt.updatedAt;
        if (pCreatedAt === undefined && pUpdatedAt !== undefined) {
          pCreatedAt = pUpdatedAt;
        } else if (pCreatedAt !== undefined && pUpdatedAt === undefined) {
          pUpdatedAt = pCreatedAt;
        }
        if (typeof pCreatedAt !== "string" || isNaN(new Date(pCreatedAt).getTime())) {
          throw new Error(`Invalid prompt "${prompt.title}": 'createdAt' must be a valid ISO date timestamp.`);
        }
        if (typeof pUpdatedAt !== "string" || isNaN(new Date(pUpdatedAt).getTime())) {
          throw new Error(`Invalid prompt "${prompt.title}": 'updatedAt' must be a valid ISO date timestamp.`);
        }

        promptIdSet.add(trimmedPromptId);
        validatedPrompts.push({
          id: trimmedPromptId,
          title: prompt.title.trim(),
          content: prompt.content,
          categoryId: trimmedCatId,
          tags: Array.isArray(prompt.tags) ? prompt.tags.filter((t): t is string => typeof t === "string") : [],
          notes: typeof prompt.notes === "string" ? prompt.notes : "",
          isFavorite: typeof prompt.isFavorite === "boolean" ? prompt.isFavorite : false,
          createdAt: new Date(pCreatedAt).toISOString(),
          updatedAt: new Date(pUpdatedAt).toISOString(),
        });
      }

      // 4. Validate settings if present
      let validatedSettings: BackupData["settings"] = undefined;
      if (backup.settings !== undefined) {
        if (!backup.settings || typeof backup.settings !== "object" || Array.isArray(backup.settings)) {
          throw new Error("Invalid backup: 'settings' must be an object if present.");
        }
        const s = backup.settings as Record<string, unknown>;
        const allowedSettingsKeys = new Set([
          "id",
          "schemaVersion",
          "sortBy",
          "sortDirection",
          "categoriesInitialized",
          "lastBackupAt",
          "backupReminderDismissed",
        ]);

        for (const key of Object.keys(s)) {
          if (!allowedSettingsKeys.has(key)) {
            throw new Error(`Invalid backup settings: Unrecognized setting '${key}'.`);
          }
        }

        if (s.id !== undefined && s.id !== "app") {
          throw new Error("Invalid backup settings: 'id' must be the string 'app'.");
        }
        if (s.schemaVersion !== undefined && (typeof s.schemaVersion !== "number" || s.schemaVersion !== 1)) {
          throw new Error("Invalid backup settings: 'schemaVersion' must be the number 1.");
        }
        if (s.sortBy !== undefined && !["updatedAt", "createdAt", "title"].includes(s.sortBy as string)) {
          throw new Error("Invalid backup settings: 'sortBy' must be 'updatedAt', 'createdAt', or 'title'.");
        }
        if (s.sortDirection !== undefined && !["asc", "desc"].includes(s.sortDirection as string)) {
          throw new Error("Invalid backup settings: 'sortDirection' must be 'asc' or 'desc'.");
        }
        if (s.categoriesInitialized !== undefined && typeof s.categoriesInitialized !== "boolean") {
          throw new Error("Invalid backup settings: 'categoriesInitialized' must be a boolean.");
        }
        if (s.lastBackupAt !== undefined) {
          if (
            typeof s.lastBackupAt !== "string" ||
            !s.lastBackupAt.trim() ||
            isNaN(new Date(s.lastBackupAt).getTime())
          ) {
            throw new Error("Invalid backup settings: 'lastBackupAt' must be a valid ISO date timestamp string.");
          }
        }
        if (s.backupReminderDismissed !== undefined && typeof s.backupReminderDismissed !== "boolean") {
          throw new Error("Invalid backup settings: 'backupReminderDismissed' must be a boolean.");
        }

        validatedSettings = {
          id: "app",
          schemaVersion: 1,
          sortBy: s.sortBy as "updatedAt" | "createdAt" | "title" | undefined,
          sortDirection: s.sortDirection as "asc" | "desc" | undefined,
          categoriesInitialized: s.categoriesInitialized,
          lastBackupAt: typeof s.lastBackupAt === "string" ? new Date(s.lastBackupAt).toISOString() : undefined,
          backupReminderDismissed: typeof s.backupReminderDismissed === "boolean" ? s.backupReminderDismissed : undefined,
        };
      }

      const validatedBackup: BackupData = {
        app: "PromptNook",
        formatVersion: 1,
        exportedAt: new Date(backup.exportedAt).toISOString(),
        categories: validatedCategories,
        prompts: validatedPrompts,
        settings: validatedSettings,
      };

      setParsedData(validatedBackup);
      setValidationError(null);
    } catch (err) {
      setParsedData(null);
      setValidationError(err instanceof Error ? err.message : "Validation failed.");
    }
  };

  const handleImportSubmit = async () => {
    if (!parsedData || isImporting || postImportRefreshError) return;
    if (importMode === "replace" && !replaceConfirmed) {
      setValidationError("Please check the confirmation box to replace your entire library.");
      return;
    }

    setIsImporting(true);
    let importResult: { importedPrompts: number; importedCategories: number } | null = null;
    try {
      importResult = await dbService.importData(parsedData, importMode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import backup into database.";
      setValidationError(msg);
      onNotify("Import failed. Stored data was not modified.", "error");
      setIsImporting(false);
      return;
    }

    // Database import succeeded. Now refresh UI state.
    try {
      await onRefreshData();
      onNotify(
        `Successfully restored ${importResult.importedPrompts} prompts and ${importResult.importedCategories} categories!`,
        "success"
      );
      onClose();
    } catch (err) {
      const refreshErrorMsg = err instanceof Error ? err.message : "Screen refresh failed.";
      setPostImportRefreshError({
        message: refreshErrorMsg,
        importedPrompts: importResult.importedPrompts,
        importedCategories: importResult.importedCategories,
      });
      setValidationError(null);
      onNotify(
        `Data was imported successfully (${importResult.importedPrompts} prompts, ${importResult.importedCategories} categories), but could not refresh the screen.`,
        "error"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetryRefresh = async () => {
    if (isRetryingRefresh) return;
    setIsRetryingRefresh(true);
    try {
      await onRefreshData();
      const countInfo = postImportRefreshError;
      setPostImportRefreshError(null);
      onNotify(
        countInfo
          ? `Successfully restored and refreshed ${countInfo.importedPrompts} prompts and ${countInfo.importedCategories} categories!`
          : "Successfully refreshed library!",
        "success"
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh screen.";
      if (postImportRefreshError) {
        setPostImportRefreshError({
          ...postImportRefreshError,
          message: msg,
        });
      }
      onNotify("Screen refresh failed. Please reload the page.", "error");
    } finally {
      setIsRetryingRefresh(false);
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleConfirmReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    setResetError(null);
    setPostResetRefreshError(null);

    try {
      await onResetData();
      setIsResetConfirmOpen(false);
      onClose();
    } catch (err: any) {
      if (err?.isPostResetRefreshFailure) {
        // Reset succeeded in the database! Do not report that reset failed.
        setIsResetConfirmOpen(false);
        const msg = err.message || "Database reset succeeded, but library display could not be refreshed.";
        setPostResetRefreshError(msg);
      } else {
        // Reset transaction failed; stored data was not modified. Keep dialog open for retry.
        const msg = err instanceof Error ? err.message : "Failed to reset data. Please try again.";
        setResetError(msg);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white border border-[#EAEAE8] rounded-2xl shadow-xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAE8]">
          <div className="flex items-center gap-2">
            <h2 id="backup-modal-title" className="text-base font-bold text-[#17233F]">
              Backup & Restore
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#EAEAE8] px-6 bg-[#F7F7F6]">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "export"
                ? "border-[#7655E8] text-[#7655E8]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Export Backup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "import"
                ? "border-[#7655E8] text-[#7655E8]"
                : "border-transparent text-[#737373] hover:text-[#171717]"
            }`}
          >
            Import & Restore
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {postResetRefreshError && (
            <div className="mb-5 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start justify-between gap-3 text-xs text-[#DC2626]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#991B1B]">Database Reset Succeeded</p>
                  <p className="mt-0.5 text-[#B91C1C]">
                    All data was successfully reset in the database, but reloading the library display failed ({postResetRefreshError}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onRefreshData();
                    setPostResetRefreshError(null);
                    onNotify("Library refreshed successfully!", "success");
                    onClose();
                  } catch {
                    onNotify("Refresh failed. Please reload the page.", "error");
                  }
                }}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Retry Reload
              </button>
            </div>
          )}

          {activeTab === "export" ? (
            <div className="space-y-5">
              <div className="p-4 bg-[#F7F7F6] border border-[#EAEAE8] rounded-xl flex items-start gap-3">
                <FileJson className="w-5 h-5 text-[#7655E8] shrink-0 mt-0.5" />
                <div className="text-xs text-[#525252] leading-relaxed">
                  <p className="font-semibold text-[#171717] mb-1">
                    Download Your Complete Library JSON
                  </p>
                  <p>
                    Because PromptNook keeps 100% of your data private inside your browser's IndexedDB, exporting regular backups ensures you can transfer prompts across devices or recover them anytime.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#EAEAE8] rounded-2xl bg-[#FAF9F7] text-center">
                <Download className="w-10 h-10 text-[#7655E8] mb-3" />
                <h3 className="text-sm font-bold text-[#17233F] mb-1">
                  Ready to export PromptNook data?
                </h3>
                <p className="text-xs text-[#737373] max-w-sm mb-5">
                  Downloads all of your saved prompts, categories, notes, and preferences formatted for safe restore.
                </p>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? "Generating Backup..." : "Download JSON Backup"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Post-import refresh failure recovery banner */}
              {postImportRefreshError ? (
                <div className="p-5 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                      <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold text-[#92400E] text-sm">
                        Backup Imported Successfully
                      </p>
                      <p className="mt-1 text-[#78350F] leading-relaxed">
                        Data was successfully saved to your browser database (
                        <span className="font-semibold text-[#92400E]">
                          {postImportRefreshError.importedPrompts} prompt{postImportRefreshError.importedPrompts === 1 ? "" : "s"}, {postImportRefreshError.importedCategories} categor{postImportRefreshError.importedCategories === 1 ? "y" : "ies"}
                        </span>
                        ), but the interface could not automatically refresh ({postImportRefreshError.message}).
                      </p>
                      <p className="mt-2 text-[#B45309] font-medium leading-relaxed bg-[#FEF3C7]/60 p-2.5 rounded-lg border border-[#FDE68A]/60">
                        <strong>Stored data is already saved.</strong> Re-submitting the backup has been disabled to prevent duplicate prompts. Please retry refreshing or reload the page.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#FDE68A]">
                    <button
                      type="button"
                      onClick={handleRetryRefresh}
                      disabled={isRetryingRefresh}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#7655E8] hover:bg-[#6242D6] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingRefresh ? "animate-spin" : ""}`} />
                      <span>{isRetryingRefresh ? "Refreshing Screen..." : "Retry Refresh"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReloadPage}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D4D4D4] hover:bg-[#F5F5F3] text-[#171717] text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#525252]" />
                      <span>Reload Page</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* File upload picker */}
                  <div>
                    <label className="block text-xs font-semibold text-[#171717] mb-2">
                      Select PromptNook JSON File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#EAEAE8] hover:border-[#7655E8] rounded-2xl bg-[#FAF9F7] hover:bg-white text-center cursor-pointer transition-colors"
                    >
                      <Upload className="w-8 h-8 text-[#7655E8] mb-2" />
                      <p className="text-xs font-semibold text-[#171717]">
                        {fileName ? fileName : "Click to select backup JSON file"}
                      </p>
                      <p className="text-[11px] text-[#737373] mt-1">
                        Valid PromptNook formatVersion: 1
                      </p>
                    </div>
                  </div>

                  {/* Validation Error */}
                  {validationError && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Validation Error: </span>
                        <span>{validationError}</span>
                      </div>
                    </div>
                  )}

                  {/* Parsed Preview */}
                  {parsedData && (
                    <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#166534]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Backup Verified Valid</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                          <span className="text-[#737373] block text-[11px]">Prompts to Restore</span>
                          <span className="text-base font-bold text-[#171717] tabular-nums">
                            {parsedData.prompts.length}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                          <span className="text-[#737373] block text-[11px]">Categories</span>
                          <span className="text-base font-bold text-[#171717] tabular-nums">
                            {parsedData.categories.length}
                          </span>
                        </div>
                      </div>

                      {/* Mode Selector */}
                      <div className="pt-2 border-t border-[#DCFCE7] space-y-2">
                        <span className="block text-xs font-bold text-[#171717]">
                          Restore Strategy:
                        </span>

                        <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-[#BBF7D0] cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === "merge"}
                            onChange={() => setImportMode("merge")}
                            className="mt-0.5 text-[#7655E8]"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-[#171717] block">
                              Merge with existing library (Recommended)
                            </span>
                            <span className="text-[#525252]">
                              Adds records from the file without wiping your current prompts. Colliding IDs are preserved safely.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-[#FECACA] cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === "replace"}
                            onChange={() => setImportMode("replace")}
                            className="mt-0.5 text-[#EF4444]"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-[#DC2626] block">
                              Replace Entire Library
                            </span>
                            <span className="text-[#525252]">
                              Erases current local library and overwrites with the contents of this backup file.
                            </span>
                          </div>
                        </label>

                        {importMode === "replace" && (
                          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2 text-xs text-[#991B1B]">
                            <input
                              type="checkbox"
                              id="confirm-replace"
                              checked={replaceConfirmed}
                              onChange={(e) => setReplaceConfirmed(e.target.checked)}
                              className="mt-0.5"
                            />
                            <label htmlFor="confirm-replace" className="cursor-pointer font-medium leading-tight">
                              I understand this will permanently replace all my current prompts with the backup file.
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#EAEAE8] bg-[#F7F7F6] rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#404040] hover:text-[#171717] hover:bg-[#EAEAE8] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <div className="h-4 w-px bg-[#E5E5E3]" />
            <button
              type="button"
              onClick={() => {
                setResetError(null);
                setIsResetConfirmOpen(true);
              }}
              className="group flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#DC2626] hover:text-[#B91C1C] hover:bg-red-100/70 rounded-xl transition-colors cursor-pointer"
              title="Delete all saved prompts, categories, and preferences from this browser."
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#DC2626] group-hover:-rotate-45 transition-transform" />
              <span>Reset Data</span>
            </button>
          </div>

          {activeTab === "import" && postImportRefreshError ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReloadPage}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAEAE8] hover:bg-[#F5F5F3] text-[#171717] text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#525252]" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={handleRetryRefresh}
                disabled={isRetryingRefresh}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#7655E8] hover:bg-[#6242D6] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingRefresh ? "animate-spin" : ""}`} />
                <span>{isRetryingRefresh ? "Refreshing..." : "Retry Refresh"}</span>
              </button>
            </div>
          ) : (
            activeTab === "import" && parsedData && (
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isImporting || (importMode === "replace" && !replaceConfirmed)}
                className="flex items-center gap-2 px-5 py-2 bg-[#7655E8] hover:bg-[#6242D6] active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Restore {importMode === "merge" ? "via Merge" : "and Replace"}</span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isResetting) setIsResetConfirmOpen(false);
          }}
        >
          <div className="bg-white border border-[#EAEAE8] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0 border border-[#FEE2E2]">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="reset-dialog-title" className="text-base font-bold text-[#17233F]">
                  Reset all PromptNook data?
                </h2>
                <p className="text-xs text-[#525252] mt-1.5 leading-relaxed">
                  This will permanently delete all prompts, custom categories, favorites, and saved preferences stored in this browser. This action cannot be undone.
                </p>
              </div>
            </div>

            {resetError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAEAE8]">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#404040] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] active:scale-[0.98] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
