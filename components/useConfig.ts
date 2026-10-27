"use client";

import { useEffect, useState } from "react";

export interface AppConfig {
  liveData: boolean;
  database: boolean;
  ai: boolean;
  email: boolean;
  cron: boolean;
}

let cached: AppConfig | null = null;

export function useConfig(): AppConfig | null {
  const [cfg, setCfg] = useState<AppConfig | null>(cached);
  useEffect(() => {
    if (cached) return;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AppConfig | null) => {
        if (d) {
          cached = d;
          setCfg(d);
        }
      })
      .catch(() => {});
  }, []);
  return cfg;
}
