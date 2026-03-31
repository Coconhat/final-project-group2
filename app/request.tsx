import BottomNav from "@/components/BottomNav";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function RequestScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen">
        {/* Header Section */}
        <View className="mb-8 px-2">
          <Text className="font-headline font-extrabold text-3xl text-on-background leading-tight">
            Your Journeys
          </Text>
          <Text className="text-on-surface-variant mt-2 text-sm">
            Stay connected with our sanctuary staff about your future
            companions.
          </Text>
        </View>

        {/* Message List */}
        <View className="space-y-3">
          {/* Thread 1: Active Interview */}
          <TouchableOpacity className="group relative bg-surface-container-low rounded-xl p-5 flex-row items-start gap-4 hover:bg-surface-container-high transition-colors overflow-hidden mb-3">
            <View className="relative flex-shrink-0">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5mOiGbfKzqTgaVsaVtXV_NjEdOl8cIOHjZGvjURwMqWWyv7WXi2QhtX4-FBAMNtkQoSVZfK_lVSk-KOLT-TNBT1EtebdkWSF1yvOgf1xdRG1s4ihLxX4CQ7lQNElxCNlNLy3Sho4b9Vkxb2eYt61dackO-732V5CQ3qiw6pGxl4f_YT-V_rAFGYQuubjvec7UWnRWm29qfUcSy-IcpDWc0vesRmjF3Ddj4GkrCftZa7kbXnwftbWMvJv_nk7BWlszdMjwjlDjtKcL",
                }}
                style={{ width: 64, height: 64 }}
                className="w-16 h-16 rounded-full border-2 border-surface-container-highest"
              />
              <View className="absolute bottom-0 right-0 w-4 h-4 bg-secondary border-2 border-surface-container-low rounded-full" />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className="font-headline font-bold text-lg"
                  numberOfLines={1}
                >
                  Luna
                </Text>
                <Text className="text-xs font-semibold text-on-surface-variant">
                  2h ago
                </Text>
              </View>
              <Text
                className="text-on-surface-variant text-sm mb-3"
                numberOfLines={1}
              >
                Hi! We've reviewed your application and would love to schedule a
                video call.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-secondary-container">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-on-secondary-container">
                    Interview Scheduled
                  </Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-tertiary-container">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-on-tertiary-container">
                    Priority
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Thread 2: In Review */}
          <TouchableOpacity className="group relative bg-surface-container-low rounded-xl p-5 flex-row items-start gap-4 hover:bg-surface-container-high mb-3">
            <View className="relative flex-shrink-0">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDO3FjJI9XxqoNmo-aOwADHHS6zLg_5oyAQa8FtGZx5j2Ho2w3d2o8ct0WiC3tfpNSos_gCOqkF8n5jEFugNVOuqzImTftMhoBaBJ1r7f_mUeV7PBIF-yUilntGSDeudwkq_CabQFmSn9lqEKW9Gts2aGpdwwbfeFSNNBe9Eeffb3gtFW54ZD6fkcaHBfHLHs9NuuhWd36wT9Kz_jGJjtRSq8qUMVfxJX0DYetDWxu5I16npzw4Q5ZKagnEjDsAgIT0vlM97XUtA3L_",
                }}
                style={{ width: 64, height: 64 }}
                className="w-16 h-16 rounded-full border-2 border-surface-container-highest"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className="font-headline font-bold text-lg"
                  numberOfLines={1}
                >
                  Oliver
                </Text>
                <Text className="text-xs font-semibold text-on-surface-variant">
                  Yesterday
                </Text>
              </View>
              <Text
                className="text-on-surface-variant text-sm mb-3"
                numberOfLines={1}
              >
                Thank you for submitting your home photos. Our team is looking
                them over now.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-surface-container-highest">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-on-surface">
                    In Review
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Thread 3: Information Required */}
          <TouchableOpacity className="group relative bg-surface-container-low rounded-xl p-5 flex-row items-start gap-4 hover:bg-surface-container-high mb-3">
            <View className="relative flex-shrink-0">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4xdVvad1huFla6YOC769sZU43hXP_cnafDzNkI7QBqF1LjVxWTvDIU1HdTFAmD4g2sIlLaLUn2na2_qB8_6hRafJqiHuZF0QFn1YLholfE6-6s3V6u9-w3tcBVArFGwwNyQvBClvjNwdQUrQw4ekdzJetCopZS5fHG94Yj-hXt8GSgiwXZUYzEa6wYqJSmJ_Br0PmciUCtsAsFUi7tRQh9j6d2eCpth9WaEu9WPA-aba150PJrEaDelQX8djXkD9eLVBYsMvzB-u_",
                }}
                style={{ width: 64, height: 64 }}
                className="w-16 h-16 rounded-full border-2 border-surface-container-highest"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className="font-headline font-bold text-lg"
                  numberOfLines={1}
                >
                  Cooper
                </Text>
                <Text className="text-xs font-semibold text-on-surface-variant">
                  3d ago
                </Text>
              </View>
              <Text
                className="text-[#fd8863] font-medium text-sm mb-3"
                numberOfLines={1}
              >
                Action required: Please provide your vet's contact information.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-error-container/20 border border-error/20">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-error">
                    Attention Needed
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Thread 4: Historical/Archived */}
          <TouchableOpacity className="group relative bg-surface-container-low/50 opacity-80 rounded-xl p-5 flex-row items-start gap-4 hover:bg-surface-container-high mb-3">
            <View className="relative flex-shrink-0">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCCJFinLbE4JsjaTAjMpFrOwRVTPqWbgADGDJr8zf4NbGiHiYEbXy4XVl-mN3ZBLXd-pc83oYl_LnMweIH9Fg-gZXY2joiofRs3ijYYujZfgLY3Hc3nfhhFJZWgIA6dyK0mehOTmLk3w7OHo0B0TJY56QikkR_mXvr_-cepBXy_qGiUCxBeCkVqDQzHEINhur1xllp7GursCvq-i22rn0gzk68ULxIJ4mizYf5sI6TbmGcMWQy06dnz7wTmpvnyI8NQ950JexGZqdyd",
                }}
                style={{ width: 64, height: 64 }}
                className="w-16 h-16 rounded-full border-2 border-surface-container-highest"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className="font-headline font-bold text-lg"
                  numberOfLines={1}
                >
                  Bella
                </Text>
                <Text className="text-xs font-semibold text-on-surface-variant">
                  May 12
                </Text>
              </View>
              <Text
                className="text-on-surface-variant text-sm mb-3"
                numberOfLines={1}
              >
                We're so glad Bella has settled in so well with your family!
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-secondary/10">
                  <Text className="text-[10px] font-bold tracking-wider uppercase text-secondary">
                    Completed
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Help Card */}
        <View className="mt-12 p-8 bg-tertiary-container rounded-xl relative overflow-hidden group">
          <View className="relative z-10">
            <Text className="font-headline font-bold text-xl text-[#4c3602] mb-2">
              Need help with your request?
            </Text>
            <Text className="text-[#614914] text-sm mb-4 max-w-[240px]">
              Our sanctuary counselors are available 9am - 6pm for any questions
              about the process.
            </Text>
            <TouchableOpacity className="bg-[#fd8863] font-bold px-6 py-2 rounded-full self-start">
              <Text className="text-[#fff7f5] font-bold text-sm">
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>
          <MaterialIcons
            name="support-agent"
            size={120}
            color="rgba(97, 73, 20, 0.1)"
            style={{
              position: "absolute",
              right: -16,
              bottom: -16,
              transform: [{ rotate: "12deg" }],
            }}
          />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}
