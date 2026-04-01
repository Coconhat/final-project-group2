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

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const fetchFavorites = async () => {
        try {
          const { data, error } = await supabase
            .from("pets")
            .select("*")
            .eq("is_favorite", true);
          if (error) {
            console.error("Supabase error:", error);
            return;
          }
          setFavorites(data || []);
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
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-surface-container-highest rounded-xl overflow-hidden shadow-none mb-6">
      <View className="h-64 relative overflow-hidden">
        <Image
          source={{ uri: item.image_url || item.imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />
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
        <TouchableOpacity
          className="flex-row items-center gap-2 mt-auto"
          onPress={() => router.push(`/pet/${item.id}`)}
        >
          <Text className="text-primary font-bold text-sm">Adopt Me</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#a04223" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
