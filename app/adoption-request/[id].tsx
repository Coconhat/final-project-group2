import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdoptionRequestScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    housingType: "",
    otherHousingType: "",
    ownOrRent: "",
    hasYard: false,
    otherPets: "",
    adultCount: 1,
    childCount: 0,
  });

  const handleApply = () => {
    // TODO: Zod validation + Hook up with Supabase here
    console.log("Submit Adopt Request:", formData);
    // After submit, maybe route back or to a success screen
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={24} color="#3e2f2b" />
        </TouchableOpacity>
        <Text className="font-headline font-bold text-xl text-on-surface ml-4">
          Adoption Form
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 w-full relative"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-6 pt-4 pb-12"
        >
          {/* Intro Section */}
          <Text className="font-headline font-extrabold text-3xl text-on-surface mb-2">
            Almost there!
          </Text>
          <Text className="text-base text-on-surface-variant mb-6">
            Fill out this form to request adoption. We will review your
            application and get back to you soon.
          </Text>
          {/* SECTION: Personal Info */}
          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              1. Personal Information
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Full Name
              </Text>
              <TextInput
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, fullName: text }))
                }
                placeholder="John Doe"
                className="bg-surface-container-low text-on-surface p-4 rounded-xl"
              />
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Email Address
              </Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                placeholder="john@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-surface-container-low text-on-surface p-4 rounded-xl"
              />
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Phone Number
              </Text>
              <TextInput
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, phone: text }))
                }
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                className="bg-surface-container-low text-on-surface p-4 rounded-xl"
              />
            </View>
          </View>
          {/* SECTION: Living Situation */}
          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              2. Living Situation
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Do you Own or Rent?
              </Text>
              <View className="flex-row gap-3">
                {["Own", "Rent"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, ownOrRent: option }))
                    }
                    className={`flex-1 p-4 rounded-xl items-center border-2 ${
                      formData.ownOrRent === option
                        ? "bg-primary/10 border-primary"
                        : "bg-surface-container-low border-transparent"
                    }`}
                  >
                    <Text
                      className={`font-bold text-base ${
                        formData.ownOrRent === option
                          ? "text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Housing Type
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {["House", "Apartment", "Townhouse", "Other"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, housingType: option }))
                    }
                    className={`px-5 py-3 rounded-full border-2 ${
                      formData.housingType === option
                        ? "bg-primary/10 border-primary"
                        : "bg-surface-container-low border-transparent"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        formData.housingType === option
                          ? "text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formData.housingType === "Other" && (
                <TextInput
                  value={formData.otherHousingType}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, otherHousingType: text }))
                  }
                  placeholder="Please specify your housing type"
                  className="bg-surface-container-low text-on-surface p-4 rounded-xl mt-3"
                />
              )}
            </View>

            <View className="mb-4 flex-row justify-between items-center bg-surface-container-low p-4 rounded-xl">
              <Text className="text-on-surface font-bold">
                Do you have a fenced yard?
              </Text>
              <Switch
                value={formData.hasYard}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, hasYard: val }))
                }
                trackColor={{ false: "#d3cedc", true: "#fd8863" }}
                thumbColor={formData.hasYard ? "#ffffff" : "#a8a2b5"}
              />
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Household Size
              </Text>
              <View className="bg-surface-container-low p-4 rounded-xl gap-4">
                {/* Adults Counter */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-on-surface font-bold">
                    Adults (18+)
                  </Text>
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          adultCount: Math.max(
                            1,
                            Number(prev.adultCount || 1) - 1,
                          ),
                        }))
                      }
                      className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                      <MaterialIcons name="remove" size={20} color="#3e2f2b" />
                    </TouchableOpacity>
                    <Text className="text-on-surface font-headline font-bold text-lg w-6 text-center">
                      {formData.adultCount}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          adultCount: Number(prev.adultCount || 1) + 1,
                        }))
                      }
                      className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                      <MaterialIcons name="add" size={20} color="#3e2f2b" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-surface-container-highest w-full" />

                {/* Children Counter */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-on-surface font-bold">Children</Text>
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          childCount: Math.max(
                            0,
                            Number(prev.childCount || 0) - 1,
                          ),
                        }))
                      }
                      className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                      <MaterialIcons name="remove" size={20} color="#3e2f2b" />
                    </TouchableOpacity>
                    <Text className="text-on-surface font-headline font-bold text-lg w-6 text-center">
                      {formData.childCount}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          childCount: Number(prev.childCount || 0) + 1,
                        }))
                      }
                      className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                    >
                      <MaterialIcons name="add" size={20} color="#3e2f2b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* SECTION: Pet Experience */}
          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              3. Pet Experience
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Any other pets at home?
              </Text>
              <TextInput
                value={formData.otherPets}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, otherPets: text }))
                }
                placeholder="e.g., 1 Cat, None"
                className="bg-surface-container-low text-on-surface p-4 rounded-xl"
                multiline
              />
            </View>
          </View>
          <View className="h-32" /> {/* Bottom Spacing */}
        </ScrollView>

        {/* Sticky Bottom Action inside AvoidView so it moves up with keyboard if needed */}
        <View className="absolute bottom-0 w-full bg-white/95 px-6 pt-4 pb-8 border-t border-surface-container-highest">
          <TouchableOpacity
            className="bg-primary h-14 rounded-full flex-row items-center justify-center shadow-sm"
            onPress={handleApply}
          >
            <Text className="text-on-primary font-headline font-bold text-lg">
              Submit Application
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
