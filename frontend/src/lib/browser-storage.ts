type StorageValues = Record<string, unknown>;

export type StorageChange = { oldValue?: unknown; newValue?: unknown };

type StorageChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: 'local',
) => void;

const PREFIX = 'job-copilot.';
const listeners = new Set<StorageChangeListener>();

function keyFor(key: string): string {
  return `${PREFIX}${key}`;
}

function readValue(rawKey: string): unknown {
  const raw = window.localStorage.getItem(rawKey);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function get(keys?: string | string[] | null): Promise<StorageValues> {
  if (keys === undefined || keys === null) {
    const result: StorageValues = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const rawKey = window.localStorage.key(i);
      if (!rawKey?.startsWith(PREFIX)) continue;
      result[rawKey.slice(PREFIX.length)] = readValue(rawKey);
    }
    return result;
  }
  const keyList = Array.isArray(keys) ? keys : [keys];
  const result: StorageValues = {};
  for (const key of keyList) {
    const value = readValue(keyFor(key));
    if (value !== undefined) result[key] = value;
  }
  return result;
}

async function set(values: StorageValues): Promise<void> {
  const changes: Record<string, StorageChange> = {};
  for (const [key, newValue] of Object.entries(values)) {
    const rawKey = keyFor(key);
    const oldValue = readValue(rawKey);
    window.localStorage.setItem(rawKey, JSON.stringify(newValue));
    changes[key] = { oldValue, newValue };
  }
  emit(changes);
}

async function remove(keys: string | string[]): Promise<void> {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const changes: Record<string, StorageChange> = {};
  for (const key of keyList) {
    const rawKey = keyFor(key);
    const oldValue = readValue(rawKey);
    if (oldValue === undefined) continue;
    window.localStorage.removeItem(rawKey);
    changes[key] = { oldValue, newValue: undefined };
  }
  emit(changes);
}

function emit(changes: Record<string, StorageChange>): void {
  if (Object.keys(changes).length === 0) return;
  for (const listener of listeners) listener(changes, 'local');
}

function addListener(listener: StorageChangeListener): void {
  listeners.add(listener);
}

function removeListener(listener: StorageChangeListener): void {
  listeners.delete(listener);
}

export const browser = {
  storage: {
    local: { get, set, remove },
    onChanged: { addListener, removeListener },
  },
};
