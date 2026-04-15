import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import CategoryFilters, { type RaceFilter } from "@/components/CategoryFilters";
import FloatingActionButton from "@/components/FloatingActionButton";
import Header from "@/components/header";
import HeroSearch from "@/components/HeroSearch";
import PetCardsGrid from "@/components/PetCardsGrid";

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

        const roleFromMetadata =
          typeof user.user_metadata?.role === "string"
            ? String(user.user_metadata.role).toLowerCase()
            : null;

        if (roleFromMetadata === "admin") {
          setIsAdmin(true);
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        setIsAdmin(String(profile?.role || "").toLowerCase() === "admin");
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
