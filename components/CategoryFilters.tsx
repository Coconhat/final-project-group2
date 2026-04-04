import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

export type RaceFilter = "all" | "cat" | "dog" | "bird" | "other";

type CategoryFiltersProps = {
  selectedFilter: RaceFilter;
  onSelectFilter: (filter: RaceFilter) => void;
};

const FILTERS: { label: string; value: RaceFilter }[] = [
  { label: "All Friends", value: "all" },
  { label: "Cats", value: "cat" },
  { label: "Dogs", value: "dog" },
  { label: "Birds", value: "bird" },
  { label: "Others", value: "other" },
];

export default function CategoryFilters({
  selectedFilter,
  onSelectFilter,
}: CategoryFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-12 -mx-6 px-6"
      contentContainerClassName="gap-4 pb-2"
    >
      {FILTERS.map((filter, index) => {
        const isActive = selectedFilter === filter.value;

        return (
          <TouchableOpacity
            key={filter.value}
            onPress={() => onSelectFilter(filter.value)}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-full ${
              isActive ? "bg-tertiary-container" : "bg-surface-container-low"
            }`}
            style={index === FILTERS.length - 1 ? { marginRight: 24 } : undefined}
          >
            <MaterialIcons
              name="pets"
              size={20}
              color={isActive ? "#614914" : "#6d5b56"}
            />
            <Text
              className={`font-label text-base ${
                isActive
                  ? "text-on-tertiary-container font-bold"
                  : "text-on-surface-variant font-medium"
              }`}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
