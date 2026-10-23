import { Category } from "../types";

export const DEFAULT_CATEGORY_NAMES = [
  "Image Generation",
  "Video Generation",
  "Landing Page",
  "Vibe Coding",
] as const;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-image-gen",
    name: "Image Generation",
    isDefault: true,
    createdAt: "2026-01-01T00:00:04.000Z",
    updatedAt: "2026-01-01T00:00:04.000Z",
  },
  {
    id: "cat-video-gen",
    name: "Video Generation",
    isDefault: true,
    createdAt: "2026-01-01T00:00:03.000Z",
    updatedAt: "2026-01-01T00:00:03.000Z",
  },
  {
    id: "cat-landing-page",
    name: "Landing Page",
    isDefault: true,
    createdAt: "2026-01-01T00:00:02.000Z",
    updatedAt: "2026-01-01T00:00:02.000Z",
  },
  {
    id: "cat-vibe-coding",
    name: "Vibe Coding",
    isDefault: true,
    createdAt: "2026-01-01T00:00:01.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  },
];

/**
 * Sorts categories in newest-created-first order.
 * - Categories with newest `createdAt` appear at the top.
 * - Default categories stay in their designated original order below custom categories.
 * - Deterministic fallback using unique category id if timestamps are missing or equal.
 * - Pure function: returns a new sorted array without mutating input.
 */
export function sortCategories(categories: Category[]): Category[] {
  const DEFAULT_ID_ORDER: Record<string, number> = {
    "cat-image-gen": 0,
    "cat-video-gen": 1,
    "cat-landing-page": 2,
    "cat-vibe-coding": 3,
  };

  const DEFAULT_NAME_ORDER: Record<string, number> = {
    "image generation": 0,
    "video generation": 1,
    "landing page": 2,
    "vibe coding": 3,
  };

  return [...categories].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    const validA = !isNaN(timeA) && timeA > 0;
    const validB = !isNaN(timeB) && timeB > 0;

    // Both have valid timestamps and they differ -> newest created first
    if (validA && validB && timeA !== timeB) {
      return timeB - timeA;
    }

    // Categories with valid creation timestamps come before categories with missing timestamps
    if (validA && !validB) return -1;
    if (!validA && validB) return 1;

    // Tie-break: Default categories preservation
    const orderA = DEFAULT_ID_ORDER[a.id] ?? DEFAULT_NAME_ORDER[a.name.toLowerCase().trim()];
    const orderB = DEFAULT_ID_ORDER[b.id] ?? DEFAULT_NAME_ORDER[b.name.toLowerCase().trim()];

    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) {
      return 1;
    }
    if (orderB !== undefined) {
      return -1;
    }

    // Deterministic fallback by id
    return a.id.localeCompare(b.id);
  });
}
