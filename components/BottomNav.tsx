import { resolveIsAdmin } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useMemo, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let cachedIsAdmin: boolean | null = null;

// Animated nav item — handles spring press + fade-in pill + top bar
function NavItem({
  item,
  active,
  onPress,
}: {
  item: { label: string; route: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] };
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const barWidth = useRef(new Animated.Value(active ? 20 : 0)).current;
  const iconScale = useRef(new Animated.Value(active ? 1.15 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pillOpacity, {
        toValue: active ? 1 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.spring(barWidth, {
        toValue: active ? 20 : 0,
        useNativeDriver: false, // width can't use native driver
        speed: 20,
        bounciness: 8,
      }),
      Animated.spring(iconScale, {
        toValue: active ? 1.15 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 14, // slight overshoot bounce on release
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ alignItems: "center" }}
    >
      {/* Active top-bar indicator */}
      <Animated.View
        style={{
          width: barWidth,
          height: 3,
          borderRadius: 99,
          backgroundColor: "#a04223",
          marginBottom: 6,
        }}
      />

      <Animated.View
        style={{
          transform: [{ scale }],
          alignItems: "center",
        }}
      >
        {/* Active pill background */}
        <Animated.View
          style={{
            position: "absolute",
            top: -6,
            bottom: -6,
            left: -18,
            right: -18,
            borderRadius: 999,
            backgroundColor: "rgba(253,136,99,0.15)",
            opacity: pillOpacity,
          }}
        />

        {/* Icon with independent scale */}
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <MaterialIcons
            name={item.icon}
            size={22}
            color={active ? "#a04223" : "rgba(62,47,43,0.45)"}
          />
        </Animated.View>

        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            marginTop: 3,
            color: active ? "#a04223" : "rgba(62,47,43,0.45)",
          }}
          className="font-body"
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(cachedIsAdmin);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { cachedIsAdmin = false; setIsAdmin(false); return; }
        const resolvedIsAdmin = await resolveIsAdmin(user);
        cachedIsAdmin = resolvedIsAdmin;
        setIsAdmin(resolvedIsAdmin);
      } catch {
        cachedIsAdmin = false;
        setIsAdmin(false);
      }
    };

    void loadRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void loadRole());
    return () => subscription.unsubscribe();
  }, []);

  const navItems = useMemo(() => [
    { label: "Explore",   route: "/",        icon: "pets" as const },
    isAdmin === true
      ? { label: "Chat",      route: "/chat",    icon: "forum" as const }
      : { label: "Favorites", route: "/favorite",icon: "favorite-border" as const },
    { label: "Requests",  route: "/request", icon: "chat-bubble-outline" as const },
    { label: "Settings",  route: "/settings", icon: "dashboard" as const },
  ], [isAdmin]);

  if (isAdmin === null) {
    return (
      <SafeAreaView edges={["bottom"]} className="absolute bottom-0 w-full bg-[#fff8f6]/95 border-t border-[#3e2f2b]/5">
        <View className="h-[74px]" />
      </SafeAreaView>
    );
  }

  const isActiveRoute = (route: string) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(${route}/);

  return (
    <SafeAreaView edges={["bottom"]} className="absolute bottom-0 w-full bg-[#fff8f6]/95 border-t border-[#3e2f2b]/5">
      <View className="flex-row justify-around items-start pt-0 pb-2 px-4">
        {navItems.map((item) => (
          <NavItem
            key={item.route}
            item={item}
            active={isActiveRoute(item.route)}
            onPress={() => !isActiveRoute(item.route) && router.navigate(item.route as any)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}