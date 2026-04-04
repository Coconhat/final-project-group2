import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AdoptionRequest = {
  id: string;
  pet_name: string | null;
  status: "pending" | "completed" | "rejected" | string;
  created_at: string;
  full_name?: string;
  email?: string;
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

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestIdFromParams = Array.isArray(params.requestId)
    ? params.requestId[0]
    : params.requestId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [threads, setThreads] = useState<AdoptionRequest[]>([]);
  const [adminFilter, setAdminFilter] = useState<"pending" | "completed">(
    "pending",
  );
  const [unreadThreadIds, setUnreadThreadIds] = useState<
    Record<string, boolean>
  >({});
  const [latestMessages, setLatestMessages] = useState<Record<string, string>>(
    {},
  );

  const [selectedRequest, setSelectedRequest] =
    useState<AdoptionRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatTableMissing, setChatTableMissing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const messageChannelRef = useRef<any>(null);
  const requestStatusChannelRef = useRef<any>(null);
  const inboxChannelRef = useRef<any>(null);
  const autoOpenedRequestIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const cleanupInboxChannel = useCallback(async () => {
    if (inboxChannelRef.current) {
      await supabase.removeChannel(inboxChannelRef.current);
      inboxChannelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      void cleanupMessageChannel();
      void cleanupRequestStatusChannel();
      void cleanupInboxChannel();
    };
  }, [cleanupInboxChannel, cleanupMessageChannel, cleanupRequestStatusChannel]);

  const filteredThreads = useMemo(() => {
    if (adminFilter === "pending") {
      return threads.filter(
        (thread) => normalizeRequestStatus(thread.status) === "pending",
      );
    }

    return threads.filter(
      (thread) => normalizeRequestStatus(thread.status) === "completed",
    );
  }, [adminFilter, threads]);

  const loadMessages = useCallback(async (requestId: string) => {
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
      }
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages((data as RequestMessage[]) || []);
    setMessagesLoading(false);
  }, []);

  const subscribeToMessages = useCallback(
    async (requestId: string) => {
      await cleanupMessageChannel();

      const channelName = `admin-chat-${requestId}-${Date.now()}`;

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
    },
    [cleanupMessageChannel],
  );

  const openThread = useCallback(
    async (request: AdoptionRequest) => {
      setUnreadThreadIds((current) => {
        if (!current[request.id]) {
          return current;
        }

        const next = { ...current };
        delete next[request.id];
        return next;
      });
      setSelectedRequest(request);
      setDraftMessage("");
      await loadMessages(request.id);
      await subscribeToMessages(request.id);
    },
    [loadMessages, subscribeToMessages],
  );

  const closeThread = () => {
    void cleanupMessageChannel();
    setSelectedRequest(null);
    setMessages([]);
    setDraftMessage("");
    setChatTableMissing(false);
    if (requestIdFromParams) {
      router.replace("/chat");
      autoOpenedRequestIdRef.current = null;
    }
  };

  const fetchThreads = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        setIsAdmin(false);
        setThreads([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const roleFromProfile =
        typeof profile?.role === "string" ? profile.role.toLowerCase() : null;
      const roleFromMetadata =
        typeof user.user_metadata?.role === "string"
          ? String(user.user_metadata.role).toLowerCase()
          : null;
      const admin = roleFromProfile === "admin" || roleFromMetadata === "admin";
      setIsAdmin(admin);

      if (!admin) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("adoption_requests")
        .select("id, pet_name, status, created_at, full_name, email")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const nextThreads = ((data as AdoptionRequest[]) || []).map(
        (request) => ({
          ...request,
          status: normalizeRequestStatus(request.status),
        }),
      );

      const threadIds = nextThreads.map((t) => t.id);

      if (threadIds.length > 0) {
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

      setThreads(nextThreads);
      setUnreadThreadIds((current) => {
        const next = { ...current };
        for (const requestId of Object.keys(next)) {
          if (!nextThreads.some((thread) => thread.id === requestId)) {
            delete next[requestId];
          }
        }
        return next;
      });

      setSelectedRequest((current) => {
        if (!current) {
          return current;
        }
        const refreshedSelected = nextThreads.find(
          (thread) => thread.id === current.id,
        );
        return refreshedSelected || current;
      });

      if (requestIdFromParams) {
        if (autoOpenedRequestIdRef.current !== requestIdFromParams) {
          const preselected = nextThreads.find(
            (thread) => thread.id === requestIdFromParams,
          );
          if (preselected) {
            autoOpenedRequestIdRef.current = requestIdFromParams;
            await openThread(preselected);
          }
        }
      }
    } catch (error) {
      console.error("Error loading admin chat threads:", error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [openThread, requestIdFromParams]);

  useEffect(() => {
    if (!requestIdFromParams) {
      autoOpenedRequestIdRef.current = null;
    }
  }, [requestIdFromParams]);

  useEffect(() => {
    const subscribeToInboxMessages = async () => {
      await cleanupInboxChannel();

      if (!currentUserId || !isAdmin) {
        return;
      }

      const channelName = `admin-chat-inbox-${currentUserId}-${Date.now()}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "adoption_request_messages",
          },
          (payload) => {
            const incoming = payload.new as RequestMessage;

            if (!incoming?.request_id) {
              return;
            }

            setLatestMessages((current) => ({
              ...current,
              [incoming.request_id]: incoming.message,
            }));

            if (incoming.sender_id === currentUserId) {
              return;
            }

            if (selectedRequest?.id === incoming.request_id) {
              return;
            }

            setUnreadThreadIds((current) => ({
              ...current,
              [incoming.request_id]: true,
            }));
          },
        )
        .subscribe();

      inboxChannelRef.current = channel;
    };

    void subscribeToInboxMessages();

    return () => {
      void cleanupInboxChannel();
    };
  }, [cleanupInboxChannel, currentUserId, isAdmin, selectedRequest?.id]);

  useEffect(() => {
    const subscribeToRequestStatus = async () => {
      await cleanupRequestStatusChannel();

      if (!currentUserId || !isAdmin) {
        return;
      }

      const channelName = `admin-request-status-${currentUserId}-${Date.now()}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "adoption_requests",
          },
          (payload) => {
            const incoming = payload.new as AdoptionRequest;
            const normalizedIncoming = {
              ...incoming,
              status: normalizeRequestStatus(incoming.status),
            };

            setThreads((current) =>
              current.map((thread) =>
                thread.id === normalizedIncoming.id
                  ? { ...thread, ...normalizedIncoming }
                  : thread,
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

    void subscribeToRequestStatus();

    return () => {
      void cleanupRequestStatusChannel();
    };
  }, [cleanupRequestStatusChannel, currentUserId, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void fetchThreads();
    }, [fetchThreads]),
  );

  const sendMessage = async () => {
    if (!selectedRequest || !currentUserId || sendingMessage) {
      return;
    }

    const text = draftMessage.trim();
    if (!text || chatTableMissing) {
      return;
    }

    setSendingMessage(true);

    const { error } = await supabase.from("adoption_request_messages").insert([
      {
        request_id: selectedRequest.id,
        sender_id: currentUserId,
        message: text,
      },
    ]);

    if (error) {
      if (error.code === "42P01") {
        setChatTableMissing(true);
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

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#fd8863" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {!currentUserId ? (
          <View className="flex-1 px-4 pt-24">
            <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
              <MaterialIcons name="lock-outline" size={44} color="#a79a96" />
              <Text className="text-on-surface text-center mt-4 font-bold">
                You are not logged in.
              </Text>
              <Text className="text-on-surface-variant text-center mt-1">
                Sign in to view chat updates.
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
          </View>
        ) : !isAdmin ? (
          <View className="flex-1 px-4 pt-24">
            <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
              <MaterialIcons name="forum" size={44} color="#a79a96" />
              <Text className="text-on-surface text-center mt-4 font-bold">
                Admin chat only
              </Text>
              <Text className="text-on-surface-variant text-center mt-1">
                Chat tab is reserved for admin. Your own conversations are in
                Requests.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/request")}
                className="mt-4 h-11 px-6 rounded-full bg-primary items-center justify-center"
              >
                <Text className="text-on-primary font-bold">Open Requests</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !selectedRequest ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pt-8 pb-36 px-4"
          >
            <View className="mb-8 px-2">
              <Text className="font-headline font-extrabold text-3xl text-on-background leading-tight">
                Admin Chats
              </Text>
              <Text className="text-on-surface-variant mt-2 text-sm">
                All request conversations in one place.
              </Text>
            </View>

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
                    adminFilter === "completed"
                      ? "bg-primary"
                      : "bg-transparent"
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

            {filteredThreads.length === 0 ? (
              <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
                <MaterialIcons name="forum" size={48} color="#e8e2d9" />
                <Text className="text-on-surface-variant text-center mt-4">
                  {adminFilter === "pending"
                    ? "No pending request threads."
                    : "No completed request threads."}
                </Text>
              </View>
            ) : (
              filteredThreads.map((thread) => {
                const statusConfig =
                  STATUS_META[thread.status] || STATUS_META.pending;
                const hasUnread = !!unreadThreadIds[thread.id];
                return (
                  <TouchableOpacity
                    key={thread.id}
                    className="bg-surface-container-low rounded-xl p-4 mb-3"
                    onPress={() => {
                      void openThread(thread);
                    }}
                  >
                    <View className="flex-row justify-between items-start gap-3">
                      <View className="flex-1">
                        <Text
                          className="font-headline font-bold text-lg text-on-surface"
                          numberOfLines={1}
                        >
                          {thread.pet_name || "Unknown Pet"}
                        </Text>
                        <Text
                          className="text-on-surface-variant text-sm"
                          numberOfLines={1}
                        >
                          {thread.full_name || "Applicant"}
                          {thread.email ? ` | ${thread.email}` : ""}
                        </Text>
                      </View>
                      <View className="items-end gap-2">
                        {hasUnread && (
                          <View className="h-2.5 w-2.5 rounded-full bg-error" />
                        )}
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
                    </View>
                    <Text
                      numberOfLines={1}
                      className={`text-xs mt-3 ${
                        hasUnread
                          ? "text-error font-bold"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {latestMessages[thread.id] ||
                        (hasUnread ? "New message" : "Open conversation")}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        ) : (
          <View className="flex-1">
            <View className="z-20 px-4 pt-2 pb-3 border-b border-surface-container-highest flex-row items-center gap-3 bg-background">
              <Pressable
                onPress={closeThread}
                hitSlop={14}
                className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center"
              >
                <MaterialIcons name="arrow-back" size={22} color="#3e2f2b" />
              </Pressable>
              <View className="flex-1">
                <Text className="font-headline font-bold text-lg text-on-surface">
                  {selectedRequest.pet_name || "Adoption Chat"}
                </Text>
                <Text className="text-xs text-on-surface-variant">
                  {selectedRequest.full_name || "Applicant"}
                  {selectedRequest.email ? ` | ${selectedRequest.email}` : ""}
                </Text>
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
                  created_at (timestamptz). Then enable Supabase Realtime for
                  this table.
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
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center px-8">
                    <MaterialIcons name="forum" size={42} color="#b0a39f" />
                    <Text className="text-on-surface mt-3 font-bold text-base">
                      Start the conversation
                    </Text>
                    <Text className="text-on-surface-variant text-center mt-1">
                      Chat with the applicant about next steps.
                    </Text>
                  </View>
                }
              />
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View className="px-3 pt-2 pb-32 border-t border-surface-container-highest bg-background">
                <View className="flex-row items-end gap-2 mb-4">
                  <TextInput
                    value={draftMessage}
                    onChangeText={setDraftMessage}
                    placeholder="Write a message"
                    placeholderTextColor="#a79a96"
                    multiline
                    editable={!sendingMessage && !chatTableMissing}
                    className="flex-1 min-h-11 max-h-28 px-4 py-3 rounded-3xl bg-surface-container-low text-on-surface "
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={
                      sendingMessage || chatTableMissing || !draftMessage.trim()
                    }
                    className={`w-11 h-11 rounded-full items-center justify-center ${
                      sendingMessage || chatTableMissing || !draftMessage.trim()
                        ? "bg-surface-container-highest"
                        : "bg-primary"
                    }`}
                  >
                    <MaterialIcons
                      name="send"
                      size={18}
                      color={
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
          </View>
        )}
      </SafeAreaView>

      {!selectedRequest && <BottomNav />}
    </View>
  );
}
