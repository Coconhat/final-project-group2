import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

export default function FloatingActionButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push("/admin")}
      className="absolute right-6 bottom-28 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg z-40"
    >
      <MaterialIcons name="add" size={28} color="#fff7f5" />
    </TouchableOpacity>
  );
}
