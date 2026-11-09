import type { ApiResponse, PaginatedResult, PaginationMeta } from '../types/api.js';

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number,
): ApiResponse<PaginatedResult<T>> {
  return createSuccessResponse({
    items,
    meta: buildPaginationMeta(page, limit, totalItems),
  });
}
