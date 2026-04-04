import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
};

type RequestMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
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

export default function RequestScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [chatVisible, setChatVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<AdoptionRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatTableMissing, setChatTableMissing] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageChannelRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, []),
  );

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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        setRequests([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("adoption_requests")
        .select("id, pet_name, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "completed", "rejected"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as AdoptionRequest[]) || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_META[status?.toLowerCase()] || STATUS_META.pending;
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
      .channel(`request-chat-${requestId}`)
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
    if (!currentUserId) {
      router.push("/login");
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
    if (!selectedRequest || !currentUserId) {
      return;
    }

    const messageText = draftMessage.trim();
    if (!messageText || sendingMessage) {
      return;
    }

    if (selectedRequest.status?.toLowerCase() !== "pending") {
      Alert.alert(
        "Chat closed",
        "This request is no longer pending, so chat is read-only.",
      );
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

  const chatIsClosed =
    !!selectedRequest && selectedRequest.status?.toLowerCase() !== "pending";

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
            Your Requests
          </Text>
          <Text className="text-on-surface-variant mt-2 text-sm">
            Track your applications and chat live with the adoption team.
          </Text>
        </View>

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
              <Text className="text-on-primary font-bold">Log in / Sign up</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
            <MaterialIcons name="pets" size={48} color="#e8e2d9" />
            <Text className="text-on-surface-variant text-center mt-4">
              You have not submitted any adoption requests yet.
            </Text>
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
                      {request.status === "pending"
                        ? "Your application is under review."
                        : request.status === "completed"
                          ? "Congratulations on your adoption!"
                          : "Unfortunately, this request was not approved."}
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
        <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
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
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingTop: 16,
                paddingBottom: 24,
                paddingHorizontal: 10,
                flexGrow: messages.length === 0 ? 1 : 0,
              }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-8">
                  <MaterialIcons
                    name="forum"
                    size={42}
                    color="#b0a39f"
                  />
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="px-3 pt-2 pb-3 border-t border-surface-container-highest bg-background">
              {chatIsClosed && (
                <View className="mb-2 px-3 py-2 rounded-xl bg-surface-container-low">
                  <Text className="text-on-surface-variant text-xs">
                    Chat is read-only because this request is no longer pending.
                  </Text>
                </View>
              )}
              <View className="flex-row items-end gap-2">
                <TextInput
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  placeholder="Write a message"
                  placeholderTextColor="#a79a96"
                  multiline
                  editable={!chatIsClosed && !sendingMessage && !chatTableMissing}
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

      <BottomNav />
    </View>
  );
}
