import { getOrSetCachedValue, invalidateCachedPrefix } from "@/lib/cache";
import { supabase } from "@/lib/supabase";

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

const getRoleCacheKey = (userId: string) => `role:${userId}`;

export const resolveIsAdmin = async (
  user: { id: string; user_metadata?: Record<string, unknown> } | null,
): Promise<boolean> => {
  if (!user) {
    return false;
  }

  const roleFromMetadata =
    typeof user.user_metadata?.role === "string"
      ? String(user.user_metadata.role).toLowerCase()
      : null;

  if (roleFromMetadata === "admin") {
    return true;
  }

  const role = await getOrSetCachedValue<string | null>(
    getRoleCacheKey(user.id),
    async () => {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      return typeof profile?.role === "string"
        ? profile.role.toLowerCase()
        : null;
    },
    { ttlMs: ROLE_CACHE_TTL_MS },
  );

  return role === "admin";
};

export const invalidateRoleCache = async (userId?: string | null) => {
  if (userId) {
    await invalidateCachedPrefix(`role:${userId}`);
    return;
  }

  await invalidateCachedPrefix("role:");
};
