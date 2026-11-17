import { useSyncExternalStore } from 'react';

const KEY = 'module_settings';

const DEFAULTS = {
  goals: true,
  shared: true,
  summary: true,
  payments: true,
  cards: true,
};

export type ModuleSettings = typeof DEFAULTS;

function read(): ModuleSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

// Shared store: every component that reads the settings sees the same object,
// so switching a module on/off updates the navigation right away.
let current: ModuleSettings = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

export function useModuleSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);

  const toggle = (key: keyof ModuleSettings) => {
    current = { ...current, [key]: !current[key] };
    localStorage.setItem(KEY, JSON.stringify(current));
    listeners.forEach((l) => l());
  };

  return { settings, toggle };
}
