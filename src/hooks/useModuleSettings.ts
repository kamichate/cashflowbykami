import { useState } from 'react';

const KEY = 'module_settings';

const DEFAULTS = {
  goals: true,
  shared: true,
  summary: true,
  payments: true,
};

export type ModuleSettings = typeof DEFAULTS;

export function useModuleSettings() {
  const [settings, setSettings] = useState<ModuleSettings>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return DEFAULTS;
    }
  });

  const toggle = (key: keyof ModuleSettings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { settings, toggle };
}
