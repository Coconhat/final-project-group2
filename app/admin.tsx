import BottomNav from "@/components/BottomNav";
import { getOrSetCachedValue, invalidateCachedPrefix } from "@/lib/cache";
import { resolveIsAdmin } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  imageUrls: string[];
  gender: string;
  description: string;
  tagsCsv: string;
  vaccinated: boolean;
};

type AdoptionRequest = {
  id: string;
  pet_id?: string | null;
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

const normalizeRequestStatus = (status: string | null | undefined) => {
  const normalized = String(status || "pending").toLowerCase();
  if (
    ["approved", "approve", "confirmed", "accept", "accepted"].includes(
      normalized,
    )
  ) {
    return "completed";
  }
  if (["declined", "decline", "cancelled", "canceled"].includes(normalized)) {
    return "rejected";
  }
  if (
    normalized === "pending" ||
    normalized === "completed" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return "pending";
};

const emptyPetForm: PetFormState = {
  name: "",
  petType: "",
  age: "",
  breed: "",
  imageUrls: [],
  gender: "",
  description: "",
  tagsCsv: "",
  vaccinated: false,
};

const readUriAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(uri);
    return await response.arrayBuffer();
  } catch {
    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onerror = () => reject(new Error("Could not read selected image."));
      xhr.onload = () => {
        if (xhr.response) {
          resolve(xhr.response as ArrayBuffer);
          return;
        }
        reject(new Error("Selected image returned empty data."));
      };
      xhr.responseType = "arraybuffer";
      xhr.open("GET", uri, true);
      xhr.send();
    });
  }
};

// ─── Reusable Label component ────────────────────────────────────────────────
const FieldLabel = ({ children }: { children: string }) => (
  <Text className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5">
    {children}
  </Text>
);

