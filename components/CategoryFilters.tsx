import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

export default function CategoryFilters() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-12 -mx-6 px-6"
      contentContainerClassName="gap-4 pb-2"
    >
      {/* Active Filter */}
      <TouchableOpacity className="flex-row items-center gap-2 bg-tertiary-container px-6 py-3 rounded-full">
        <MaterialIcons name="pets" size={20} color="#614914" />
        <Text className="text-on-tertiary-container font-label font-bold text-base">
          All Friends
        </Text>
      </TouchableOpacity>
      {/* Inactive Filters */}
      <TouchableOpacity className="flex-row items-center gap-2 bg-surface-container-low px-6 py-3 rounded-full">
        <MaterialIcons name="pets" size={20} color="#6d5b56" />
        <Text className="text-on-surface-variant font-label font-medium text-base">
          Cats
        </Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-row items-center gap-2 bg-surface-container-low px-6 py-3 rounded-full">
        <MaterialIcons name="pets" size={20} color="#6d5b56" />
        <Text className="text-on-surface-variant font-label font-medium text-base">
          Dogs
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-row items-center gap-2 bg-surface-container-low px-6 py-3 rounded-full"
        style={{ marginRight: 24 }}
      >
        <MaterialIcons name="pets" size={20} color="#6d5b56" />
        <Text className="text-on-surface-variant font-label font-medium text-base">
          Others
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
