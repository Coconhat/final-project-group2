import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const checklistItems = [
  "Identity verified",
  "Housing suitability checked",
  "Lifestyle and schedule reviewed",
  "Pet health and fit confirmed",
];

const PET_IMAGE_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_PET_BUCKET || "pet-images";

const PET_TYPE_OPTIONS = ["Dog", "Cat", "Bird", "Other"] as const;

type PetFormState = {
  name: string;
  petType: string;
  age: string;
  breed: string;
  imageUrl: string;
  gender: string;
  description: string;
  tagsCsv: string;
  vaccinated: boolean;
};

const emptyPetForm: PetFormState = {
  name: "",
  petType: "",
  age: "",
  breed: "",
  imageUrl: "",
  gender: "",
  description: "",
  tagsCsv: "",
  vaccinated: false,
};

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [petForm, setPetForm] = useState<PetFormState>(emptyPetForm);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPetTypeOptions, setShowPetTypeOptions] = useState(false);
  const [checklistState, setChecklistState] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const ensureChecklistState = (items: any[]) => {
    setChecklistState((current) => {
      const next = { ...current };
      for (const request of items) {
        if (!next[request.id]) {
          next[request.id] = checklistItems.reduce(
            (acc, label) => ({ ...acc, [label]: false }),
            {},
          );
        }
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        Alert.alert("Access denied", "This page is for admins only.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
        return;
      }

      const [
        { data: petData, error: petError },
        { data: requestData, error: requestError },
      ] = await Promise.all([
        supabase.from("pets").select("*").order("name", { ascending: true }),
        supabase
          .from("adoption_requests")
          .select("*")
          .in("status", ["pending", "completed", "rejected"])
          .order("created_at", { ascending: false }),
      ]);

      if (petError) throw petError;
      if (requestError) throw requestError;

      setPets(petData || []);
      setRequests(requestData || []);
      ensureChecklistState(requestData || []);
      setAuthorized(true);
    } catch (error: any) {
      Alert.alert(
        "Admin Error",
        error?.message || "Could not load admin data.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const updateForm = (key: keyof PetFormState, value: string | boolean) => {
    setPetForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetPetForm = () => {
    setPetForm(emptyPetForm);
    setShowPetTypeOptions(false);
    setEditingPetId(null);
  };

  const parseTags = (input: string) =>
    input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

  const pickAndUploadImage = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to upload pet images.",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) {
        return;
      }

      setUploadingImage(true);
      const asset = pickerResult.assets[0];
      const rawExt =
        asset.fileName?.split(".").pop()?.toLowerCase() ||
        asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() ||
        "jpg";
      const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt)
        ? rawExt
        : "jpg";
      const storagePath = `pets/${user.id}-${Date.now()}.${ext}`;

      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from(PET_IMAGE_BUCKET)
        .upload(storagePath, fileBlob, {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        const uploadErrorCode = (uploadError as any)?.code;
        const isRlsError =
          uploadErrorCode === "42501" ||
          uploadError.message?.toLowerCase().includes("row-level security");
        Alert.alert(
          "Upload failed",
          isRlsError
            ? "Storage permissions blocked upload. Run the SQL in schema/admin_pets_setup.sql to create bucket policies for pet-images."
            : uploadError.message ||
                "Could not upload image. Check bucket name and permissions.",
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(PET_IMAGE_BUCKET)
        .getPublicUrl(storagePath);

      updateForm("imageUrl", publicUrlData.publicUrl);
      Alert.alert("Image uploaded", "Pet image uploaded successfully.");
    } catch (error: any) {
      Alert.alert(
        "Upload error",
        error?.message || "Unexpected error while uploading image.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePet = async () => {
    if (
      !petForm.name ||
      !petForm.petType ||
      !petForm.breed ||
      !petForm.age ||
      !petForm.imageUrl
    ) {
      Alert.alert(
        "Missing fields",
        "Name, pet type, breed, age and image are required.",
      );
      return;
    }

    const minimalPayload = {
      name: petForm.name.trim(),
      age: petForm.age.trim(),
      breed: petForm.breed.trim(),
      race: petForm.petType,
      image_url: petForm.imageUrl.trim(),
    };

    const payload: Record<string, any> = {
      ...minimalPayload,
      pet_type: petForm.petType,
      vaccinated: petForm.vaccinated,
      tags: parseTags(petForm.tagsCsv),
      description: petForm.description.trim() || null,
      gender: petForm.gender || null,
    };

    const runSave = (data: Record<string, any>) =>
      editingPetId
        ? supabase.from("pets").update(data).eq("id", editingPetId)
        : supabase.from("pets").insert([data]);

    let { error } = await runSave(payload);

    // Fallback for schema mismatch: save required fields only.
    if (error?.code === "42703") {
      const fallback = await runSave(minimalPayload);
      error = fallback.error;
    }

    if (error) {
      const isRlsError = error.code === "42501";
      Alert.alert(
        "Save failed",
        isRlsError
          ? "RLS blocked writing to pets. For this school project, run SQL in schema/admin_pets_setup.sql to allow authenticated CRUD on pets."
          : `${error.message}${error.code ? ` (${error.code})` : ""}`,
      );
      return;
    }

    Alert.alert("Success", editingPetId ? "Pet updated." : "Pet added.");
    resetPetForm();
    loadData();
  };

  const handleEditPet = (pet: any) => {
    setEditingPetId(String(pet.id));
    setPetForm({
      name: pet.name || "",
      petType: pet.pet_type || pet.race || pet.type || "",
      age: pet.age || "",
      breed: pet.breed || "",
      imageUrl: pet.image_url || pet.imageUrl || "",
      gender: pet.gender || "",
      description: pet.description || "",
      tagsCsv: Array.isArray(pet.tags) ? pet.tags.join(", ") : "",
      vaccinated: !!pet.vaccinated,
    });
  };

  const handleDeletePet = (pet: any) => {
    Alert.alert("Delete pet", `Delete ${pet.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("pets")
            .delete()
            .eq("id", pet.id);
          if (error) {
            Alert.alert("Delete failed", error.message);
            return;
          }
          loadData();
        },
      },
    ]);
  };

  const toggleChecklistItem = (requestId: string, item: string) => {
    setChecklistState((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        [item]: !current[requestId]?.[item],
      },
    }));
  };

  const checklistComplete = (requestId: string) =>
    checklistItems.every((item) => checklistState[requestId]?.[item]);

  const handleVerdict = async (
    request: any,
    nextStatus: "completed" | "rejected",
  ) => {
    if (request.status !== "pending") {
      Alert.alert(
        "Already reviewed",
        "This request has already been reviewed.",
      );
      return;
    }

    if (!checklistComplete(request.id)) {
      Alert.alert(
        "Checklist required",
        "Please complete all checklist items first.",
      );
      return;
    }

    const { error } = await supabase
      .from("adoption_requests")
      .update({ status: nextStatus })
      .eq("id", request.id);

    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }

    Alert.alert("Saved", `Request marked as ${nextStatus}.`);
    loadData();
  };

  const statusPill = (status: string) => {
    if (status === "completed") {
      return {
        bg: "bg-secondary/10",
        text: "text-secondary",
        label: "Completed",
      };
    }
    if (status === "rejected") {
      return {
        bg: "bg-error-container/20",
        text: "text-error",
        label: "Rejected",
      };
    }
    return {
      bg: "bg-surface-container-highest",
      text: "text-on-surface",
      label: "Pending",
    };
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#fd8863" />
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-surface-container-highest">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={24} color="#3e2f2b" />
        </TouchableOpacity>
        <Text className="font-headline font-bold text-xl text-on-surface ml-3">
          Admin Panel
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-5 pb-36">
        <View className="mb-8">
          <Text className="font-headline text-2xl font-extrabold text-on-surface mb-2">
            Manage Pets
          </Text>
          <Text className="text-on-surface-variant mb-4">
            Add, edit, or delete pets listed in your store.
          </Text>

          <View className="bg-surface-container-low rounded-2xl p-4 gap-3">
            <TextInput
              value={petForm.name}
              onChangeText={(value) => updateForm("name", value)}
              placeholder="Pet name"
              placeholderTextColor="#a79a96"
              className="bg-white p-3 rounded-xl text-on-surface"
            />
            <View className="bg-white rounded-xl p-3">
              <Text className="text-on-surface-variant mb-2">Pet Type</Text>
              <TouchableOpacity
                onPress={() => setShowPetTypeOptions((prev) => !prev)}
                className="h-11 rounded-xl border border-surface-container-highest px-3 flex-row items-center justify-between"
              >
                <Text
                  className={petForm.petType ? "text-on-surface" : "text-on-surface-variant"}
                >
                  {petForm.petType || "Select pet type"}
                </Text>
                <MaterialIcons
                  name={showPetTypeOptions ? "expand-less" : "expand-more"}
                  size={22}
                  color="#7f7572"
                />
              </TouchableOpacity>
              {showPetTypeOptions && (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {PET_TYPE_OPTIONS.map((option) => {
                    const selected = petForm.petType === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          updateForm("petType", option);
                          setShowPetTypeOptions(false);
                        }}
                        className={`px-4 h-9 rounded-full items-center justify-center border ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-surface-container-highest"
                        }`}
                      >
                        <Text
                          className={selected ? "text-primary font-bold" : "text-on-surface-variant"}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            <View className="flex-row gap-2">
              <TextInput
                value={petForm.breed}
                onChangeText={(value) => updateForm("breed", value)}
                placeholder="Breed"
                placeholderTextColor="#a79a96"
                className="bg-white p-3 rounded-xl text-on-surface flex-1"
              />
              <TextInput
                value={petForm.age}
                onChangeText={(value) => updateForm("age", value)}
                placeholder="Age"
                placeholderTextColor="#a79a96"
                className="bg-white p-3 rounded-xl text-on-surface flex-1"
              />
            </View>
            <View className="flex-row gap-2">
              <View className="bg-white rounded-xl p-3 flex-1">
                <Text className="text-on-surface-variant mb-2">Gender</Text>
                <View className="flex-row gap-2">
                  {[
                    { label: "Male", value: "Male" },
                    { label: "Female", value: "Female" },
                  ].map((option) => {
                    const selected = petForm.gender === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => updateForm("gender", option.value)}
                        className={`flex-1 rounded-full h-10 items-center justify-center border ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-surface-container-highest bg-surface-container-low"
                        }`}
                      >
                        <Text
                          className={
                            selected
                              ? "text-primary font-bold"
                              : "text-on-surface-variant"
                          }
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View className="bg-white rounded-xl px-3 flex-1 flex-row items-center justify-between">
                <Text className="text-on-surface-variant">Vaccinated</Text>
                <Switch
                  value={petForm.vaccinated}
                  onValueChange={(value) => updateForm("vaccinated", value)}
                  trackColor={{ false: "#e8e2d9", true: "#fd8863" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
            <View className="bg-white p-3 rounded-xl">
              <Text className="text-on-surface-variant mb-2">Pet Image</Text>
              <TouchableOpacity
                onPress={pickAndUploadImage}
                disabled={uploadingImage}
                className={`h-11 rounded-full items-center justify-center flex-row gap-2 ${
                  uploadingImage ? "bg-surface-container-highest" : "bg-primary"
                }`}
              >
                <MaterialIcons
                  name={uploadingImage ? "hourglass-top" : "upload"}
                  size={18}
                  color={uploadingImage ? "#7f7572" : "#ffffff"}
                />
                <Text
                  className={
                    uploadingImage
                      ? "text-on-surface-variant font-bold"
                      : "text-on-primary font-bold"
                  }
                >
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </Text>
              </TouchableOpacity>

              {!!petForm.imageUrl && (
                <View className="mt-3">
                  <Image
                    source={{ uri: petForm.imageUrl }}
                    className="w-full h-40 rounded-xl"
                    resizeMode="cover"
                  />
                  <Text
                    className="text-on-surface-variant text-xs mt-2"
                    numberOfLines={1}
                  >
                    {petForm.imageUrl}
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              value={petForm.tagsCsv}
              onChangeText={(value) => updateForm("tagsCsv", value)}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#a79a96"
              className="bg-white p-3 rounded-xl text-on-surface"
            />
            <TextInput
              value={petForm.description}
              onChangeText={(value) => updateForm("description", value)}
              placeholder="Description"
              placeholderTextColor="#a79a96"
              multiline
              className="bg-white p-3 rounded-xl text-on-surface min-h-24"
            />

            <View className="flex-row gap-3 pt-1">
              <TouchableOpacity
                onPress={handleSavePet}
                className="flex-1 h-12 rounded-full bg-primary items-center justify-center"
              >
                <Text className="text-on-primary font-bold">
                  {editingPetId ? "Update Pet" : "Add Pet"}
                </Text>
              </TouchableOpacity>
              {editingPetId && (
                <TouchableOpacity
                  onPress={resetPetForm}
                  className="h-12 px-6 rounded-full bg-surface-container-highest items-center justify-center"
                >
                  <Text className="text-on-surface font-bold">Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="mt-4 gap-2">
            {pets.map((pet) => (
              <View
                key={pet.id}
                className="bg-surface-container-low rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text
                    className="font-headline font-bold text-on-surface text-base"
                    numberOfLines={1}
                  >
                    {pet.name}
                  </Text>
                  <Text
                    className="text-on-surface-variant text-sm"
                    numberOfLines={1}
                  >
                    {(pet.pet_type || "Pet") + " | " + (pet.breed || "-") + " | " + (pet.age || "-")}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditPet(pet)}
                    className="w-10 h-10 rounded-full bg-secondary/15 items-center justify-center"
                  >
                    <MaterialIcons name="edit" size={20} color="#006b64" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeletePet(pet)}
                    className="w-10 h-10 rounded-full bg-error-container/40 items-center justify-center"
                  >
                    <MaterialIcons name="delete" size={20} color="#a83836" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="font-headline text-2xl font-extrabold text-on-surface mb-2">
            Review Requests
          </Text>
          <Text className="text-on-surface-variant mb-4">
            Complete all checklist items before final approval or rejection.
          </Text>

          <View className="gap-3">
            {requests.map((request) => {
              const pill = statusPill(request.status);
              const done = checklistComplete(request.id);

              return (
                <View
                  key={request.id}
                  className="bg-surface-container-low rounded-2xl p-4"
                >
                  <View className="flex-row justify-between items-start gap-3 mb-2">
                    <View className="flex-1">
                      <Text
                        className="font-headline font-bold text-lg text-on-surface"
                        numberOfLines={1}
                      >
                        {request.pet_name || "Unknown Pet"}
                      </Text>
                      <Text
                        className="text-on-surface-variant text-sm"
                        numberOfLines={1}
                      >
                        {request.full_name} | {request.email}
                      </Text>
                      <Text
                        className="text-on-surface-variant text-sm"
                        numberOfLines={1}
                      >
                        {request.phone}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${pill.bg}`}>
                      <Text
                        className={`uppercase text-[10px] font-bold ${pill.text}`}
                      >
                        {pill.label}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-background rounded-xl p-3 mb-3">
                    {checklistItems.map((item) => {
                      const checked = !!checklistState[request.id]?.[item];
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => toggleChecklistItem(request.id, item)}
                          disabled={request.status !== "pending"}
                          className="flex-row items-center py-2"
                        >
                          <MaterialIcons
                            name={
                              checked ? "check-box" : "check-box-outline-blank"
                            }
                            size={22}
                            color={checked ? "#006b64" : "#a79a96"}
                          />
                          <Text className="text-on-surface ml-2 flex-1">
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => handleVerdict(request, "completed")}
                      disabled={request.status !== "pending" || !done}
                      className={`flex-1 h-11 rounded-full items-center justify-center ${
                        request.status !== "pending" || !done
                          ? "bg-secondary/30"
                          : "bg-secondary"
                      }`}
                    >
                      <Text className="text-white font-bold">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleVerdict(request, "rejected")}
                      disabled={request.status !== "pending" || !done}
                      className={`flex-1 h-11 rounded-full items-center justify-center ${
                        request.status !== "pending" || !done
                          ? "bg-error/30"
                          : "bg-error"
                      }`}
                    >
                      <Text className="text-white font-bold">Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