// ─── Section header with accent line ─────────────────────────────────────────
const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View className="mb-5">
    <View className="flex-row items-center gap-2 mb-1">
      <View className="w-1 h-6 rounded-full bg-primary" />
      <Text className="font-headline text-2xl font-extrabold text-on-surface">
        {title}
      </Text>
    </View>
    {subtitle && (
      <Text className="text-on-surface-variant text-sm pl-3">{subtitle}</Text>
    )}
  </View>
);

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
  const [uploadImageIndex, setUploadImageIndex] = useState(0);
  const messageChannelRef = useRef<any>(null);
  const chatScrollRef = useRef<ScrollView>(null);

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

      const isAdmin = await resolveIsAdmin(user);
      if (!isAdmin) {
        Alert.alert("Access denied", "This page is for admins only.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
        return;
      }

      const dashboardData = await getOrSetCachedValue<{
        pets: any[];
        requests: AdoptionRequest[];
      }>(
        `admin:dashboard:${user.id}`,
        async () => {
          const [
            { data: petData, error: petError },
            { data: requestData, error: requestError },
          ] = await Promise.all([
            supabase
              .from("pets")
              .select("*")
              .order("name", { ascending: true }),
            supabase
              .from("adoption_requests")
              .select("*")
              .order("created_at", { ascending: false }),
          ]);

          if (petError) throw petError;
          if (requestError) throw requestError;

          return {
            pets: petData || [],
            requests: ((requestData as AdoptionRequest[]) || []).map(
              (request) => ({
                ...request,
                status: normalizeRequestStatus(request.status),
              }),
            ),
          };
        },
        { ttlMs: 30_000 },
      );

      setPets(dashboardData.pets);
      setRequests(dashboardData.requests);
      ensureChecklistState(dashboardData.requests);
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

  const updateForm = (key: keyof PetFormState, value: any) => {
    setPetForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetPetForm = () => {
    setPetForm(emptyPetForm);
    setShowPetTypeOptions(false);
    setEditingPetId(null);
    setUploadImageIndex(0);
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
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.8,
      });

      if (
        pickerResult.canceled ||
        !pickerResult.assets ||
        pickerResult.assets.length === 0
      ) {
        return;
      }

      setUploadingImage(true);

      const uploadedUrls: string[] = [];
      const uploadedPaths: string[] = [];

      for (const asset of pickerResult.assets) {
        const rawExt =
          asset.fileName?.split(".").pop()?.toLowerCase() ||
          asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() ||
          "jpg";
        const ext = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(
          rawExt,
        )
          ? rawExt
          : "jpg";
        const storagePath = `pets/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const fileData = await readUriAsArrayBuffer(asset.uri);

        const { error: uploadError } = await supabase.storage
          .from(PET_IMAGE_BUCKET)
          .upload(storagePath, fileData, {
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
              ? "Storage permissions blocked upload. Check bucket policies for pet-images."
              : uploadError.message || "Could not upload image.",
          );
          setUploadingImage(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from(PET_IMAGE_BUCKET)
          .getPublicUrl(storagePath);

        uploadedPaths.push(storagePath);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      updateForm("imageUrls", [...petForm.imageUrls, ...uploadedUrls]);
      Alert.alert(
        "Images uploaded",
        `${uploadedUrls.length} image(s) uploaded successfully.`,
      );
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
      petForm.imageUrls.length === 0
    ) {
      Alert.alert(
        "Missing fields",
        "Name, pet type, breed, age and at least one image are required.",
      );
      return;
    }

    const minimalPayload = {
      name: petForm.name.trim(),
      age: petForm.age.trim(),
      breed: petForm.breed.trim(),
      race: petForm.petType,
      image_url: petForm.imageUrls.join(","),
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

    if (error?.code === "42703") {
      const fallback = await runSave(minimalPayload);
      error = fallback.error;
    }

    if (error) {
      const isRlsError = error.code === "42501";
      Alert.alert(
        "Save failed",
        isRlsError
          ? "RLS blocked writing to pets. Run SQL in schema/admin_pets_setup.sql."
          : `${error.message}${error.code ? ` (${error.code})` : ""}`,
      );
      return;
    }

    Alert.alert("Success", editingPetId ? "Pet updated." : "Pet added.");
    await invalidateCachedPrefix("pets:");
    await invalidateCachedPrefix("pet:detail:");
    await invalidateCachedPrefix("admin:dashboard:");
    resetPetForm();
    loadData();
  };

  const handleEditPet = (pet: any) => {
    setEditingPetId(String(pet.id));
    setUploadImageIndex(0);
    const parsedImageUrls = pet.image_url ? pet.image_url.split(",") : [];
    setPetForm({
      name: pet.name || "",
      petType: pet.pet_type || pet.race || pet.type || "",
      age: pet.age || "",
      breed: pet.breed || "",
      imageUrls: parsedImageUrls,
      gender: pet.gender || "",
      description: pet.description || "",
      tagsCsv: Array.isArray(pet.tags) ? pet.tags.join(", ") : "",
      vaccinated: !!pet.vaccinated,
    });
  };

  const handleDeletePet = (pet: any) => {
    Alert.alert(
      "Delete pet",
      `Are you sure you want to remove ${pet.name}? This cannot be undone.`,
      [
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
            await invalidateCachedPrefix("pets:");
            await invalidateCachedPrefix("pet:detail:");
            await invalidateCachedPrefix("admin:dashboard:");
            loadData();
          },
        },
      ],
    );
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
          setTimeout(
            () => chatScrollRef.current?.scrollToEnd({ animated: true }),
            100,
          );
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
    if (!selectedRequest || !adminUserId) return;
    const messageText = draftMessage.trim();
    if (!messageText || sendingMessage) return;

    const requestId = selectedRequest.id;

    setSendingMessage(true);
    const { data, error } = await supabase
      .from("adoption_request_messages")
      .insert([
        {
          request_id: requestId,
          sender_id: adminUserId,
          message: messageText,
        },
      ])
      .select("id, request_id, sender_id, message, created_at")
      .single();

    if (error) {
      if (error.code === "42P01") {
        setChatTableMissing(true);
      } else {
        Alert.alert("Could not send message", error.message);
      }
      setSendingMessage(false);
      return;
    }

    if (data) {
      const inserted = data as RequestMessage;
      setMessages((current) => {
        if (current.some((message) => message.id === inserted.id)) {
          return current;
        }
        return [...current, inserted];
      });
    }

    setDraftMessage("");
    setSendingMessage(false);
    setTimeout(
      () => chatScrollRef.current?.scrollToEnd({ animated: true }),
      100,
    );
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

  const checklistProgress = (requestId: string) =>
    checklistItems.filter((item) => checklistState[requestId]?.[item]).length;

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
        "Checklist incomplete",
        "Please complete all checklist items before making a decision.",
      );
      return;
    }

    const action = nextStatus === "completed" ? "approve" : "reject";
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this adoption request for ${request.pet_name || "this pet"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextStatus === "completed" ? "Approve" : "Reject",
          style: nextStatus === "rejected" ? "destructive" : "default",
          onPress: async () => {
            const { data: updatedRequest, error } = await supabase
              .from("adoption_requests")
              .update({ status: nextStatus })
              .eq("id", request.id)
              .eq("status", "pending")
              .select("id, pet_id, status")
              .maybeSingle();

            if (error) {
              Alert.alert("Update failed", error.message);
              return;
            }

            if (!updatedRequest) {
              Alert.alert(
                "Already reviewed",
                "This request has already been reviewed by another admin.",
              );
              await loadData();
              return;
            }

            const confirmedStatus = String(
              updatedRequest.status || "pending",
            ).toLowerCase();
            let autoRejectedIds: string[] = [];
            const approvedPetId = updatedRequest.pet_id
              ? String(updatedRequest.pet_id)
              : null;

            if (confirmedStatus === "completed" && approvedPetId) {
              const { data: autoRejectedRows, error: autoRejectError } =
                await supabase
                  .from("adoption_requests")
                  .update({ status: "rejected" })
                  .eq("pet_id", approvedPetId)
                  .eq("status", "pending")
                  .neq("id", request.id)
                  .select("id");

              if (autoRejectError) {
                Alert.alert(
                  "Warning",
                  "Request approved, but some competing requests could not be auto-rejected.",
                );
              } else {
                autoRejectedIds =
                  (autoRejectedRows as { id: string }[] | null)?.map(
                    (row) => row.id,
                  ) || [];
              }
            }

            setRequests((current) =>
              current.map((item) =>
                item.id === request.id
                  ? {
                      ...item,
                      status:
                        confirmedStatus === "completed"
                          ? "completed"
                          : "rejected",
                    }
                  : autoRejectedIds.includes(item.id)
                    ? { ...item, status: "rejected" }
                    : item,
              ),
            );

            setSelectedRequest((current) =>
              current && current.id === request.id
                ? {
                    ...current,
                    status:
                      confirmedStatus === "completed"
                        ? "completed"
                        : "rejected",
                  }
                : current,
            );

            if (adminUserId) {
              await supabase.from("adoption_request_messages").insert([
                {
                  request_id: request.id,
                  sender_id: adminUserId,
                  message:
                    confirmedStatus === "completed"
                      ? "Your adoption request has been approved. Please reply to confirm next steps."
                      : "Your adoption request was not approved. Thank you for your interest.",
                },
              ]);

              if (autoRejectedIds.length > 0) {
                await supabase.from("adoption_request_messages").insert(
                  autoRejectedIds.map((requestId) => ({
                    request_id: requestId,
                    sender_id: adminUserId,
                    message:
                      "This pet has already been adopted by another applicant. Your request has been closed.",
                  })),
                );
              }
            }

            Alert.alert(
              "Done",
              confirmedStatus === "completed" && autoRejectedIds.length > 0
                ? `Request approved. ${autoRejectedIds.length} competing pending request(s) were automatically declined because the pet is no longer available.`
                : `Request has been ${confirmedStatus === "completed" ? "approved" : "rejected"}.`,
            );
            await invalidateCachedPrefix("requests:");
            await invalidateCachedPrefix("chat:");
            await invalidateCachedPrefix("admin:dashboard:");
            if (confirmedStatus === "completed") {
              await invalidateCachedPrefix("pets:");
              if (approvedPetId) {
                await invalidateCachedPrefix(`pet:detail:${approvedPetId}`);
              }
            }
            loadData();
          },
        },
      ],
    );
  };

  const statusConfig = (status: string) => {
    if (status === "completed") {
      return {
        bg: "bg-secondary/10",
        text: "text-secondary",
        dot: "bg-secondary",
        label: "Approved",
        icon: "check-circle" as const,
      };
    }
    if (status === "rejected") {
      return {
        bg: "bg-error/10",
        text: "text-error",
        dot: "bg-error",
        label: "Rejected",
        icon: "cancel" as const,
      };
    }
    return {
      bg: "bg-primary/10",
      text: "text-primary",
      dot: "bg-primary",
      label: "Pending",
      icon: "schedule" as const,
    };
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#fd8863" />
        <Text className="text-on-surface-variant text-sm">
          Loading admin data…
        </Text>
      </View>
    );
  }

  if (!authorized) return null;

  const formatMessageTime = (isoDate: string) =>
    new Date(isoDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const windowWidth = Dimensions.get("window").width;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3 bg-background border-b border-surface-container-highest">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center mr-3"
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color="#3e2f2b" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-headline font-bold text-xl text-on-surface">
            Admin Panel
          </Text>
          <Text className="text-xs text-on-surface-variant">
            Manage pets & adoption requests
          </Text>
        </View>
        <TouchableOpacity
          onPress={loadData}
          className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center"
          activeOpacity={0.7}
        >
          <MaterialIcons name="refresh" size={20} color="#3e2f2b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════ MANAGE PETS ════════════════════ */}
        <View className="mb-10">
          <SectionHeader
            title="Manage Pets"
            subtitle="Add, edit, or remove pets listed in your store."
          />

          {/* ── Pet Form Card ── */}
          <View className="bg-surface-container-low rounded-3xl p-5 gap-4">
            {/* Name */}
            <View>
              <FieldLabel>Pet Name</FieldLabel>
              <TextInput
                value={petForm.name}
                onChangeText={(v) => updateForm("name", v)}
                placeholder="e.g. Max"
                placeholderTextColor="#a79a96"
                className="bg-white px-4 py-3 rounded-2xl text-on-surface text-base border border-surface-container-highest"
              />
            </View>

            {/* Pet Type */}
            <View>
              <FieldLabel>Pet Type</FieldLabel>
              <TouchableOpacity
                onPress={() => setShowPetTypeOptions((prev) => !prev)}
                className="bg-white px-4 h-12 rounded-2xl border border-surface-container-highest flex-row items-center justify-between"
                activeOpacity={0.7}
              >
                <Text
                  className={
                    petForm.petType
                      ? "text-on-surface text-base"
                      : "text-on-surface-variant text-base"
                  }
                >
                  {petForm.petType || "Select pet type"}
                </Text>
                <MaterialIcons
                  name={
                    showPetTypeOptions
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
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
                        activeOpacity={0.7}
                        className={`px-5 h-10 rounded-full items-center justify-center border ${
                          selected
                            ? "border-primary bg-primary"
                            : "border-surface-container-highest bg-white"
                        }`}
                      >
                        <Text
                          className={`font-semibold text-sm ${
                            selected ? "text-white" : "text-on-surface-variant"
                          }`}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Breed + Age row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FieldLabel>Breed</FieldLabel>
                <TextInput
                  value={petForm.breed}
                  onChangeText={(v) => updateForm("breed", v)}
                  placeholder="e.g. Labrador"
                  placeholderTextColor="#a79a96"
                  className="bg-white px-4 py-3 rounded-2xl text-on-surface border border-surface-container-highest"
                />
              </View>
              <View style={{ width: 90 }}>
                <FieldLabel>Age (yrs)</FieldLabel>
                <TextInput
                  value={petForm.age}
                  onChangeText={(v) => updateForm("age", v)}
                  placeholder="e.g. 2"
                  placeholderTextColor="#a79a96"
                  keyboardType="number-pad"
                  className="bg-white px-4 py-3 rounded-2xl text-on-surface border border-surface-container-highest text-center"
                />
              </View>
            </View>

            {/* Gender + Vaccinated row */}
            <View className="flex-row gap-3">
              {/* Gender */}
              <View className="flex-1">
                <FieldLabel>Gender</FieldLabel>
                <View className="flex-row gap-2">
                  {(["Male", "Female"] as const).map((g) => {
                    const selected = petForm.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => updateForm("gender", g)}
                        activeOpacity={0.7}
                        className={`flex-1 rounded-2xl h-11 items-center justify-center border ${
                          selected
                            ? "border-primary bg-primary"
                            : "border-surface-container-highest bg-white"
                        }`}
                      >
                        <Text
                          className={`font-semibold text-sm ${
                            selected ? "text-white" : "text-on-surface-variant"
                          }`}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Vaccinated */}
              <View
                className="bg-white rounded-2xl px-4 border border-surface-container-highest justify-center"
                style={{ minWidth: 130 }}
              >
                <FieldLabel>Vaccinated</FieldLabel>
                <Switch
                  value={petForm.vaccinated}
                  onValueChange={(v) => updateForm("vaccinated", v)}
                  trackColor={{ false: "#e8e2d9", true: "#fd8863" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Image Upload */}
            <View>
              <FieldLabel>Pet Photos</FieldLabel>
              <View className="bg-white rounded-2xl p-4 border border-surface-container-highest">
                <TouchableOpacity
                  onPress={pickAndUploadImage}
                  disabled={uploadingImage}
                  activeOpacity={0.75}
                  className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                    uploadingImage
                      ? "bg-surface-container-highest"
                      : "bg-primary"
                  }`}
                >
                  <MaterialIcons
                    name={
                      uploadingImage ? "hourglass-top" : "add-photo-alternate"
                    }
                    size={20}
                    color={uploadingImage ? "#7f7572" : "#ffffff"}
                  />
                  <Text
                    className={`font-bold text-sm ${
                      uploadingImage ? "text-on-surface-variant" : "text-white"
                    }`}
                  >
                    {uploadingImage
                      ? "Uploading…"
                      : petForm.imageUrls.length > 0
                        ? "Add More Photos"
                        : "Upload Photos"}
                  </Text>
                </TouchableOpacity>

                {petForm.imageUrls.length > 0 && (
                  <View className="mt-4">
                    <View
                      className="rounded-2xl overflow-hidden"
                      style={{ borderWidth: 1, borderColor: "#e8e2d9" }}
                    >
                      <FlatList
                        data={petForm.imageUrls}
                        keyExtractor={(_, i) => i.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ height: 200 }}
                        onScroll={(e) => {
                          const x = e.nativeEvent.contentOffset.x;
                          const w = e.nativeEvent.layoutMeasurement.width;
                          setUploadImageIndex(Math.round(x / w));
                        }}
                        scrollEventThrottle={16}
                        renderItem={({ item }) => (
                          <Image
                            source={{ uri: item }}
                            style={{ width: windowWidth - 96, height: 200 }}
                            resizeMode="cover"
                          />
                        )}
                      />
                      {/* Dot indicators */}
                      {petForm.imageUrls.length > 1 && (
                        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                          {petForm.imageUrls.map((_, idx) => (
                            <View
                              key={idx}
                              style={{
                                height: 6,
                                width: uploadImageIndex === idx ? 18 : 6,
                                borderRadius: 3,
                                backgroundColor:
                                  uploadImageIndex === idx
                                    ? "#fd8863"
                                    : "rgba(255,255,255,0.8)",
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center justify-between mt-2 px-1">
                      <Text className="text-xs text-on-surface-variant">
                        {petForm.imageUrls.length} photo
                        {petForm.imageUrls.length !== 1 ? "s" : ""} · Swipe to
                        preview
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Remove photos",
                            "Remove all uploaded photos?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove all",
                                style: "destructive",
                                onPress: () => {
                                  updateForm("imageUrls", []);
                                  setUploadImageIndex(0);
                                },
                              },
                            ],
                          );
                        }}
                      >
                        <Text className="text-xs text-error font-semibold">
                          Remove all
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Tags */}
            <View>
              <FieldLabel>Tags</FieldLabel>
              <TextInput
                value={petForm.tagsCsv}
                onChangeText={(v) => updateForm("tagsCsv", v)}
                placeholder="e.g. friendly, playful, trained"
                placeholderTextColor="#a79a96"
                className="bg-white px-4 py-3 rounded-2xl text-on-surface border border-surface-container-highest"
              />
              <Text className="text-xs text-on-surface-variant mt-1 pl-1">
                Separate tags with commas
              </Text>
            </View>

            {/* Description */}
            <View>
              <FieldLabel>Description</FieldLabel>
              <TextInput
                value={petForm.description}
                onChangeText={(v) => updateForm("description", v)}
                placeholder="Tell adopters about this pet's personality, history, and needs…"
                placeholderTextColor="#a79a96"
                multiline
                textAlignVertical="top"
                className="bg-white px-4 py-3 rounded-2xl text-on-surface border border-surface-container-highest"
                style={{ minHeight: 100 }}
              />
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3 pt-1">
              {editingPetId && (
                <TouchableOpacity
                  onPress={resetPetForm}
                  activeOpacity={0.7}
                  className="h-13 px-5 rounded-2xl bg-surface-container-highest items-center justify-center"
                >
                  <Text className="text-on-surface font-bold">Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSavePet}
                activeOpacity={0.8}
                className="flex-1 min-h-[56px] rounded-2xl bg-primary px-4 py-3 items-center justify-center flex-row gap-2"
              >
                <MaterialIcons
                  name={editingPetId ? "save" : "pets"}
                  size={18}
                  color="#ffffff"
                />
                <Text className="text-white font-bold text-[15px] leading-[20px]">
                  {editingPetId ? "Update Pet" : "Add Pet"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Pet list ── */}
          {pets.length > 0 ? (
            <View className="mt-4 gap-2">
              <Text className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1 pl-1">
                {pets.length} pet{pets.length !== 1 ? "s" : ""} listed
              </Text>
              {pets.map((pet) => {
                const thumb = pet.image_url?.split(",")[0];
                return (
                  <View
                    key={pet.id}
                    className="bg-surface-container-low rounded-2xl overflow-hidden flex-row items-center"
                    style={{ minHeight: 72 }}
                  >
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={{ width: 72, height: 72 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className="bg-surface-container-highest items-center justify-center"
                        style={{ width: 72, height: 72 }}
                      >
                        <MaterialIcons name="pets" size={28} color="#a79a96" />
                      </View>
                    )}
                    <View className="flex-1 px-3 py-2">
                      <Text
                        className="font-headline font-bold text-on-surface text-base"
                        numberOfLines={1}
                      >
                        {pet.name}
                      </Text>
                      <Text
                        className="text-on-surface-variant text-sm mt-0.5"
                        numberOfLines={1}
                      >
                        {[
                          pet.pet_type || "Pet",
                          pet.breed,
                          pet.age ? `${pet.age} yrs` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <View className="flex-row gap-1 pr-3">
                      <TouchableOpacity
                        onPress={() => handleEditPet(pet)}
                        activeOpacity={0.7}
                        className="w-9 h-9 rounded-full bg-secondary/10 items-center justify-center"
                      >
                        <MaterialIcons name="edit" size={18} color="#006b64" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePet(pet)}
                        activeOpacity={0.7}
                        className="w-9 h-9 rounded-full bg-error/10 items-center justify-center"
                      >
                        <MaterialIcons
                          name="delete"
                          size={18}
                          color="#a83836"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="mt-4 items-center py-8 bg-surface-container-low rounded-2xl">
              <MaterialIcons name="pets" size={36} color="#a79a96" />
              <Text className="text-on-surface-variant mt-2 text-sm">
                No pets listed yet. Add your first one above.
              </Text>
            </View>
          )}
        </View>

        {/* ════════════════════ ADOPTION REQUESTS ════════════════════ */}
        <View>
          <SectionHeader
            title="Adoption Requests"
            subtitle="Complete all checklist items before approving or rejecting."
          />

          {requests.length === 0 ? (
            <View className="items-center py-12 bg-surface-container-low rounded-2xl">
              <MaterialIcons name="inbox" size={40} color="#a79a96" />
              <Text className="text-on-surface-variant mt-3 text-sm">
                No adoption requests yet.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {requests.map((request) => {
                const pill = statusConfig(request.status);
                const done = checklistComplete(request.id);
                const progress = checklistProgress(request.id);
                const isPending = request.status === "pending";

                return (
                  <View
                    key={request.id}
                    className="bg-surface-container-low rounded-3xl overflow-hidden"
                  >
                    {/* Card header */}
                    <View className="px-5 pt-5 pb-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className="font-headline font-bold text-lg text-on-surface"
                            numberOfLines={1}
                          >
                            {request.pet_name || "Unknown Pet"}
                          </Text>
                          <Text
                            className="text-on-surface-variant text-sm mt-0.5"
                            numberOfLines={1}
                          >
                            {request.full_name}
                          </Text>
                          <Text
                            className="text-on-surface-variant text-xs mt-0.5"
                            numberOfLines={1}
                          >
                            {request.email} · {request.phone}
                          </Text>
                        </View>
                        <View
                          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${pill.bg}`}
                        >
                          <View
                            className={`w-1.5 h-1.5 rounded-full ${pill.dot}`}
                          />
                          <Text
                            className={`text-xs font-bold uppercase tracking-wide ${pill.text}`}
                          >
                            {pill.label}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-xs text-on-surface-variant mt-3">
                        Submitted{" "}
                        {new Date(request.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </Text>
                    </View>

                    {/* Divider */}
                    <View className="h-px bg-surface-container-highest mx-5" />

                    {/* Applicant details grid */}
                    <View className="px-5 py-4">
                      <Text className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3">
                        Applicant Details
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {[
                          { label: "Own/Rent", value: request.own_or_rent },
                          { label: "Housing", value: request.housing_type },
                          ...(request.other_housing_type
                            ? [
                                {
                                  label: "Other housing",
                                  value: request.other_housing_type,
                                },
                              ]
                            : []),
                          {
                            label: "Yard",
                            value: request.has_yard ? "Yes" : "No",
                          },
                          {
                            label: "Adults",
                            value: String(request.adult_count),
                          },
                          {
                            label: "Children",
                            value: String(request.child_count),
                          },
                        ].map(({ label, value }) => (
                          <View
                            key={label}
                            className="bg-background rounded-xl px-3 py-2"
                          >
                            <Text className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide">
                              {label}
                            </Text>
                            <Text className="text-sm text-on-surface font-bold mt-0.5">
                              {value}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View className="mt-3 bg-background rounded-xl px-3 py-2.5">
                        <Text className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide">
                          Other pets
                        </Text>
                        <Text className="text-sm text-on-surface mt-0.5">
                          {request.other_pets?.trim() || "None reported"}
                        </Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View className="h-px bg-surface-container-highest mx-5" />

                    {/* Checklist */}
                    <View className="px-5 py-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                          Verification Checklist
                        </Text>
                        <Text
                          className={`text-xs font-bold ${
                            done ? "text-secondary" : "text-on-surface-variant"
                          }`}
                        >
                          {progress}/{checklistItems.length}
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View className="h-1.5 bg-surface-container-highest rounded-full mb-3 overflow-hidden">
                        <View
                          className={`h-full rounded-full ${done ? "bg-secondary" : "bg-primary"}`}
                          style={{
                            width: `${(progress / checklistItems.length) * 100}%`,
                          }}
                        />
                      </View>

                      <View className="gap-0.5">
                        {checklistItems.map((item) => {
                          const checked = !!checklistState[request.id]?.[item];
                          return (
                            <TouchableOpacity
                              key={item}
                              onPress={() =>
                                isPending &&
                                toggleChecklistItem(request.id, item)
                              }
                              disabled={!isPending}
                              activeOpacity={isPending ? 0.6 : 1}
                              className="flex-row items-center py-2 gap-3"
                            >
                              <View
                                className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                                  checked
                                    ? "bg-secondary border-secondary"
                                    : "border-surface-container-highest bg-white"
                                }`}
                              >
                                {checked && (
                                  <MaterialIcons
                                    name="check"
                                    size={12}
                                    color="white"
                                  />
                                )}
                              </View>
                              <Text
                                className={`flex-1 text-sm ${
                                  checked
                                    ? "text-secondary line-through"
                                    : "text-on-surface"
                                }`}
                              >
                                {item}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Divider */}
                    <View className="h-px bg-surface-container-highest mx-5" />

                    {/* Action buttons */}
                    <View className="px-5 py-4 flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => openChatForRequest(request)}
                        activeOpacity={0.7}
                        className="h-11 px-4 rounded-2xl bg-background border border-surface-container-highest items-center justify-center flex-row gap-1.5"
                      >
                        <MaterialIcons
                          name="chat-bubble-outline"
                          size={16}
                          color="#7f7572"
                        />
                        <Text className="text-on-surface font-semibold text-sm">
                          Chat
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleVerdict(request, "completed")}
                        disabled={!isPending || !done}
                        activeOpacity={0.8}
                        className={`flex-1 h-11 rounded-2xl items-center justify-center flex-row gap-1.5 ${
                          !isPending || !done
                            ? "bg-secondary/20"
                            : "bg-secondary"
                        }`}
                      >
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={!isPending || !done ? "#a79a96" : "white"}
                        />
                        <Text
                          className={`font-bold text-sm ${
                            !isPending || !done
                              ? "text-on-surface-variant"
                              : "text-white"
                          }`}
                        >
                          Approve
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleVerdict(request, "rejected")}
                        disabled={!isPending || !done}
                        activeOpacity={0.8}
                        className={`flex-1 h-11 rounded-2xl items-center justify-center flex-row gap-1.5 ${
                          !isPending || !done ? "bg-error/20" : "bg-error"
                        }`}
                      >
                        <MaterialIcons
                          name="close"
                          size={16}
                          color={!isPending || !done ? "#a79a96" : "white"}
                        />
                        <Text
                          className={`font-bold text-sm ${
                            !isPending || !done
                              ? "text-on-surface-variant"
                              : "text-white"
                          }`}
                        >
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ════════════════════ CHAT MODAL ════════════════════ */}
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
          {/* Chat header */}
          <View className="px-4 py-3 border-b border-surface-container-highest flex-row items-center gap-3">
            <TouchableOpacity
              onPress={closeChat}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#3e2f2b" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text
                className="font-headline font-bold text-base text-on-surface"
                numberOfLines={1}
              >
                {selectedRequest?.pet_name || "Adoption Chat"}
              </Text>
              <Text
                className="text-xs text-on-surface-variant"
                numberOfLines={1}
              >
                {selectedRequest?.full_name || "Applicant"} ·{" "}
                {selectedRequest?.email || ""}
              </Text>
            </View>
            {selectedRequest && (
              <View
                className={`px-3 py-1 rounded-full ${
                  statusConfig(selectedRequest.status).bg
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    statusConfig(selectedRequest.status).text
                  }`}
                >
                  {statusConfig(selectedRequest.status).label}
                </Text>
              </View>
            )}
          </View>

          {/* Messages area */}
          <View className="flex-1">
            {messagesLoading ? (
              <View className="flex-1 items-center justify-center gap-2">
                <ActivityIndicator size="small" color="#fd8863" />
                <Text className="text-on-surface-variant text-sm">
                  Loading messages…
                </Text>
              </View>
            ) : chatTableMissing ? (
              <View className="flex-1 items-center justify-center px-8 gap-3">
                <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center">
                  <MaterialIcons
                    name="error-outline"
                    size={32}
                    color="#a83836"
                  />
                </View>
                <Text className="text-on-surface font-semibold text-center">
                  Chat table not found
                </Text>
                <Text className="text-on-surface-variant text-sm text-center">
                  Run the SQL in{" "}
                  <Text className="font-mono text-primary">
                    schema/adoption_request_chat.sql
                  </Text>{" "}
                  to enable messaging.
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={chatScrollRef}
                className="flex-1 px-4"
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
                onContentSizeChange={() =>
                  chatScrollRef.current?.scrollToEnd({ animated: false })
                }
              >
                {messages.length === 0 ? (
                  <View className="items-center py-16 gap-3">
                    <View className="w-16 h-16 rounded-full bg-surface-container-high items-center justify-center">
                      <MaterialIcons
                        name="chat-bubble-outline"
                        size={28}
                        color="#a79a96"
                      />
                    </View>
                    <Text className="text-on-surface font-semibold">
                      No messages yet
                    </Text>
                    <Text className="text-on-surface-variant text-sm text-center">
                      Start the conversation with the applicant.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-1">
                    {messages.map((message, idx) => {
                      const isMine = message.sender_id === adminUserId;
                      const showTime =
                        idx === messages.length - 1 ||
                        messages[idx + 1]?.sender_id !== message.sender_id;
                      return (
                        <View
                          key={message.id}
                          className={`${isMine ? "items-end" : "items-start"} ${
                            showTime ? "mb-3" : "mb-0.5"
                          }`}
                        >
                          <View
                            className={`max-w-[80%] px-4 py-3 ${
                              isMine
                                ? "bg-primary rounded-3xl rounded-br-lg"
                                : "bg-surface-container-high rounded-3xl rounded-bl-lg"
                            }`}
                          >
                            <Text
                              className={`text-sm leading-5 ${
                                isMine ? "text-white" : "text-on-surface"
                              }`}
                            >
                              {message.message}
                            </Text>
                          </View>
                          {showTime && (
                            <Text className="text-[10px] text-on-surface-variant mt-1 px-2">
                              {formatMessageTime(message.created_at)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Input bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View className="flex-row items-end gap-2 px-4 py-3 border-t border-surface-container-highest bg-background">
              <TextInput
                value={draftMessage}
                onChangeText={setDraftMessage}
                placeholder="Write a message…"
                placeholderTextColor="#a79a96"
                multiline
                className="flex-1 bg-surface-container-low rounded-2xl px-4 py-3 text-on-surface text-sm"
                style={{ maxHeight: 120 }}
                editable={!sendingMessage && !chatTableMissing}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={
                  sendingMessage || !draftMessage.trim() || chatTableMissing
                }
                activeOpacity={0.8}
                className={`w-11 h-11 rounded-full items-center justify-center ${
                  sendingMessage || !draftMessage.trim() || chatTableMissing
                    ? "bg-surface-container-highest"
                    : "bg-primary"
                }`}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#a79a96" />
                ) : (
                  <MaterialIcons
                    name="send"
                    size={18}
                    color={
                      !draftMessage.trim() || chatTableMissing
                        ? "#a79a96"
                        : "#ffffff"
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}
