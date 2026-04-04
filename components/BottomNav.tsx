import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const roleFromProfile =
        typeof profile?.role === "string" ? profile.role.toLowerCase() : null;
      const roleFromMetadata =
        typeof user.user_metadata?.role === "string"
          ? String(user.user_metadata.role).toLowerCase()
          : null;

      setIsAdmin(roleFromProfile === "admin" || roleFromMetadata === "admin");
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

  const navItems = useMemo(
    () => [
      {
        label: "Explore",
        route: "/",
        icon: "pets" as const,
      },
      isAdmin
        ? {
            label: "Chat",
            route: "/chat",
            icon: "forum" as const,
          }
        : {
            label: "Favorites",
            route: "/favorite",
            icon: "favorite-border" as const,
          },
      {
        label: "Requests",
        route: "/request",
        icon: "chat-bubble-outline" as const,
      },
      {
        label: "Settings",
        route: "/settings",
        icon: "dashboard" as const,
      },
    ],
    [isAdmin],
  );

  const isActiveRoute = (route: string) => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="absolute bottom-0 w-full bg-[#fff8f6]/95 border-t border-[#3e2f2b]/5"
    >
      <View className="flex-row justify-around items-center pt-3 pb-2 px-4 rounded-t-[3rem]">
        {navItems.map((item) => {
          const active = isActiveRoute(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              className={`items-center justify-center px-5 py-2 rounded-full ${
                active ? "bg-[#fd8863]/20" : ""
              }`}
              onPress={() => router.push(item.route as any)}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={active ? "#a04223" : "rgba(62,47,43,0.5)"}
              />
              <Text
                className={`text-xs font-medium font-body mt-1 ${
                  active ? "text-[#a04223]" : "text-[#3e2f2b]/50"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
