import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import Header from "@/components/header";

export default function FavoritesScreen() {
  return (
    <View className="flex-1 bg-background pb-12">
      <Header />

      <ScrollView
        contentContainerClassName="pt-32 pb-40 px-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-10">
          <Text className="font-headline text-4xl font-extrabold text-on-background leading-tight">
            Your Saved{"\n"}
            <Text className="text-primary">Companions</Text>
          </Text>
          <Text className="font-body text-on-surface-variant mt-2 max-w-xs">
            A curated collection of the pets that captured your heart.
          </Text>
        </View>

        {/* Grid Layout Container */}
        <View className="flex-col gap-6">
          {/* Pet Card 1: Large Featured Dog */}
          <View className="bg-surface-container-highest rounded-xl overflow-hidden shadow-none">
            <View className="relative h-[300px] md:h-[400px]">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6d2Q7ym_pe1JhzIHBayKZHXn26jd6keA7OMQIfxIZ5AbtKlDDHFyuXXOSlS1Dmh-jlfExyGVRJZW1iM8y8uu928fTIASJ-VU5TNUsVoTpKz2zSKVWRyKGy3qZp9jfVGMQ4syBIjxm7Gbwu7VSrQd06tnIkYB_850G1Q5pSluq4-y_9kPgebQnUtdpM8tqEM-fw3YUm2eobePGv1ui6Tm6CSta5O3QCQGJEXubnltoXZatkF-8PNeOngzFKVg5BYgWaSdKK_h8OCXN",
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute top-6 right-6">
                <TouchableOpacity className="bg-white/90 p-3 rounded-full justify-center items-center">
                  <MaterialIcons name="favorite" size={24} color="#a04223" />
                </TouchableOpacity>
              </View>
              {/* Gradient overlay simulated with a semi-transparent view since native gradients require expo-linear-gradient */}
              <View className="absolute bottom-0 left-0 right-0 p-8 bg-black/40 pt-16">
                <View className="flex-row items-end justify-between">
                  <View>
                    <View className="bg-tertiary-container px-4 py-1 rounded-full mb-2 self-start">
                      <Text className="text-on-tertiary-container text-xs font-bold uppercase tracking-wider">
                        Best Match
                      </Text>
                    </View>
                    <Text className="font-headline text-3xl font-bold text-white">
                      Oliver
                    </Text>
                    <Text className="font-body text-white/90">
                      Golden Retriever • 2 Years
                    </Text>
                  </View>
                  <TouchableOpacity className="bg-primary px-6 py-3 rounded-full flex-row items-center justify-center">
                    <Text className="text-white font-bold">Adopt Me</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Row for Small Cards (Cats/Hamsters) */}
          <View className="flex-row gap-6">
            {/* Pet Card 2: Small Card Cat */}
            <View className="bg-surface-container-low rounded-xl p-4 flex-1 flex-col gap-4">
              <View className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  source={{
                    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfXWQlooWKMIWQ4nYLaYYQPDFtdjXNFiu0su5QJm0uDyZ6wxNnoRWwR-WDnGvGthrp4qdKAq3yu0xNEiC8z5yE_Rdm552V2NV7_aXnAHe9d-raEq5PtP7NTiWvEkyfo7cikQ4u93d2OtzxC-Mvs-A-LPltUen7aZQ0XqRY6dHU5jFpuF6bcVusKdbNKnoSssiip_iIMAoxYu8uNCco42DlZr2iNeSPyVBbQVey0GqdWET7AAOtT5O0-WtwJil0S-0ri707s2iYCksM",
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <TouchableOpacity className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow-sm items-center justify-center">
                  <MaterialIcons name="favorite" size={20} color="#a04223" />
                </TouchableOpacity>
              </View>
              <View className="px-2 pb-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-headline text-xl font-bold text-on-surface">
                    Luna
                  </Text>
                  <View className="px-2 py-0.5 rounded-md bg-secondary-container">
                    <Text className="text-xs font-semibold text-on-secondary-container">
                      1 Year
                    </Text>
                  </View>
                </View>
                <Text className="font-body text-sm text-on-surface-variant">
                  Calico • Domestic Shorthair
                </Text>
              </View>
            </View>

            {/* Pet Card 3: Small Card Hamster */}
            <View className="bg-surface-container-low rounded-xl p-4 flex-1 flex-col gap-4">
              <View className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  source={{
                    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuANwNpfF9obnp2GtrMtfqzb4wjd9KIaZwVYo_Ue6U3CSFFXejvEhEvpLemmQjqt2DxY6-1WuPgrY3YbDRiI5YAJAzQAtF4X9nQ0sd-x0liG5u-CLi_S_spW9TRYNph0p3CKZxPd2K8datxagtHPakmAfPNGjQ9PaJZLo91YDghCqHYdBH_xk1kAaB3KGXYR_Ba3W3D9bciJRuWYXmZcVK092QuyGU6cn34S0FscE5CgSwW3ebZDJUIowKBNQHoTkpxOZKbknpRO4PCA",
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <TouchableOpacity className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow-sm items-center justify-center">
                  <MaterialIcons name="favorite" size={20} color="#a04223" />
                </TouchableOpacity>
              </View>
              <View className="px-2 pb-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-headline text-xl font-bold text-on-surface">
                    Nugget
                  </Text>
                  <View className="px-2 py-0.5 rounded-md bg-secondary-container">
                    <Text className="text-xs font-semibold text-on-secondary-container">
                      6 Months
                    </Text>
                  </View>
                </View>
                <Text className="font-body text-sm text-on-surface-variant">
                  Syrian Hamster • Gentle
                </Text>
              </View>
            </View>
          </View>

          {/* Pet Card 4: Horizontal Card */}
          <View className="bg-surface-container-highest rounded-xl overflow-hidden mt-2">
            <View className="h-64 relative overflow-hidden">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3ivJRovkLFWZHEkrMZV-gwd_vQa0B9iOjdwx59PLBkyGR9Eft3NwDcv8PcNshxzFqO0sM1QClZeAs-dNB8rNTqx_dcgX_YceJo1sDV-omJrqaIhx5bH0BduFJPbPnLLzDQEiDEIJe1aq92wa2gn4TySzxZ1sdBrQB1Y7bgZbFE5TX_7hC6H9OwjbdB59g-NQ0qcJbhmO2wOJnrr35yIpcI2xXWEIDxcONl-KqFX6H7nkLq3nxLQIyKjSu1WBoQ9ohv0tCpizJntOr",
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity className="absolute top-4 left-4 bg-white/80 p-2 rounded-full items-center justify-center">
                <MaterialIcons name="favorite" size={20} color="#a04223" />
              </TouchableOpacity>
            </View>
            <View className="p-8">
              <View className="flex-row gap-2 mb-4">
                <View className="px-3 py-1 bg-surface-container rounded-full">
                  <Text className="text-primary text-[10px] font-bold uppercase">
                    Active
                  </Text>
                </View>
                <View className="px-3 py-1 bg-surface-container rounded-full">
                  <Text className="text-primary text-[10px] font-bold uppercase">
                    Smart
                  </Text>
                </View>
              </View>
              <Text className="font-headline text-2xl font-bold text-on-surface mb-2">
                Cooper
              </Text>
              <Text className="font-body text-on-surface-variant mb-6 text-sm leading-relaxed">
                A spirited Bichon Frise who loves to play fetch and is
                exceptionally intelligent with new tricks.
              </Text>
              <TouchableOpacity className="flex-row items-center gap-2 mt-auto">
                <Text className="text-primary font-bold text-sm">
                  View details
                </Text>
                <MaterialIcons name="arrow-forward" size={16} color="#a04223" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
