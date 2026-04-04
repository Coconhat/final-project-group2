import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type AdoptionRequest = {
  id: string;
  pet_name: string | null;
  status: "pending" | "completed" | "rejected" | string;
  created_at: string;
  full_name?: string;
  email?: string;
  phone?: string;
  own_or_rent?: string;
  housing_type?: string;
  other_housing_type?: string | null;
  has_yard?: boolean;
  adult_count?: number;
  child_count?: number;
  other_pets?: string | null;
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

const STATUS_META: Record<
  string,
  { bg: string; text: string; label: "Pending" | "Completed" | "Rejected" }
> = {
  pending: {
    bg: "bg-surface-container-highest",
    text: "text-on-surface",
    label: "Pending",
  },
  completed: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    label: "Completed",
  },
  rejected: {
    bg: "bg-error-container/20 border border-error/20",
    text: "text-error",
    label: "Rejected",
  },
};

const checklistItems = [
  "Identity verified",
  "Housing suitability checked",
  "Household size confirmed",
  "Other pets considered",
  "Lifestyle and schedule reviewed",
  "Pet health and fit confirmed",
];

let cachedIsAdminForRequest: boolean | null = null;

export default function RequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(
    cachedIsAdminForRequest,
  );
  const [adminFilter, setAdminFilter] = useState<"pending" | "completed">(
    "pending",
  );
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [latestMessages, setLatestMessages] = useState<Record<string, string>>(
    {},
  );

  const [chatVisible, setChatVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<AdoptionRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatTableMissing, setChatTableMissing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageChannelRef = useRef<any>(null);
  const requestStatusChannelRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const ensureChecklistState = useCallback((items: AdoptionRequest[]) => {
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
  }, []);

  const cleanupMessageChannel = useCallback(async () => {
    if (messageChannelRef.current) {
      await supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
  }, []);

  const cleanupRequestStatusChannel = useCallback(async () => {
    if (requestStatusChannelRef.current) {
      await supabase.removeChannel(requestStatusChannelRef.current);
      requestStatusChannelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      void cleanupMessageChannel();
      void cleanupRequestStatusChannel();
    };
  }, [cleanupMessageChannel, cleanupRequestStatusChannel]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setRequestsError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        cachedIsAdminForRequest = false;
        setIsAdmin(false);
        setRequests([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const roleFromMetadata =
        typeof user.user_metadata?.role === "string"
          ? String(user.user_metadata.role).toLowerCase()
          : null;

      if (roleFromMetadata) {
        const metadataIsAdmin = roleFromMetadata === "admin";
        cachedIsAdminForRequest = metadataIsAdmin;
        setIsAdmin(metadataIsAdmin);
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const roleFromProfile =
        typeof profile?.role === "string" ? profile.role.toLowerCase() : null;
      const admin =
        roleFromProfile === "admin" ||
        roleFromMetadata === "admin" ||
        (!!profileError && cachedIsAdminForRequest === true);

      cachedIsAdminForRequest = admin;
      setIsAdmin(admin);

      let fetchedRequests: AdoptionRequest[] = [];

      if (admin) {
        const { data, error } = await supabase
          .from("adoption_requests")
          .select(
            "id, pet_name, status, created_at, full_name, email, phone, own_or_rent, housing_type, other_housing_type, has_yard, adult_count, child_count, other_pets",
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        fetchedRequests = ((data as AdoptionRequest[]) || []).map(
          (request) => ({
            ...request,
            status: normalizeRequestStatus(request.status),
          }),
        );
        setRequests(fetchedRequests);
        ensureChecklistState(fetchedRequests);
      } else {
        const { data, error } = await supabase
          .from("adoption_requests")
          .select("id, pet_name, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        fetchedRequests = ((data as AdoptionRequest[]) || []).map(
          (request) => ({
            ...request,
            status: normalizeRequestStatus(request.status),
          }),
        );
        setRequests(fetchedRequests);
      }

      if (fetchedRequests.length > 0) {
        const threadIds = fetchedRequests.map((t) => t.id);
        const { data: msgs, error: msgError } = await supabase
          .from("adoption_request_messages")
          .select("request_id, message")
          .in("request_id", threadIds)
          .order("created_at", { ascending: false });

        if (!msgError && msgs) {
          const latestMap: Record<string, string> = {};
          msgs.forEach((m) => {
            if (!latestMap[m.request_id]) latestMap[m.request_id] = m.message;
          });
          setLatestMessages(latestMap);
        }
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      if (cachedIsAdminForRequest === null) {
        cachedIsAdminForRequest = false;
        setIsAdmin(false);
      }
      setRequests([]);
      setRequestsError(error?.message || "Failed to load adoption requests.");
    } finally {
      setLoading(false);
    }
  }, [ensureChecklistState]);

  useFocusEffect(
    useCallback(() => {
      void fetchRequests();
    }, [fetchRequests]),
  );

  useEffect(() => {
    const subscribeToRequestUpdates = async () => {
      await cleanupRequestStatusChannel();

      if (!currentUserId) {
        return;
      }

      if (isAdmin === null) {
        return;
      }

      const channelName = `request-status-${currentUserId}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "adoption_requests",
            ...(isAdmin === true
              ? {}
              : { filter: `user_id=eq.${currentUserId}` }),
          },
          (payload) => {
            const incoming = payload.new as AdoptionRequest;
            const normalizedIncoming = {
              ...incoming,
              status: normalizeRequestStatus(incoming.status),
            };

            setRequests((current) =>
              current.map((request) =>
                request.id === normalizedIncoming.id
                  ? { ...request, ...normalizedIncoming }
                  : request,
              ),
            );

            setSelectedRequest((current) =>
              current && current.id === normalizedIncoming.id
                ? { ...current, ...normalizedIncoming }
                : current,
            );
          },
        )
        .subscribe();

      requestStatusChannelRef.current = channel;
    };

    void subscribeToRequestUpdates();

    return () => {
      void cleanupRequestStatusChannel();
    };
  }, [cleanupRequestStatusChannel, currentUserId, isAdmin]);

  const getStatusColor = (status: string) => {
    return STATUS_META[status?.toLowerCase()] || STATUS_META.pending;
  };

  const filteredAdminRequests = useMemo(() => {
    if (isAdmin !== true) {
      return requests;
    }

    if (adminFilter === "pending") {
      return requests.filter(
        (request) => normalizeRequestStatus(request.status) === "pending",
      );
    }

    return requests.filter(
      (request) => normalizeRequestStatus(request.status) !== "pending",
    );
  }, [adminFilter, isAdmin, requests]);

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

  const subscribeToMessages = async (requestId: string) => {
    await cleanupMessageChannel();

    const channelName = `request-chat-${requestId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
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
          setLatestMessages((currentMap) => ({
            ...currentMap,
            [requestId]: incoming.message,
          }));
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
    if (isAdmin) {
      router.push(`/chat?requestId=${request.id}`);
      return;
    }

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setSelectedRequest(request);
    setChatVisible(true);
    setDraftMessage("");
    await loadMessages(request.id);
    await subscribeToMessages(request.id);
  };

  const closeChat = () => {
    void cleanupMessageChannel();
    setChatVisible(false);
    setSelectedRequest(null);
    setMessages([]);
    setDraftMessage("");
    setChatTableMissing(false);
  };

  const sendMessage = async () => {
    if (!selectedRequest || !currentUserId) {
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
        sender_id: currentUserId,
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

  const formatMessageTime = (isoDate: string) =>
    new Date(isoDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const chatIsClosed = false;

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
    if (!isAdmin) {
      return;
    }

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

    const { data: updatedRequest, error } = await supabase
      .from("adoption_requests")
      .update({ status: nextStatus })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }

    if (!updatedRequest) {
      Alert.alert(
        "Update failed",
        "Could not update this request in the database. Please check your Supabase update policy for admins.",
      );
      return;
    }

    const confirmedStatus = normalizeRequestStatus(updatedRequest.status);

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id ? { ...item, status: confirmedStatus } : item,
      ),
    );

    setSelectedRequest((current) =>
      current && current.id === request.id
        ? { ...current, status: confirmedStatus }
        : current,
    );

    if (currentUserId) {
      await supabase.from("adoption_request_messages").insert([
        {
          request_id: request.id,
          sender_id: currentUserId,
          message:
            confirmedStatus === "completed"
              ? "Your adoption request has been approved. Please give us a preferred date and time to pick up your pet."
              : "Your adoption request was not approved this time. Thank you for your interest.",
        },
      ]);
    }
  };

  const handleCancelRequest = async (request: AdoptionRequest) => {
    if (!currentUserId || isAdmin) {
      return;
    }

    if (request.status !== "pending") {
      Alert.alert("Cannot cancel", "Only pending requests can be cancelled.");
      return;
    }

    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this adoption request?",
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("adoption_requests")
              .update({ status: "rejected" })
              .eq("id", request.id)
              .eq("user_id", currentUserId);

            if (error) {
              Alert.alert("Cancel failed", error.message);
              return;
            }

            setRequests((current) =>
              current.map((item) =>
                item.id === request.id ? { ...item, status: "rejected" } : item,
              ),
            );

            setSelectedRequest((current) =>
              current && current.id === request.id
                ? { ...current, status: "rejected" }
                : current,
            );

            await supabase.from("adoption_request_messages").insert([
              {
                request_id: request.id,
                sender_id: currentUserId,
                message:
                  "I would like to cancel my adoption request. Thank you for your help.",
              },
            ]);

            Alert.alert("Cancelled", "Your request has been cancelled.");
          },
        },
      ],
    );
  };

  const renderMessage = ({ item }: { item: RequestMessage }) => {
    const isMine = item.sender_id === currentUserId;

    return (
      <View className={`mb-2 px-2 ${isMine ? "items-end" : "items-start"}`}>
        <View
          className={`max-w-[82%] rounded-3xl px-4 py-3 ${
            isMine
              ? "bg-primary rounded-br-md"
              : "bg-surface-container-high rounded-bl-md"
          }`}
        >
          <Text className={isMine ? "text-on-primary" : "text-on-surface"}>
            {item.message}
          </Text>
        </View>
        <Text className="text-[10px] text-on-surface-variant mt-1 px-1">
          {formatMessageTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen">
        <View className="mb-8 px-2">
          <Text className="font-headline font-extrabold text-3xl text-on-background leading-tight">
            {isAdmin === true
              ? "Review Requests"
              : isAdmin === false
                ? "Your Requests"
                : "Requests"}
          </Text>
          <Text className="text-on-surface-variant mt-2 text-sm">
            {isAdmin === true
              ? "Check applications and complete the checklist before giving a verdict."
              : isAdmin === false
                ? "Track your applications and chat live with the adoption team."
                : "Loading your request experience..."}
          </Text>
        </View>

        {isAdmin === true && (
          <View className="mb-4 px-2">
            <View className="bg-surface-container-low rounded-full p-1 flex-row">
              <TouchableOpacity
                onPress={() => setAdminFilter("pending")}
                className={`flex-1 h-10 rounded-full items-center justify-center ${
                  adminFilter === "pending" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold ${
                    adminFilter === "pending"
                      ? "text-on-primary"
                      : "text-on-surface"
                  }`}
                >
                  Pending
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdminFilter("completed")}
                className={`flex-1 h-10 rounded-full items-center justify-center ${
                  adminFilter === "completed" ? "bg-primary" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold ${
                    adminFilter === "completed"
                      ? "text-on-primary"
                      : "text-on-surface"
                  }`}
                >
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#fd8863" className="mt-10" />
        ) : !currentUserId ? (
          <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
            <MaterialIcons name="lock-outline" size={44} color="#a79a96" />
            <Text className="text-on-surface text-center mt-4 font-bold">
              You are not logged in.
            </Text>
            <Text className="text-on-surface-variant text-center mt-1">
              Sign in to view requests and use real-time chat.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="mt-4 h-11 px-6 rounded-full bg-primary items-center justify-center"
            >
              <Text className="text-on-primary font-bold">
                Log in / Sign up
              </Text>
            </TouchableOpacity>
          </View>
        ) : (isAdmin === true ? filteredAdminRequests : requests).length ===
          0 ? (
          <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
            <MaterialIcons name="pets" size={48} color="#e8e2d9" />
            <Text className="text-on-surface-variant text-center mt-4">
              {isAdmin === true
                ? adminFilter === "pending"
                  ? "No pending requests right now."
                  : "No completed requests yet."
                : "You have not submitted any adoption requests yet."}
            </Text>
            {isAdmin === true && (
              <Text className="text-on-surface-variant text-center mt-2 text-xs">
                If you know there are submissions, check adoption_requests
                select policy for admins.
              </Text>
            )}
            {!!requestsError && (
              <Text className="text-error text-center mt-2 text-xs">
                {requestsError}
              </Text>
            )}
          </View>
        ) : isAdmin === true ? (
          <View className="space-y-3">
            {filteredAdminRequests.map((request) => {
              const statusConfig = getStatusColor(request.status);
              const done = checklistComplete(request.id);
              return (
                <View
                  key={request.id}
                  className="bg-surface-container-low rounded-2xl p-4 mb-3"
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
                        {request.full_name || "Applicant"} | {request.email}
                      </Text>
                      <Text
                        className="text-on-surface-variant text-sm"
                        numberOfLines={1}
                      >
                        {request.phone || ""}
                      </Text>
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${statusConfig.bg}`}
                    >
                      <Text
                        className={`uppercase text-[10px] font-bold ${statusConfig.text}`}
                      >
                        {statusConfig.label}
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
                          {request.own_or_rent || "-"}
                        </Text>
                      </View>
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Housing
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.housing_type || "-"}
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
                          {request.adult_count ?? 0}
                        </Text>
                      </View>
                      <View className="px-3 py-2 rounded-lg bg-surface-container-low">
                        <Text className="text-xs text-on-surface-variant">
                          Children
                        </Text>
                        <Text className="text-sm text-on-surface font-bold">
                          {request.child_count ?? 0}
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
                      <Text className="text-on-surface font-bold">
                        Open Chat Tab
                      </Text>
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
        ) : (
          <View className="space-y-3">
            {requests.map((request) => {
              const statusConfig = getStatusColor(request.status);
              return (
                <TouchableOpacity
                  key={request.id}
                  className="group relative bg-surface-container-low rounded-xl p-5 flex-row items-start gap-4 mb-3"
                  onPress={() => openChatForRequest(request)}
                >
                  <View className="relative flex-shrink-0">
                    <View className="w-16 h-16 rounded-full bg-surface-container-high items-center justify-center border-2 border-surface-container-highest">
                      <MaterialIcons name="pets" size={32} color="#a79a96" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text
                        className="font-headline font-bold text-lg"
                        numberOfLines={1}
                      >
                        {request.pet_name || "Unknown Pet"}
                      </Text>
                      <Text className="text-xs font-semibold text-on-surface-variant">
                        {new Date(request.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text
                      className="text-on-surface-variant text-sm mb-3"
                      numberOfLines={1}
                    >
                      {latestMessages[request.id] ||
                        (request.status === "pending"
                          ? "Your application is under review."
                          : request.status === "completed"
                            ? "Congratulations on your adoption!"
                            : "Unfortunately, this request was not approved.")}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <View
                        className={`px-3 py-1 rounded-full ${statusConfig.bg}`}
                      >
                        <Text
                          className={`text-[10px] font-bold tracking-wider uppercase ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </Text>
                      </View>
                      <View className="px-3 py-1 rounded-full bg-primary/10">
                        <Text className="text-[10px] font-bold tracking-wider uppercase text-primary">
                          Open Chat
                        </Text>
                      </View>
                    </View>
                    {request.status === "pending" && (
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(request)}
                        className="mt-3 self-start px-3 py-2 rounded-full bg-error/10"
                      >
                        <Text className="text-error text-xs font-bold uppercase tracking-wider">
                          Cancel Request
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeChat}
      >
        <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
          <View
            style={{ paddingTop: Math.max(insets.top, 12) + 6 }}
            className="z-30 px-4 pb-4 border-b border-surface-container-highest flex-row items-center gap-3 bg-background"
          >
            <Pressable
              onPress={closeChat}
              hitSlop={24}
              className="w-11 h-11 rounded-full bg-surface-container-low items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#3e2f2b" />
            </Pressable>
            <View className="flex-1">
              <Text className="font-headline font-bold text-lg text-on-surface">
                {selectedRequest?.pet_name || "Adoption Chat"}
              </Text>
              {selectedRequest && (
                <View className="flex-row items-center gap-2 mt-0.5">
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      getStatusColor(selectedRequest.status).bg
                    }`}
                  >
                    <Text
                      className={`text-[10px] uppercase font-bold ${
                        getStatusColor(selectedRequest.status).text
                      }`}
                    >
                      {getStatusColor(selectedRequest.status).label}
                    </Text>
                  </View>
                  <Text className="text-xs text-on-surface-variant">
                    Real-time messaging
                  </Text>
                </View>
              )}
            </View>
          </View>

          {chatTableMissing ? (
            <View className="mx-4 mt-4 bg-surface-container-low rounded-2xl p-4">
              <Text className="font-bold text-on-surface mb-2">
                Chat table not found
              </Text>
              <Text className="text-on-surface-variant text-sm leading-5">
                Create table public.adoption_request_messages with columns id
                (uuid), request_id (uuid), sender_id (uuid), message (text),
                created_at (timestamptz). Then enable Supabase Realtime for this
                table.
              </Text>
            </View>
          ) : messagesLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#fd8863" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              contentContainerStyle={{
                paddingTop: 16,
                paddingBottom: 24,
                paddingHorizontal: 10,
                flexGrow: messages.length === 0 ? 1 : 0,
              }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-8">
                  <MaterialIcons name="forum" size={42} color="#b0a39f" />
                  <Text className="text-on-surface mt-3 font-bold text-base">
                    Start the conversation
                  </Text>
                  <Text className="text-on-surface-variant text-center mt-1">
                    Ask for updates, timeline, or next steps for this request.
                  </Text>
                </View>
              }
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View className="px-3 pt-2 pb-6 border-t border-surface-container-highest bg-background">
              {chatIsClosed && (
                <View className="mb-2 px-3 py-2 rounded-xl bg-surface-container-low">
                  <Text className="text-on-surface-variant text-xs">
                    Chat is read-only because this request is no longer pending.
                  </Text>
                </View>
              )}
              <View className="flex-row items-end gap-2 mb-4">
                <TextInput
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  placeholder="Write a messageasdasdasd"
                  placeholderTextColor="#a79a96"
                  multiline
                  editable={
                    !chatIsClosed && !sendingMessage && !chatTableMissing
                  }
                  className="flex-1 min-h-11 max-h-28 px-4 py-3 rounded-3xl bg-surface-container-low text-on-surface"
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={
                    chatIsClosed ||
                    sendingMessage ||
                    chatTableMissing ||
                    !draftMessage.trim()
                  }
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    chatIsClosed ||
                    sendingMessage ||
                    chatTableMissing ||
                    !draftMessage.trim()
                      ? "bg-surface-container-highest"
                      : "bg-primary"
                  }`}
                >
                  <MaterialIcons
                    name="send"
                    size={18}
                    color={
                      chatIsClosed ||
                      sendingMessage ||
                      chatTableMissing ||
                      !draftMessage.trim()
                        ? "#8f8380"
                        : "#ffffff"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {!chatVisible && <BottomNav />}
    </View>
  );
}
