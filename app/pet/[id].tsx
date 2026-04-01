import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchPetDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPet(data);
        setIsFavorite(data.is_favorite || false);
      } catch (error) {
        console.error("Error fetching pet details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPetDetails();
    }
  }, [id]);

  const toggleFavorite = async () => {
    // Check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push("/login");
      return;
    }

    const newStatus = !isFavorite;
    setIsFavorite(newStatus);

    const { error } = await supabase
      .from("pets")
      .update({ is_favorite: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(!newStatus);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#fd8863" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface-variant">Pet not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Hero Image */}
        <View className="h-96 relative">
          <Image
            source={{ uri: pet.image_url || pet.imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Back Button */}
          <SafeAreaView className="absolute top-0 left-0 w-full px-4 pt-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 bg-white/80 rounded-full items-center justify-center shadow-sm"
            >
              <MaterialIcons name="arrow-back" size={24} color="#3e2f2b" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content Section */}
        <View className="bg-background -mt-8 rounded-t-[2.5rem] px-6 pt-8 pb-32">
          {/* Header Info */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="font-headline text-4xl font-extrabold text-on-surface">
                {pet.name}
              </Text>
              <Text className="font-body text-base text-on-surface-variant mt-1">
                {pet.breed}
              </Text>
            </View>
            <MaterialIcons
              name={pet.gender?.toLowerCase() === "male" ? "male" : "female"}
              size={32}
              color={
                pet.gender?.toLowerCase() === "male" ? "#006b64" : "#fd8863"
              }
            />
          </View>

          {/* Quick Stats */}
          <View className="flex-row justify-between mb-8">
            <View className="bg-surface-container-low rounded-2xl p-4 flex-1 mr-3 items-center">
              <Text className="text-on-surface-variant text-xs font-bold uppercase mb-1">
                Age
              </Text>
              <Text className="font-headline font-bold text-lg text-on-surface">
                {pet.age}
              </Text>
            </View>
            <View className="bg-surface-container-low rounded-2xl p-4 flex-1 mx-1.5 items-center">
              <Text className="text-on-surface-variant text-xs font-bold uppercase mb-1">
                Sex
              </Text>
              <Text className="font-headline font-bold text-lg text-on-surface">
                {pet.gender || "Unknown"}
              </Text>
            </View>
            <View className="bg-surface-container-low rounded-2xl p-4 flex-1 ml-3 items-center">
              <Text className="text-on-surface-variant text-xs font-bold uppercase mb-1">
                Breed
              </Text>
              <Text className="font-headline font-bold text-lg text-on-surface">
                {pet.breed || "Unknown"}
              </Text>
            </View>
          </View>

          {/* About Section */}
          <View className="mb-8">
            <Text className="font-headline text-xl font-bold text-on-surface mb-3">
              About {pet.name}
            </Text>
            <Text className="font-body text-on-surface-variant leading-relaxed">
              {pet.description ||
                `Meet ${pet.name}! A beautiful ${pet.breed} looking for a forever home. They are very sweet and cannot wait to meet their new family.`}
            </Text>
          </View>

          {/* Tags */}
          <View className="mb-4">
            <Text className="font-headline text-xl font-bold text-on-surface mb-3">
              Traits & Health
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {pet.tags?.map((tag: string, index: number) => (
                <View
                  key={index}
                  className="bg-tertiary-container/30 px-4 py-2 rounded-full"
                >
                  <Text className="text-on-tertiary-container font-bold text-xs uppercase tracking-wider">
                    {tag}
                  </Text>
                </View>
              ))}
              {pet.vaccinated && (
                <View className="bg-secondary-container/30 px-4 py-2 rounded-full">
                  <Text className="text-on-secondary-container font-bold text-xs uppercase tracking-wider">
                    Vaccinated
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View className="absolute bottom-0 w-full bg-white/95 px-6 pt-4 pb-8 border-t border-surface-container-highest">
        <View className="flex-row gap-4 items-center">
          <TouchableOpacity
            className="w-14 h-14 rounded-full bg-surface-container-low items-center justify-center border border-surface-container-highest"
            onPress={toggleFavorite}
          >
            <MaterialIcons
              name={isFavorite ? "favorite" : "favorite-border"}
              size={28}
              color="#fa746f"
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary h-14 rounded-full flex-row items-center justify-center shadow-sm"
            onPress={async () => {
              const { data: authData } = await supabase.auth.getUser();
              if (!authData.user) {
                router.push("/login");
                return;
              }
              router.push({
                pathname: "/adoption-request/[id]",
                params: { id: String(id), name: pet.name },
              });
            }}
          >
            <Text className="text-on-primary font-headline font-bold text-lg">
              Start Adoption Request
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
