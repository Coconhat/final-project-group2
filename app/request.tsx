import BottomNav from "@/components/BottomNav";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";

export default function RequestScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchRequests();
    }, []),
  );

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("adoption_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "completed":
        return {
          bg: "bg-secondary/10",
          text: "text-secondary",
          label: "Completed",
        };
      case "rejected":
        return {
          bg: "bg-error-container/20 border border-error/20",
          text: "text-error",
          label: "Rejected",
        };
      default:
        return {
          bg: "bg-surface-container-highest",
          text: "text-on-surface",
          label: "Pending",
        };
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen">
        <View className="mb-8 px-2">
          <Text className="font-headline font-extrabold text-3xl text-on-background leading-tight">
            Your Requests
          </Text>
          <Text className="text-on-surface-variant mt-2 text-sm">
            Keep track of your pending and past adoption applications.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fd8863" className="mt-10" />
        ) : requests.length === 0 ? (
          <View className="bg-surface-container-low rounded-xl p-8 items-center mt-4">
            <MaterialIcons name="pets" size={48} color="#e8e2d9" />
            <Text className="text-on-surface-variant text-center mt-4">
              You haven't submitted any adoption requests yet.
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
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
