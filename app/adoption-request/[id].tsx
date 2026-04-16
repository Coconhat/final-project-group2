import { invalidateCachedPrefix } from "@/lib/cache";
import { resolveIsAdmin } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { adoptionRequestSchema } from "@/schema/adoption.schema";
import { MaterialIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
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
import { z } from "zod";

type AdoptionFormData = z.infer<typeof adoptionRequestSchema>;

const ADOPTED_STATUSES = [
  "completed",
  "approved",
  "approve",
  "accepted",
  "accept",
  "confirmed",
];

export default function AdoptionRequestScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdoptionFormData>({
    resolver: zodResolver(adoptionRequestSchema),
    defaultValues: {
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
    },
  });

  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isPetAlreadyAdopted = async (petId: string) => {
    const { data, error } = await supabase
      .from("adoption_requests")
      .select("id")
      .eq("pet_id", petId)
      .in("status", ADOPTED_STATUSES)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return !!data;
  };

  useEffect(() => {
    const checkAuthAndPrefill = async () => {
      try {
        const petId = String(id || "");
        if (!petId) {
          Alert.alert("Invalid pet", "This pet could not be loaded.");
          router.replace("/");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        if (await resolveIsAdmin(user)) {
          Alert.alert(
            "Admin account",
            "Admins cannot submit adoption requests.",
          );
          router.replace("/");
          return;
        }

        if (await isPetAlreadyAdopted(petId)) {
          Alert.alert(
            "Pet not available",
            "This pet has already been adopted and is no longer accepting requests.",
          );
          router.replace({ pathname: "/pet/[id]", params: { id: petId } });
          return;
        }

        if (user.email) setValue("email", user.email);

        const { data: existingRequest, error: existingRequestError } =
          await supabase
            .from("adoption_requests")
            .select("id")
            .eq("pet_id", petId)
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (existingRequestError) {
          console.error(
            "Error checking existing request:",
            existingRequestError,
          );
          Alert.alert(
            "Error",
            "Could not verify your existing requests. Please try again.",
          );
          router.replace("/");
          return;
        }

        if (existingRequest) {
          Alert.alert(
            "Already Requested",
            "You have already applied for this pet!",
          );
          router.replace("/");
          return;
        }

        setIsLoadingAuth(false);
      } catch (error) {
        console.error("Auth/prefill check failed:", error);
        Alert.alert("Error", "Could not validate this request right now.");
        router.replace("/");
      }
    };
    checkAuthAndPrefill();
  }, [id, setValue, router]);

  if (isLoadingAuth) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-on-surface-variant">
          Checking authentication...
        </Text>
      </View>
    );
  }

  const housingTypeWatch = watch("housingType");

  const submitApplicationToDatabase = async (data: AdoptionFormData) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to submit request");
        return;
      }

      if (await resolveIsAdmin(user)) {
        Alert.alert("Admin account", "Admins cannot submit adoption requests.");
        return;
      }

      const petId = String(id || "");
      if (!petId) {
        Alert.alert("Error", "Invalid pet selected.");
        return;
      }

      if (await isPetAlreadyAdopted(petId)) {
        Alert.alert(
          "Pet no longer available",
          "This pet has already been adopted. Please choose another pet.",
        );
        await invalidateCachedPrefix("pets:");
        await invalidateCachedPrefix(`pet:detail:${petId}`);
        router.replace("/");
        return;
      }

      const { error } = await supabase.from("adoption_requests").insert([
        {
          pet_id: petId,
          pet_name: name ? String(name) : "Unknown Pet",
          user_id: user.id,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          own_or_rent: data.ownOrRent,
          housing_type: data.housingType,
          other_housing_type: data.otherHousingType || null,
          has_yard: data.hasYard,
          adult_count: data.adultCount,
          child_count: data.childCount,
          other_pets: data.otherPets || null,
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        Alert.alert(
          "Error",
          "Could not submit your request. Please try again.",
        );
        return;
      }

      await invalidateCachedPrefix("requests:");
      await invalidateCachedPrefix("pets:");

      Alert.alert(
        "Application Submitted!",
        "Your adoption request has been successfully submitted! We will review your application and get back to you soon.",
        [
          {
            text: "Go to Home",
            onPress: () => router.replace("/"),
          },
        ],
      );
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onConfirmApplication = (data: AdoptionFormData) => {
    if (isSubmitting) {
      return;
    }

    Alert.alert(
      "Confirm Submission",
      "Are you sure you want to submit this adoption request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Submit",
          onPress: () => submitApplicationToDatabase(data),
        },
      ],
    );
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
          <Text className="font-headline font-extrabold text-3xl text-on-surface mb-2">
            Almost there!
          </Text>
          <Text className="text-base text-on-surface-variant mb-6">
            Fill out this form to request adoption. We will review your
            application and get back to you soon.
          </Text>

          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              1. Personal Information
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Full Name
              </Text>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="John Doe"
                    placeholderTextColor="#a79a96"
                    className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
                  />
                )}
              />
              {errors.fullName && (
                <Text className="text-error text-sm mt-1">
                  {errors.fullName.message}
                </Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="john@example.com"
                    placeholderTextColor="#a79a96"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
                  />
                )}
              />
              {errors.email && (
                <Text className="text-error text-sm mt-1">
                  {errors.email.message}
                </Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Phone Number
              </Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#a79a96"
                    keyboardType="phone-pad"
                    className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
                  />
                )}
              />
              {errors.phone && (
                <Text className="text-error text-sm mt-1">
                  {errors.phone.message}
                </Text>
              )}
            </View>
          </View>

          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              2. Living Situation
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Do you Own or Rent?
              </Text>
              <Controller
                control={control}
                name="ownOrRent"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row gap-3">
                    {["Own", "Rent"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => onChange(option)}
                        className={`flex-1 p-4 rounded-xl items-center border-2 ${
                          value === option
                            ? "bg-primary/10 border-primary"
                            : "bg-surface-container-low border-transparent"
                        }`}
                      >
                        <Text
                          className={`font-semibold text-base ${
                            value === option
                              ? "text-primary"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              {errors.ownOrRent && (
                <Text className="text-error text-sm mt-1">
                  {errors.ownOrRent.message}
                </Text>
              )}
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Housing Type
              </Text>
              <Controller
                control={control}
                name="housingType"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row flex-wrap gap-3">
                    {["House", "Apartment", "Townhouse", "Other"].map(
                      (option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => onChange(option)}
                          className={`px-5 py-3 rounded-full border-2 ${
                            value === option
                              ? "bg-primary/10 border-primary"
                              : "bg-surface-container-low border-transparent"
                          }`}
                        >
                          <Text
                            className={`font-semibold ${
                              value === option
                                ? "text-primary"
                                : "text-on-surface-variant"
                            }`}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                )}
              />
              {errors.housingType && (
                <Text className="text-error text-sm mt-1">
                  {errors.housingType.message}
                </Text>
              )}

              {housingTypeWatch === "Other" && (
                <Controller
                  control={control}
                  name="otherHousingType"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Please specify your housing type"
                      placeholderTextColor="#a79a96"
                      className="bg-surface-container-low text-on-surface p-4 rounded-xl mt-3 font-normal"
                    />
                  )}
                />
              )}
            </View>

            <View className="mb-4 flex-row justify-between items-center bg-surface-container-low p-4 rounded-xl">
              <Text className="text-on-surface font-bold">
                Do you have a fenced yard?
              </Text>
              <Controller
                control={control}
                name="hasYard"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#d3cedc", true: "#fd8863" }}
                    thumbColor={value ? "#ffffff" : "#a8a2b5"}
                  />
                )}
              />
            </View>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Household Size
              </Text>
              <View className="bg-surface-container-low p-4 rounded-xl gap-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-on-surface font-bold">Adults</Text>
                  <Controller
                    control={control}
                    name="adultCount"
                    render={({ field: { onChange, value } }) => (
                      <View className="flex-row items-center gap-4">
                        <TouchableOpacity
                          onPress={() =>
                            onChange(Math.max(1, Number(value || 1) - 1))
                          }
                          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                        >
                          <MaterialIcons
                            name="remove"
                            size={20}
                            color="#3e2f2b"
                          />
                        </TouchableOpacity>
                        <Text className="text-on-surface font-headline font-bold text-lg w-6 text-center">
                          {value}
                        </Text>
                        <TouchableOpacity
                          onPress={() => onChange(Number(value || 1) + 1)}
                          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                        >
                          <MaterialIcons name="add" size={20} color="#3e2f2b" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>

                <View className="h-[1px] bg-surface-container-highest w-full" />

                <View className="flex-row justify-between items-center">
                  <Text className="text-on-surface font-bold">Children</Text>
                  <Controller
                    control={control}
                    name="childCount"
                    render={({ field: { onChange, value } }) => (
                      <View className="flex-row items-center gap-4">
                        <TouchableOpacity
                          onPress={() =>
                            onChange(Math.max(0, Number(value || 0) - 1))
                          }
                          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                        >
                          <MaterialIcons
                            name="remove"
                            size={20}
                            color="#3e2f2b"
                          />
                        </TouchableOpacity>
                        <Text className="text-on-surface font-headline font-bold text-lg w-6 text-center">
                          {value}
                        </Text>
                        <TouchableOpacity
                          onPress={() => onChange(Number(value || 0) + 1)}
                          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
                        >
                          <MaterialIcons name="add" size={20} color="#3e2f2b" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="mb-8">
            <Text className="font-headline font-bold text-lg text-on-surface mb-4">
              3. Pet Experience
            </Text>

            <View className="mb-4">
              <Text className="text-on-surface-variant text-sm font-bold mb-2">
                Any other pets at home?
              </Text>
              <Controller
                control={control}
                name="otherPets"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., 1 Cat, None"
                    placeholderTextColor="#a79a96"
                    className="bg-surface-container-low text-on-surface p-4 rounded-xl font-normal"
                    multiline
                  />
                )}
              />
            </View>
          </View>
          <View className="h-32" />
        </ScrollView>

        <View className="absolute bottom-0 w-full bg-white/95 px-6 pt-4 pb-8 border-t border-surface-container-highest">
          <TouchableOpacity
            disabled={isSubmitting}
            className={`h-14 rounded-full flex-row items-center justify-center ${
              isSubmitting ? "bg-surface-container-highest" : "bg-primary"
            }`}
            onPress={handleSubmit(onConfirmApplication)}
          >
            {isSubmitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#8f8380" />
                <Text className="text-on-surface-variant font-headline font-bold text-lg">
                  Submitting...
                </Text>
              </View>
            ) : (
              <Text className="text-on-primary font-headline font-bold text-lg">
                Submit Application
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
