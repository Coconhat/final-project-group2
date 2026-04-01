import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const router = useRouter();

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      } else {
        // Navigate back or to home
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert("Registration Failed", error.message);
      } else {
        Alert.alert("Success", "Account created! You can now log in.", [
          { text: "OK", onPress: () => setIsLoginMode(true) },
        ]);
      }
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={24} color="#3e2f2b" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-6 justify-center pb-20"
      >
        <Text className="font-headline font-extrabold text-4xl text-on-surface mb-2">
          {isLoginMode ? "Welcome back" : "Create Account"}
        </Text>
        <Text className="text-base text-on-surface-variant mb-10">
          {isLoginMode
            ? "Log in to save favorites and apply for adoption."
            : "Sign up to start your pet adoption journey."}
        </Text>

        <View className="mb-4">
          <Text className="text-on-surface-variant text-sm font-bold mb-2">
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="hello@example.com"
            placeholderTextColor="#a79a96"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
          />
        </View>

        <View className="mb-8">
          <Text className="text-on-surface-variant text-sm font-bold mb-2">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#a79a96"
            secureTextEntry
            autoCapitalize="none"
            className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
          />
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          className={`h-14 rounded-full flex-row items-center justify-center shadow-sm mb-4 ${
            loading ? "bg-primary/50" : "bg-primary"
          }`}
        >
          <Text className="text-on-primary font-headline font-bold text-lg">
            {loading ? "Please wait..." : isLoginMode ? "Log In" : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-4">
          <Text className="text-on-surface-variant text-base">
            {isLoginMode
              ? "Don't have an account? "
              : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text className="text-primary font-bold text-base">
              {isLoginMode ? "Sign up" : "Log in"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
