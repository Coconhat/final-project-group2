import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setUserEmail(null);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.role === "admin");
    };

    loadProfile();
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if (Platform.OS === "web") return;
    const { status } = await Notifications.getPermissionsAsync();
    setPushEnabled(status === "granted");
  };

  const handlePushToggle = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not Supported",
        "Push notifications are not supported on the web.",
      );
      return;
    }

    if (value) {
      if (!Device.isDevice) {
        Alert.alert("Error", "Must use physical device for Push Notifications");
        return;
      }
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Failed to get push token for push notification!",
        );
        setPushEnabled(false);
        return;
      }
      // Assuming we successfully enabled it
      setPushEnabled(true);
      Alert.alert("Success", "Push Notifications Enabled!");
    } else {
      // It's not easy to programmaticly revoke notification permissions in iOS/Android,
      // usually you tell them to go to settings
      Alert.alert(
        "Manage Permissions",
        "To fully disable notifications, please go to your device Settings.",
      );
      setPushEnabled(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Error", error.message);
    } else {
      router.replace("/");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen">
        <View className="mb-8 px-2">
          <Text className="font-headline font-extrabold text-3xl text-on-background leading-tight mb-2">
            Settings
          </Text>
          <Text className="text-on-surface-variant text-sm">
            Manage your account and preferences.
          </Text>
        </View>

        {/* Account Section */}
        <View className="mb-8">
          <Text className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">
            Account
          </Text>
          <View className="bg-surface-container-low rounded-xl overflow-hidden">
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <MaterialIcons
                  name="person-outline"
                  size={24}
                  color="#6d5b56"
                />
                <Text className="text-on-surface font-medium text-base">
                  {userEmail || "Signed out"}
                </Text>
              </View>
            </View>

            {isAdmin && (
              <TouchableOpacity
                className="flex-row items-center justify-between p-4 border-t border-surface-container-highest"
                onPress={() => router.push("/admin")}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name="admin-panel-settings"
                    size={24}
                    color="#6d5b56"
                  />
                  <Text className="text-on-surface font-medium text-base">
                    Admin Panel
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#a79a96" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notifications Section */}
        <View className="mb-8">
          <Text className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">
            Notifications
          </Text>
          <View className="bg-surface-container-low rounded-xl overflow-hidden">
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <MaterialIcons
                  name="notifications-active"
                  size={24}
                  color="#6d5b56"
                />
                <Text className="text-on-surface font-medium text-base">
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ true: "#fd8863", false: "#f6ddd7" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-8">
          <Text className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">
            Access
          </Text>
          <View className="bg-surface-container-low rounded-xl overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center p-4"
              onPress={handleLogout}
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="logout" size={24} color="#a83836" />
                <Text className="text-error font-medium text-base">
                  Log Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}
