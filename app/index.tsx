import { getOrSetCachedValue } from "@/lib/cache";
import { resolveIsAdmin } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import CategoryFilters, { type RaceFilter } from "@/components/CategoryFilters";
import FloatingActionButton from "@/components/FloatingActionButton";
import Header from "@/components/header";
import HeroSearch from "@/components/HeroSearch";
import PetCardsGrid from "@/components/PetCardsGrid";

const normalizeRequestStatus = (status: string | null | undefined) => {
  const normalized = String(status || "pending").toLowerCase();
  if (
    ["approved", "approve", "confirmed", "accept", "accepted"].includes(
      normalized,
    )
  ) {
    return "completed";
  }
  if (["declined", "decline", "cancelled", "canceled"].includes(normalized)) {
    return "rejected";
  }
  if (
    normalized === "pending" ||
    normalized === "completed" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return "pending";
};

const buildLatestMessageMap = (
  rows: { request_id: string; message: string }[] | null,
) => {
  const latestMap: Record<string, string> = {};
  (rows || []).forEach((row) => {
    if (!latestMap[row.request_id]) {
      latestMap[row.request_id] = row.message;
    }
  });
  return latestMap;
};

const prefetchRequestAndChatCaches = async (userId: string, isAdmin: boolean) => {
  if (isAdmin) {
    await Promise.all([
      getOrSetCachedValue(
        `chat:threads:${userId}`,
        async () => {
          const { data, error } = await supabase
            .from("adoption_requests")
            .select("id, pet_name, status, created_at, full_name, email")
            .order("created_at", { ascending: false });

          if (error) {
            throw error;
          }

          const threads = ((data as any[]) || []).map((request) => ({
            ...request,
            status: normalizeRequestStatus(request.status),
          }));

          const ids = threads.map((thread) => thread.id);
          if (ids.length === 0) {
            return { threads, latestMessages: {} as Record<string, string> };
          }

          const { data: msgRows } = await supabase
            .from("adoption_request_messages")
            .select("request_id, message")
            .in("request_id", ids)
            .order("created_at", { ascending: false });

          return {
            threads,
            latestMessages: buildLatestMessageMap(
              (msgRows as { request_id: string; message: string }[]) || [],
            ),
          };
        },
        { ttlMs: 20_000 },
      ),
      getOrSetCachedValue(
        `requests:${userId}:admin`,
        async () => {
          const { data, error } = await supabase
            .from("adoption_requests")
            .select(
              "id, pet_name, status, created_at, full_name, email, phone, own_or_rent, housing_type, other_housing_type, has_yard, adult_count, child_count, other_pets",
            )
            .order("created_at", { ascending: false });

          if (error) {
            throw error;
          }

          const requests = ((data as any[]) || []).map((request) => ({
            ...request,
            status: normalizeRequestStatus(request.status),
          }));

          const ids = requests.map((request) => request.id);
          if (ids.length === 0) {
            return { requests, latestMessages: {} as Record<string, string> };
          }

          const { data: msgRows } = await supabase
            .from("adoption_request_messages")
            .select("request_id, message")
            .in("request_id", ids)
            .order("created_at", { ascending: false });

          return {
            requests,
            latestMessages: buildLatestMessageMap(
              (msgRows as { request_id: string; message: string }[]) || [],
            ),
          };
        },
        { ttlMs: 20_000 },
      ),
    ]);

    return;
  }

  await getOrSetCachedValue(
    `requests:${userId}:user`,
    async () => {
      const { data, error } = await supabase
        .from("adoption_requests")
        .select("id, pet_name, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const requests = ((data as any[]) || []).map((request) => ({
        ...request,
        status: normalizeRequestStatus(request.status),
      }));

      const ids = requests.map((request) => request.id);
      if (ids.length === 0) {
        return { requests, latestMessages: {} as Record<string, string> };
      }

      const { data: msgRows } = await supabase
        .from("adoption_request_messages")
        .select("request_id, message")
        .in("request_id", ids)
        .order("created_at", { ascending: false });

      return {
        requests,
        latestMessages: buildLatestMessageMap(
          (msgRows as { request_id: string; message: string }[]) || [],
        ),
      };
    },
    { ttlMs: 20_000 },
  );
};

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState<RaceFilter>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const admin = await resolveIsAdmin(user);
        setIsAdmin(admin);

        void prefetchRequestAndChatCaches(user.id, admin).catch((error) => {
          console.warn("[Home] Prefetch failed", error);
        });
      } catch (error) {
        console.warn("[Home] Failed to load role", error);
        setIsAdmin(false);
      }
    };

    void loadRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View className="flex-1 bg-background pb-12">
      <Header />

      <ScrollView
        contentContainerClassName="pt-32 pb-40 px-6"
        showsVerticalScrollIndicator={false}
      >
        <HeroSearch />
        <CategoryFilters
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />
        <PetCardsGrid raceFilter={selectedFilter} />
      </ScrollView>

      {isAdmin && <FloatingActionButton />}
      <BottomNav />
    </View>
  );
}
