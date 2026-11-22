"use client";

import { useEffect, useState } from "react";

export interface BrowserCapabilities {
  webWorker: boolean;
  webCodecs: boolean;
  fileSystemAccess: boolean;
  indexedDb: boolean;
  storageEstimate: boolean;
}

const initialCapabilities: BrowserCapabilities = {
  webWorker: false,
  webCodecs: false,
  fileSystemAccess: false,
  indexedDb: false,
  storageEstimate: false,
};

export function useBrowserCapabilities(): BrowserCapabilities {
  const [capabilities, setCapabilities] =
    useState<BrowserCapabilities>(initialCapabilities);

  useEffect(() => {
    setCapabilities({
      webWorker: typeof Worker !== "undefined",
      webCodecs: typeof VideoEncoder !== "undefined",
      fileSystemAccess: "showSaveFilePicker" in window,
      indexedDb: typeof indexedDB !== "undefined",
      storageEstimate:
        typeof navigator !== "undefined" &&
        typeof navigator.storage?.estimate === "function",
    });
  }, []);

  return capabilities;
}
