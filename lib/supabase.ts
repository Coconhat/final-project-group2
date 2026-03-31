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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
