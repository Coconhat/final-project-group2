import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "YOUR_SUPABASE_ANON_KEY";

const isWeb = Platform.OS === "web";
const refreshEndpointFragment = "/auth/v1/token?grant_type=refresh_token";
const refreshFailureWindowMs = 30_000;
const maxRefreshFailuresBeforeReset = 2;

let refreshFailureCount = 0;
let refreshFailureWindowStart = 0;
let didClearLocalSession = false;

const hasValidSupabaseConfig =
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("YOUR_SUPABASE_URL") &&
  !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

if (!hasValidSupabaseConfig) {
  console.error(
    "[Supabase] Missing or invalid env config. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

const resolveInputUrl = (input: string | URL | Request) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (input && typeof input === "object" && "url" in input) {
    return String((input as { url?: string }).url || "unknown-url");
  }

  return "unknown-url";
};

const getProjectRef = () => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
};

const clearStoredSession = async () => {
  const projectRef = getProjectRef();
  if (!projectRef) {
    return;
  }

  const storageKey = `sb-${projectRef}-auth-token`;

  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(storageKey);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
    console.warn(
      "[Supabase] Cleared local session after repeated refresh-token network failures. Please sign in again.",
    );
  } catch (storageError) {
    console.warn("[Supabase] Failed to clear local auth session", storageError);
  }
};

const handleRefreshFailure = async (url: string) => {
  if (!url.includes(refreshEndpointFragment)) {
    return;
  }

  const now = Date.now();
  if (now - refreshFailureWindowStart > refreshFailureWindowMs) {
    refreshFailureWindowStart = now;
    refreshFailureCount = 0;
  }

  refreshFailureCount += 1;

  if (
    didClearLocalSession ||
    refreshFailureCount < maxRefreshFailuresBeforeReset
  ) {
    return;
  }

  didClearLocalSession = true;
  await clearStoredSession();
};

const diagnosticFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    const method = init?.method || "GET";
    const url = resolveInputUrl(input);
    console.error(`[Supabase] Network request failed: ${method} ${url}`);
    await handleRefreshFailure(url);
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: diagnosticFetch,
  },
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
