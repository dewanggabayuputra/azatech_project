export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  errors?: Record<string, string[]>;
}

export function successResponse<T>(
  data: T,
  message = 'OK',
): ApiResponse<T> {
  return { success: true, message, data };
}