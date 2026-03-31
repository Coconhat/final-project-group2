import React from "react";
import { ScrollView, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import CategoryFilters from "@/components/CategoryFilters";
import FloatingActionButton from "@/components/FloatingActionButton";
import Header from "@/components/header";
import HeroSearch from "@/components/HeroSearch";
import PetCardsGrid from "@/components/PetCardsGrid";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-background pb-12">
      <Header />

      <ScrollView
        contentContainerClassName="pt-32 pb-40 px-6"
        showsVerticalScrollIndicator={false}
      >
        <HeroSearch />
        <CategoryFilters />
        <PetCardsGrid />
      </ScrollView>

      <FloatingActionButton />
      <BottomNav />
    </View>
  );
}
