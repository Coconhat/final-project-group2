import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

type CachedOptions = {
  ttlMs?: number;
  forceRefresh?: boolean;
};

const CACHE_PREFIX = "app-cache:";
const DEFAULT_TTL_MS = 60_000;
const memoryCache = new Map<string, CacheEntry<unknown>>();
const isWeb = Platform.OS === "web";

const namespacedKey = (key: string) => `${CACHE_PREFIX}${key}`;

const isExpired = (entry: CacheEntry<unknown>) => entry.expiresAt <= Date.now();

const parseStoredEntry = (
  rawValue: string | null,
): CacheEntry<unknown> | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as CacheEntry<unknown>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.expiresAt !== "number" ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const getFromStorage = async (
  key: string,
): Promise<CacheEntry<unknown> | null> => {
  const fullKey = namespacedKey(key);

  try {
    if (isWeb) {
      const rawValue = globalThis.localStorage?.getItem(fullKey) ?? null;
      return parseStoredEntry(rawValue);
    }

    const rawValue = await AsyncStorage.getItem(fullKey);
    return parseStoredEntry(rawValue);
  } catch {
    return null;
  }
};

const removeFromStorage = async (key: string) => {
  const fullKey = namespacedKey(key);

  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(fullKey);
      return;
    }

    await AsyncStorage.removeItem(fullKey);
  } catch {
    // Ignore cache deletion failures.
  }
};

const setInStorage = async <T>(key: string, value: CacheEntry<T>) => {
  const fullKey = namespacedKey(key);

  try {
    const serialized = JSON.stringify(value);
    if (isWeb) {
      globalThis.localStorage?.setItem(fullKey, serialized);
      return;
    }

    await AsyncStorage.setItem(fullKey, serialized);
  } catch {
    // Ignore cache write failures.
  }
};

export const getCachedValue = async <T>(key: string): Promise<T | null> => {
  const inMemory = memoryCache.get(key);
  if (inMemory) {
    if (!isExpired(inMemory)) {
      return inMemory.data as T;
    }

    memoryCache.delete(key);
    await removeFromStorage(key);
  }

  const storedEntry = await getFromStorage(key);
  if (!storedEntry) {
    return null;
  }

  if (isExpired(storedEntry)) {
    await removeFromStorage(key);
    return null;
  }

  memoryCache.set(key, storedEntry);
  return storedEntry.data as T;
};

export const setCachedValue = async <T>(
  key: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
) => {
  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + ttlMs,
  };

  memoryCache.set(key, entry);
  await setInStorage(key, entry);
};

export const getOrSetCachedValue = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedOptions = {},
): Promise<T> => {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = await getCachedValue<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  const freshValue = await fetcher();
  await setCachedValue(key, freshValue, ttlMs);
  return freshValue;
};

export const invalidateCachedKey = async (key: string) => {
  memoryCache.delete(key);
  await removeFromStorage(key);
};

export const invalidateCachedPrefix = async (prefix: string) => {
  const allKeys = Array.from(memoryCache.keys());

  await Promise.all(
    allKeys
      .filter((key) => key.startsWith(prefix))
      .map((key) => invalidateCachedKey(key)),
  );

  if (isWeb) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < (globalThis.localStorage?.length || 0); i += 1) {
        const fullKey = globalThis.localStorage?.key(i);
        if (fullKey?.startsWith(namespacedKey(prefix))) {
          keysToRemove.push(fullKey);
        }
      }
      keysToRemove.forEach((key) => globalThis.localStorage?.removeItem(key));
    } catch {
      // Ignore cache deletion failures.
    }
    return;
  }

  try {
    const persistedKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = persistedKeys.filter((key) =>
      key.startsWith(namespacedKey(prefix)),
    );
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch {
    // Ignore cache deletion failures.
  }
};
