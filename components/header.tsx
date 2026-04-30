import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Wraps any right-side content with a spring press + fade-slide-in entrance
function AnimatedHeaderSlot({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 14,
    }).start();

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }, { scale }] }}
      // Bubble press events up from children via context — or wrap children in
      // a Pressable at call-site and pass handlers down if needed
    >
      {children}
    </Animated.View>
  );
}

// Pulsing ring around the avatar when logged in
function AvatarRing({ uri }: { uri: string }) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.4],
  });

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
      {/* Pulsing outer ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#a04223",
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      {/* Avatar */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1.5,
          borderColor: "rgba(160,66,35,0.2)",
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Logo entrance
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoX = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoOpacity, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 0,
      }),
      Animated.spring(logoX, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16,
        bounciness: 8,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: loadedUser } } = await supabase.auth.getUser();
        setUser(loadedUser);
      } catch {
        setUser(null);
      }
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const avatarUri =
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(user?.email || "User") +
    "&background=f5e4e0&color=a04223";

  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute top-0 w-full z-50 bg-[#fff8f6]/95 border-b border-[#3e2f2b]/5"
    >
      <View className="flex-row items-center px-6 py-4 justify-between">
        {/* Logo — slides in from left */}
        <Animated.View
          style={{ opacity: logoOpacity, transform: [{ translateX: logoX }] }}
        >
          <Text className="font-headline font-bold tracking-tight text-xl text-primary">
            PawMatch
          </Text>
        </Animated.View>

        {/* Right slot — re-mounts on auth change, triggering entrance animation */}
        {user ? (
          <AnimatedHeaderSlot key="user">
            <TouchableOpacity activeOpacity={0.85}>
              <AvatarRing uri={avatarUri} />
            </TouchableOpacity>
          </AnimatedHeaderSlot>
        ) : (
          <AnimatedHeaderSlot key="guest">
            <TouchableOpacity
              onPress={() => router.push("/login")}
              activeOpacity={0.85}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: "rgba(62,47,43,0.4)",
                  textAlign: "right",
                  width: 52,
                }}
              >
                Not logged in
              </Text>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: "rgba(62,47,43,0.2)",
                  backgroundColor: "rgba(62,47,43,0.03)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="person-outline" size={22} color="#a79a96" />
              </View>
            </TouchableOpacity>
          </AnimatedHeaderSlot>
        )}
      </View>
    </SafeAreaView>
  );
}