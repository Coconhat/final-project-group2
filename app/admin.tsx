import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const checklistItems = [
  "Identity verified",
  "Housing suitability checked",
  "Household size confirmed",
  "Other pets considered",
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

type AdoptionRequest = {
  id: string;
  pet_name: string | null;
  status: "pending" | "completed" | "rejected" | string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  own_or_rent: string;
  housing_type: string;
  other_housing_type: string | null;
  has_yard: boolean;
  adult_count: number;
  child_count: number;
  other_pets: string | null;
};

type RequestMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
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
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [petForm, setPetForm] = useState<PetFormState>(emptyPetForm);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPetTypeOptions, setShowPetTypeOptions] = useState(false);
  const [checklistState, setChecklistState] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<AdoptionRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatTableMissing, setChatTableMissing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageChannelRef = useRef<any>(null);

  const ensureChecklistState = (items: AdoptionRequest[]) => {
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

  const cleanupMessageChannel = () => {
    if (messageChannelRef.current) {
      void supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupMessageChannel();
    };
  }, []);

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

      setAdminUserId(user.id);

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
      setRequests((requestData as AdoptionRequest[]) || []);
      ensureChecklistState((requestData as AdoptionRequest[]) || []);
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

  const loadMessages = async (requestId: string) => {
    setMessagesLoading(true);
    setChatTableMissing(false);

    const { data, error } = await supabase
      .from("adoption_request_messages")
      .select("id, request_id, sender_id, message, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        setChatTableMissing(true);
      } else {
        Alert.alert("Could not load chat", error.message);
      }
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages((data as RequestMessage[]) || []);
    setMessagesLoading(false);
  };

  const subscribeToMessages = (requestId: string) => {
    cleanupMessageChannel();

    const channel = supabase
      .channel(`admin-request-chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "adoption_request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const incoming = payload.new as RequestMessage;
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }
            return [...current, incoming];
          });
        },
      )
      .subscribe();

    messageChannelRef.current = channel;
  };

  const openChatForRequest = async (request: AdoptionRequest) => {
    if (!adminUserId) {
      Alert.alert("Not ready", "Please wait for your admin session.");
      return;
    }

    setSelectedRequest(request);
    setChatVisible(true);
    setDraftMessage("");
    await loadMessages(request.id);
    subscribeToMessages(request.id);
  };

  const closeChat = () => {
    cleanupMessageChannel();
    setChatVisible(false);
    setSelectedRequest(null);
    setMessages([]);
    setDraftMessage("");
    setChatTableMissing(false);
  };

  const sendMessage = async () => {
    if (!selectedRequest || !adminUserId) {
      return;
    }

    const messageText = draftMessage.trim();
    if (!messageText || sendingMessage) {
      return;
    }

    setSendingMessage(true);

    const { error } = await supabase.from("adoption_request_messages").insert([
      {
        request_id: selectedRequest.id,
        sender_id: adminUserId,
        message: messageText,
      },
    ]);

    if (error) {
      if (error.code === "42P01") {
        setChatTableMissing(true);
      } else {
        Alert.alert("Could not send message", error.message);
      }
      setSendingMessage(false);
      return;
    }

    setDraftMessage("");
    setSendingMessage(false);
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
    request: AdoptionRequest,
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

    if (adminUserId) {
      await supabase.from("adoption_request_messages").insert([
        {
          request_id: request.id,
          sender_id: adminUserId,
          message:
            nextStatus === "completed"
              ? "Your adoption request has been approved. Please reply to confirm next steps."
              : "Your adoption request was not approved. Thank you for your interest.",
        },
      ]);
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

  const formatMessageTime = (isoDate: string) =>
    new Date(isoDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

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
                  className={
                    petForm.petType
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }
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
                          className={
                            selected
                              ? "text-primary font-bold"
                              : "text-on-surface-variant"
                          }
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
                keyboardType="number-pad"
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
              className="bg-white p-3 pl-5 rounded-xl text-on-surface min-h-24"
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
                    {(pet.pet_type || "Pet") +
                      " | " +
                      (pet.breed || "-") +
                      " | " +
                      (pet.age || "-")}
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
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-on-surface font-bold">
                        Applicant details
                      </Text>
                      <Text className="text-xs text-on-surface-variant">
                        {new Date(request.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Own/Rent
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.own_or_rent}
                        </Text>
                      </View>
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Housing
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.housing_type}
                        </Text>
                      </View>
                      {!!request.other_housing_type && (
                        <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                          <Text className="text-xs text-on-surface-variant">
                            Other housing
                          </Text>
                          <Text className="text-sm text-on-surface font-bold">
                            {request.other_housing_type}
                          </Text>
                        </View>
                      )}
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Yard
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.has_yard ? "Yes" : "No"}
                        </Text>
                      </View>
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Adults
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.adult_count}
                        </Text>
                      </View>
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Children
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.child_count}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-3">
                      <Text className="text-xs text-on-surface-variant">
                        Other pets
                      </Text>
                      <Text className="text-sm text-on-surface">
                        {request.other_pets?.trim() || "None reported"}
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
                      onPress={() => openChatForRequest(request)}
                      className="h-11 px-4 rounded-full bg-surface-container-highest items-center justify-center"
                    >
                      <Text className="text-on-surface font-bold">Chat</Text>
                    </TouchableOpacity>
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

      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeChat}
      >
        <SafeAreaView
          className="flex-1 bg-background"
          edges={["top", "bottom"]}
        >
          <View className="px-4 pt-2 pb-3 border-b border-surface-container-highest flex-row items-center gap-3">
            <TouchableOpacity
              onPress={closeChat}
              className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#3e2f2b" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="font-headline font-bold text-lg text-on-surface">
                {selectedRequest?.pet_name || "Adoption Chat"}
              </Text>
              <Text className="text-xs text-on-surface-variant mt-1">
                {selectedRequest?.full_name || "Applicant"}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            {messagesLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="small" color="#fd8863" />
              </View>
            ) : chatTableMissing ? (
              <View className="flex-1 items-center justify-center px-6">
                <MaterialIcons name="error-outline" size={32} color="#a79a96" />
                <Text className="text-on-surface text-center mt-2">
                  Chat table not found.
                </Text>
                <Text className="text-on-surface-variant text-center mt-1 text-sm">
                  Run the SQL in schema/adoption_request_chat.sql to enable
                  chat.
                </Text>
              </View>
            ) : (
              <ScrollView className="px-4 pt-4">
                {messages.length === 0 ? (
                  <View className="items-center py-10">
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={32}
                      color="#a79a96"
                    />
                    <Text className="text-on-surface-variant mt-2">
                      No messages yet. Start the conversation.
                    </Text>
                  </View>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === adminUserId;
                    return (
                      <View
                        key={message.id}
                        className={`mb-2 px-1 ${isMine ? "items-end" : "items-start"}`}
                      >
                        <View
                          className={`max-w-[82%] rounded-3xl px-4 py-3 ${
                            isMine
                              ? "bg-primary rounded-br-md"
                              : "bg-surface-container-high rounded-bl-md"
                          }`}
                        >
                          <Text
                            className={
                              isMine ? "text-on-primary" : "text-on-surface"
                            }
                          >
                            {message.message}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-on-surface-variant mt-1 px-1">
                          {formatMessageTime(message.created_at)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View className="flex-row items-center gap-2 px-4 py-3 border-t border-surface-container-highest mb-4">
              <TextInput
                value={draftMessage}
                onChangeText={setDraftMessage}
                placeholder="Write a message..."
                placeholderTextColor="#a79a96"
                className="flex-1 bg-surface-container-low rounded-full px-4 py-2 text-on-surface"
                editable={!sendingMessage}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={sendingMessage || !draftMessage.trim()}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  sendingMessage || !draftMessage.trim()
                    ? "bg-surface-container-highest"
                    : "bg-primary"
                }`}
              >
                <MaterialIcons
                  name="send"
                  size={18}
                  color={
                    sendingMessage || !draftMessage.trim()
                      ? "#a79a96"
                      : "#ffffff"
                  }
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}
