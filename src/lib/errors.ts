export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMIT_ERROR"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_MIGRATION_FAILED"
  | "UNSUPPORTED_CAPABILITY"
  | "ENGINE_ERROR"
  | "EXPORT_ERROR"
  | "NOT_FOUND";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly recovery?: string;

  constructor(code: AppErrorCode, message: string, recovery?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.recovery = recovery;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, recovery = "Check the input and try again.") {
    super("VALIDATION_ERROR", message, recovery);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string, recovery = "Check your connection and retry.") {
    super("NETWORK_ERROR", message, recovery);
    this.name = "NetworkError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, recovery = "Wait a moment, then retry.") {
    super("RATE_LIMIT_ERROR", message, recovery);
    this.name = "RateLimitError";
  }
}

export class StorageUnavailableError extends AppError {
  constructor(
    message = "Browser storage is unavailable.",
    recovery = "Use a current browser with IndexedDB enabled.",
  ) {
    super("STORAGE_UNAVAILABLE", message, recovery);
    this.name = "StorageUnavailableError";
  }
}

export class StorageQuotaError extends AppError {
  constructor(
    message = "Browser storage is full.",
    recovery = "Remove unused projects or export a backup.",
  ) {
    super("STORAGE_QUOTA_EXCEEDED", message, recovery);
    this.name = "StorageQuotaError";
  }
}

export class StorageMigrationError extends AppError {
  constructor(
    message = "The local database could not be upgraded.",
    recovery = "Export a backup, then clear site data and re-import.",
  ) {
    super("STORAGE_MIGRATION_FAILED", message, recovery);
    this.name = "StorageMigrationError";
  }
}

export class UnsupportedCapabilityError extends AppError {
  constructor(
    message: string,
    recovery = "Try a current Chrome or Edge desktop browser.",
  ) {
    super("UNSUPPORTED_CAPABILITY", message, recovery);
    this.name = "UnsupportedCapabilityError";
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}
