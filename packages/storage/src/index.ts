export interface StorageProvider { exists(key: string): Promise<boolean>; delete(key: string): Promise<void>; }

