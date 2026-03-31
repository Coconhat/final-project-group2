import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BottomNav() {
  const router = useRouter();

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="absolute bottom-0 w-full bg-[#fff8f6]/95 border-t border-[#3e2f2b]/5"
    >
      <View className="flex-row justify-around items-center pt-3 pb-2 px-4 rounded-t-[3rem]">
        <TouchableOpacity
          className="items-center justify-center bg-[#fd8863]/20 rounded-full px-5 py-2"
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="pets" size={24} color="#a04223" />
          <Text className="text-[#a04223] text-xs font-medium font-body mt-1">
            Explore
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center px-5 py-2"
          onPress={() => router.push("/favorite")}
        >
          <MaterialIcons
            name="favorite-border"
            size={24}
            color="rgba(62,47,43,0.5)"
          />
          <Text className="text-[#3e2f2b]/50 text-xs font-medium font-body mt-1">
            Favorites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center px-5 py-2"
          onPress={() => router.push("/request")}
        >
          <MaterialIcons
            name="chat-bubble-outline"
            size={24}
            color="rgba(62,47,43,0.5)"
          />
          <Text className="text-[#3e2f2b]/50 text-xs font-medium font-body mt-1">
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center px-5 py-2"
          onPress={() => router.push("/settings")}
        >
          <MaterialIcons
            name="dashboard"
            size={24}
            color="rgba(62,47,43,0.5)"
          />
          <Text className="text-[#3e2f2b]/50 text-xs font-medium font-body mt-1">
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
