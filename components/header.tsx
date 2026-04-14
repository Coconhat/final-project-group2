import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user: loadedUser },
        } = await supabase.auth.getUser();
        setUser(loadedUser);
      } catch (error) {
        console.warn("[Header] Failed to load auth user", error);
        setUser(null);
      }
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute top-0 w-full z-50 bg-[#fff8f6]/95 border-b border-[#3e2f2b]/5"
    >
      <View className="flex-row items-center px-6 py-4 justify-between">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="active:scale-95 transition-opacity">
            <MaterialIcons name="menu" size={28} color="#a04223" />
          </TouchableOpacity>
          <Text className="font-headline font-bold tracking-tight text-xl text-primary">
            PawMatch
          </Text>
        </View>

        {user ? (
          <View className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-container/20">
            <Image
              source={{
                uri:
                  "https://ui-avatars.com/api/?name=" +
                  (user?.email || "User") +
                  "&background=f5e4e0&color=a04223",
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/login")}
            className="flex-row items-center gap-2"
          >
            <Text className="text-on-surface-variant font-bold text-xs text-right w-12">
              Not logged in
            </Text>
            <View className="w-10 h-10 rounded-full bg-surface-container-low border-2 border-surface-container-highest items-center justify-center">
              <MaterialIcons name="person-outline" size={24} color="#a79a96" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
