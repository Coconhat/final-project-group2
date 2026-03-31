import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, View } from "react-native";

export default function HeroSearch() {
  return (
    <View className="mb-10">
      <Text className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight mb-6 font-headline">
        Find your new <Text className="text-primary">soulmate</Text> in our
        sanctuary.
      </Text>

      <View className="relative justify-center">
        <View className="absolute left-4 z-10">
          <MaterialIcons name="search" size={24} color="#8a7671" />
        </View>
        <TextInput
          className="w-full bg-surface-container-lowest rounded-xl py-4 pl-12 pr-4 shadow-sm font-body text-base text-on-surface"
          placeholder="Search by breed, age, or personality..."
          placeholderTextColor="#a79a96"
        />
      </View>
    </View>
  );
}
