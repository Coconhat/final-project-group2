import { type RaceFilter } from "@/components/CategoryFilters";
import {
  getOrSetCachedValue,
  invalidateCachedPrefix,
  peekCachedValue,
} from "@/lib/cache";
import { getPrimaryPetImageUrl } from "@/lib/petImages";
import { resolveIsAdmin } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const isCompletedStatus = (status: string | null | undefined) => {
  const normalized = String(status || "").toLowerCase();
  return ["completed", "approved", "accept", "accepted", "confirmed"].includes(
    normalized,
  );
};

const getPetRace = (pet: any) =>
  String(pet?.race || pet?.pet_type || pet?.type || "")
    .toLowerCase()
    .trim();

const isOtherRace = (race: string) => !["cat", "dog", "bird"].includes(race);

type PetCardsGridProps = {
  raceFilter?: RaceFilter;
};

const PETS_CACHE_KEY = "pets:available:v1";
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

export default function PetCardsGrid({
  raceFilter = "all",
}: PetCardsGridProps) {
  const initialPets = peekCachedValue<any[]>(PETS_CACHE_KEY);
  const [pets, setPets] = useState<any[]>(initialPets || []);
  const [loading, setLoading] = useState(!initialPets);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestStatusByPetId, setRequestStatusByPetId] = useState<
    Record<string, string>
  >({});
  const router = useRouter();

  useEffect(() => {
    const loadRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAdmin(await resolveIsAdmin(user));
      } catch {
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

  useFocusEffect(
    useCallback(() => {
      const fetchPets = async () => {
        const warmPets = peekCachedValue<any[]>(PETS_CACHE_KEY);
        if (warmPets) {
          setPets(warmPets);
          setLoading(false);
        }

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
                  ((data as { pet_id: string | null; status: string | null }[]) ||
                    []),
                );
              },
              { ttlMs: 20_000 },
            );

            setRequestStatusByPetId(cachedRequestStatus);
          } else {
            setRequestStatusByPetId({});
          }

          const cachedPets = await getOrSetCachedValue<any[]>(
            PETS_CACHE_KEY,
            async () => {
              const { data: petsData, error: petsError } = await supabase
                .from("pets")
                .select("*");

              if (petsError) {
                throw petsError;
              }

              const { data: adoptedRows, error: adoptedError } = await supabase
                .from("adoption_requests")
                .select("pet_id, status");

              if (adoptedError) {
                console.error("Adoption status fetch error:", adoptedError);
                return petsData || [];
              }

              const adoptedPetIds = new Set(
                (
                  (adoptedRows as {
                    pet_id: string | null;
                    status?: string | null;
                  }[]) || []
                )
                  .filter((row) => isCompletedStatus(row.status))
                  .map((row) => row.pet_id)
                  .filter((petId): petId is string => !!petId),
              );

              return (petsData || []).filter(
                (pet) => !adoptedPetIds.has(String(pet.id)),
              );
            },
            {
              ttlMs: 60_000,
              forceRefresh: !!warmPets,
            },
          );

          setPets(cachedPets);
        } catch (error) {
          console.error("Error fetching pets:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchPets();
    }, []),
  );

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    // Check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push("/login");
      return;
    }

    const newStatus = !currentStatus;

    setPets((currentPets) =>
      currentPets.map((pet) =>
        pet.id === id
          ? { ...pet, is_favorite: newStatus, isFavorite: newStatus }
          : pet,
      ),
    );

    const { error } = await supabase
      .from("pets")
      .update({ is_favorite: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating favorite status:", error);
      return;
    }

    await invalidateCachedPrefix("pets:");
  };

  const filteredPets = useMemo(() => {
    if (raceFilter === "all") {
      return pets;
    }

    return pets.filter((pet) => {
      const race = getPetRace(pet);

      if (!race) {
        return raceFilter === "other";
      }

      if (raceFilter === "other") {
        return isOtherRace(race);
      }

      return race.includes(raceFilter);
    });
  }, [pets, raceFilter]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator size="large" color="#fd8863" />
      </View>
    );
  }

  if (filteredPets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <Text className="text-on-surface-variant">
          No pets available for this filter.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const defaultImage = getPrimaryPetImageUrl(item);
    const requestStatus = requestStatusByPetId[String(item.id)];
    const hasRequested = !!requestStatus;
    const isInProcess = requestStatus === "pending";

    return (
      <View className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-6">
        <View className="h-64 relative">
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
            className="absolute top-4 right-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center"
            onPress={() => {
              toggleFavorite(item.id, item.is_favorite || item.isFavorite);
            }}
          >
            <MaterialIcons
              name={
                item.is_favorite || item.isFavorite
                  ? "favorite"
                  : "favorite-border"
              }
              size={24}
              color={item.is_favorite || item.isFavorite ? "#fa746f" : "white"}
            />
          </TouchableOpacity>
        </View>
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xl font-bold font-headline text-on-surface">
              {item.name}
            </Text>
          </View>
          <Text className="text-on-surface-variant text-sm mb-4 font-body">
            {item.breed} - {item.age}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {item.tags?.map((tag: string, tagIndex: number) => (
              <View
                key={tagIndex}
                className="bg-tertiary-container/30 px-2 py-1 rounded"
              >
                <Text className="text-on-tertiary-container text-[10px] font-bold uppercase">
                  {tag}
                </Text>
              </View>
            ))}
            {item.vaccinated && (
              <View className="bg-secondary-container/30 px-2 py-1 rounded">
                <Text className="text-on-secondary-container text-[10px] font-bold uppercase">
                  VACCINATED
                </Text>
              </View>
            )}
            {hasRequested && (
              <View className="bg-primary/15 px-2 py-1 rounded">
                <Text className="text-primary text-[10px] font-bold uppercase">
                  {isInProcess ? "IN PROCESS" : "REQUESTED"}
                </Text>
              </View>
            )}
          </View>
          {!isAdmin && (
            <View className="mt-5">
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
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={filteredPets}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );
}
