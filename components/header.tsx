import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Header() {
  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute top-0 w-full z-50 bg-[#fff8f6]/95 border-b border-[#3e2f2b]/5"
    >
      <View className="flex-row justify-between items-center px-6 py-4">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="active:scale-95 transition-opacity">
            <MaterialIcons name="menu" size={28} color="#a04223" />
          </TouchableOpacity>
          <Text className="font-headline font-bold tracking-tight text-xl text-primary">
            PawMatch
          </Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-container/20">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9fHOpeFmoE2z93XsAbdjmBCfsd9QhDL5WL5pjuEDI3yGXF0q6SXcdUBbPH_sucenxsT2Fa5zlLmqMIg0XrG3bJ9aCZJrEwIfJvOJw_nByLuzcjWbYD-yFMkrVyYUVuC1A-SNj8mqdw2NXL8rKFoRp3xl6BiWBqMU3GSWprZ6Zi8qmqasxSCK1WIdtQlWeHJwxjo9W-vcjBEO_LmLZWnZ4qUDnfAdkzOTMX4R9L-AEThwmKHOfXlPH-Z_3bbVLpv43pUSdgg2REcKB",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
