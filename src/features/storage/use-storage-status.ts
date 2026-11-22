"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStorageEstimate,
  requestPersistentStorage,
} from "@/features/storage/db";

export interface StorageStatus {
  state: "loading" | "ready" | "unavailable" | "error";
  usage: number;
  quota: number;
  persisted: boolean;
  message?: string;
}

export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus>({
    state: "loading",
    usage: 0,
    quota: 0,
    persisted: false,
  });

  const refresh = useCallback(async () => {
    try {
      const estimate = await getStorageEstimate();
      if (!estimate) {
        setStatus({
          state: "unavailable",
          usage: 0,
          quota: 0,
          persisted: false,
          message: "Storage estimate is not available in this browser.",
        });
        return;
      }
      const persisted = navigator.storage?.persisted
        ? await navigator.storage.persisted()
        : false;
      setStatus({
        state: "ready",
        usage: estimate.usage,
        quota: estimate.quota,
        persisted,
      });
    } catch {
      setStatus({
        state: "error",
        usage: 0,
        quota: 0,
        persisted: false,
        message: "The browser could not read storage usage.",
      });
    }
  }, []);

  const requestPersistence = useCallback(async () => {
    const persisted = await requestPersistentStorage();
    setStatus((current) => ({ ...current, persisted }));
    return persisted;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, refresh, requestPersistence };
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** index;
  return `${amount.toFixed(amount >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
