import { Tabs } from "expo-router";
import "react-native-reanimated";
import "../global.css";

export default function RootLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="favorite" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="request" />
      <Tabs.Screen name="settings" />

      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="pet/[id]" options={{ href: null }} />
      <Tabs.Screen name="adoption-request/[id]" options={{ href: null }} />
    </Tabs>
  );
}
