import BottomNav from "@/components/BottomNav";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(false);

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
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-surface-container-highest">
              <View className="flex-row items-center gap-3">
                <MaterialIcons
                  name="person-outline"
                  size={24}
                  color="#6d5b56"
                />
                <Text className="text-on-surface font-medium text-base">
                  Edit Profile
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#a79a96" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="lock-outline" size={24} color="#6d5b56" />
                <Text className="text-on-surface font-medium text-base">
                  Privacy & Security
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#a79a96" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="mb-8">
          <Text className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">
            Notifications
          </Text>
          <View className="bg-surface-container-low rounded-xl overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-surface-container-highest">
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
                onValueChange={setPushEnabled}
                trackColor={{ true: "#fd8863", false: "#f6ddd7" }}
                thumbColor="#fff"
              />
            </View>
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="email" size={24} color="#6d5b56" />
                <Text className="text-on-surface font-medium text-base">
                  Email Updates
                </Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ true: "#fd8863", false: "#f6ddd7" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-8">
          <Text className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 px-2">
            Support
          </Text>
          <View className="bg-surface-container-low rounded-xl overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-surface-container-highest">
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="help-outline" size={24} color="#6d5b56" />
                <Text className="text-on-surface font-medium text-base">
                  Help Center
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#a79a96" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center p-4">
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
