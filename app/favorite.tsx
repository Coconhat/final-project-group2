import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNav from "@/components/BottomNav";
import Header from "@/components/header";
import { getOrSetCachedValue, invalidateCachedPrefix } from "@/lib/cache";
import { getPrimaryPetImageUrl } from "@/lib/petImages";
import { resolveIsAdmin } from "@/lib/roles";

const USER_REQUEST_STATUS_CACHE_PREFIX = "requests:user-pet-status:";

const buildUserRequestStatusMap = (
  rows: { pet_id: string | null; status: string | null }[],
) => {
  const map: Record<string, string> = {};

  rows.forEach((row) => {
    if (!row.pet_id) {
      return;
    }

    const petId = String(row.pet_id);
    const status = String(row.status || "pending").toLowerCase();
    if (!(petId in map)) {
      map[petId] = status;
    }
  });

  return map;
};

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestStatusByPetId, setRequestStatusByPetId] = useState<
    Record<string, string>
  >({});
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const loadRole = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const requestStatusCacheKey =
              `${USER_REQUEST_STATUS_CACHE_PREFIX}${user.id}`;
            const cachedRequestStatus = await getOrSetCachedValue<
              Record<string, string>
            >(
              requestStatusCacheKey,
              async () => {
                const { data, error } = await supabase
                  .from("adoption_requests")
                  .select("pet_id, status")
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false });

                if (error) {
                  throw error;
                }

                return buildUserRequestStatusMap(
                  ((data as {
                    pet_id: string | null;
                    status: string | null;
                  }[]) || []),
                );
              },
              { ttlMs: 20_000 },
            );

            setRequestStatusByPetId(cachedRequestStatus);
          } else {
            setRequestStatusByPetId({});
          }

          setIsAdmin(await resolveIsAdmin(user));
        } catch {
          setIsAdmin(false);
          setRequestStatusByPetId({});
        }
      };

      void loadRole();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const fetchFavorites = async () => {
        try {
          const data = await getOrSetCachedValue<any[]>(
            "pets:favorites:v1",
            async () => {
              const { data: favoriteData, error } = await supabase
                .from("pets")
                .select("*")
                .eq("is_favorite", true);

              if (error) {
                throw error;
              }

              return favoriteData || [];
            },
            { ttlMs: 30_000 },
          );
          setFavorites(data);
        } catch (error) {
          console.error("Error fetching favorites:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchFavorites();
    }, []),
  );

  const toggleFavorite = async (id: string) => {
    setFavorites((currentFavs) => currentFavs.filter((pet) => pet.id !== id));

    const { error } = await supabase
      .from("pets")
      .update({ is_favorite: false })
      .eq("id", id);

    if (error) {
      console.error("Error updating favorite status:", error);
      return;
    }

    await invalidateCachedPrefix("pets:");
  };

  const renderItem = ({ item }: { item: any }) => {
    const defaultImage = getPrimaryPetImageUrl(item);
    const requestStatus = requestStatusByPetId[String(item.id)];
    const hasRequested = !!requestStatus;
    const isInProcess = requestStatus === "pending";

    return (
      <View className="bg-surface-container-highest rounded-xl overflow-hidden shadow-none mb-6">
        <View className="h-64 relative overflow-hidden">
          {defaultImage ? (
            <Image
              source={{ uri: defaultImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-surface-container-low">
              <MaterialIcons name="pets" size={48} color="#a79a96" />
            </View>
          )}
          <TouchableOpacity
            className="absolute top-4 right-4 bg-white/90 p-3 rounded-full justify-center items-center"
            onPress={() => toggleFavorite(item.id)}
          >
            <MaterialIcons name="favorite" size={24} color="#a04223" />
          </TouchableOpacity>
        </View>
        <View className="p-8">
          <View className="flex-row gap-2 mb-4">
            {item.tags?.map((tag: string, idx: number) => (
              <View
                key={idx}
                className="px-3 py-1 bg-surface-container rounded-full"
              >
                <Text className="text-primary text-[10px] font-bold uppercase">
                  {tag}
                </Text>
              </View>
            ))}
            {item.vaccinated && (
              <View className="px-3 py-1 bg-surface-container rounded-full">
                <Text className="text-primary text-[10px] font-bold uppercase">
                  Vaccinated
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row justify-between items-start mb-2">
            <Text className="font-headline text-2xl font-bold text-on-surface">
              {item.name}
            </Text>
            {item.size && (
              <Text className="text-secondary font-bold text-sm">
                {item.size}
              </Text>
            )}
          </View>
          <Text className="font-body text-on-surface-variant mb-6 text-sm leading-relaxed">
            {item.description || `${item.breed} � ${item.age}`}
          </Text>
          {hasRequested && (
            <View className="bg-primary/15 px-3 py-1 rounded-full self-start mb-3">
              <Text className="text-primary text-[10px] font-bold uppercase">
                {isInProcess ? "IN PROCESS" : "REQUESTED"}
              </Text>
            </View>
          )}
          {!isAdmin && (
            <TouchableOpacity
              className={`flex-row items-center gap-2 mt-auto ${
                hasRequested ? "opacity-60" : ""
              }`}
              onPress={() => router.push(`/pet/${item.id}`)}
              disabled={hasRequested}
            >
              <Text
                className={`font-bold text-sm ${
                  hasRequested ? "text-on-surface-variant" : "text-primary"
                }`}
              >
                {hasRequested
                  ? isInProcess
                    ? "In Process"
                    : "Requested"
                  : "Adopt Me"}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color="#a04223" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background pb-12">
      <Header />

      <ScrollView
        contentContainerClassName="pt-32 pb-40 px-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10">
          <Text className="font-headline text-4xl font-extrabold text-on-background leading-tight">
            Your Saved{"\n"}
            <Text className="text-primary">Companions</Text>
          </Text>
          <Text className="font-body text-on-surface-variant mt-2 max-w-xs">
            A curated collection of the pets that captured your heart.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fd8863" className="mt-10" />
        ) : favorites.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-on-surface-variant text-lg">
              No favorites yet.
            </Text>
            <Text className="text-on-surface-variant/60 text-sm mt-2">
              Go back and click some hearts!
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-6">
            {favorites.map((pet) => (
              <React.Fragment key={pet.id}>
                {renderItem({ item: pet })}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}
