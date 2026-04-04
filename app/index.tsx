import React, { useState } from "react";
import { ScrollView, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import CategoryFilters, { type RaceFilter } from "@/components/CategoryFilters";
import FloatingActionButton from "@/components/FloatingActionButton";
import Header from "@/components/header";
import HeroSearch from "@/components/HeroSearch";
import PetCardsGrid from "@/components/PetCardsGrid";

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState<RaceFilter>("all");

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

      <FloatingActionButton />
      <BottomNav />
    </View>
  );
}
