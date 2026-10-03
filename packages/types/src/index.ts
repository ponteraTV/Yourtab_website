export interface ApiResponse<T> { data: T; requestId: string; }
export interface ApiError { code: string; message: string; requestId: string; }

