import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function PetCardsGrid() {
  return (
    <View className="flex-col gap-6">
      {/* Large Card (Luna) */}
      <View className="bg-surface-container-low rounded-xl overflow-hidden">
        <View className="h-64 relative">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBgL42FsOt7y5vXBsdwXKzhet6W8b6s2lv9JsAsS34SKDu5NM7ii8FwLKLATOsvpEOEyXHKucLwGkSd2qhhluFyXOnr1o3539Hturl-q8aG_xZajvMeK3kwbHJLZUDjPhNNFs96aoVt_-fZPUWcvAxSQPtdGEnrwBnkZDwOUKq8e1-db0XhgHp40zzXnuubmSmEmcgBnP77srYl3W-wYyBuFil2PzigmWv8cnSVydakUteKBzyp2nFwpqNpMNsaIw_XHDHCRDksK2dU",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute top-4 left-4 bg-secondary-container/90 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-on-secondary-container">
              URGENT ADOPTION
            </Text>
          </View>
        </View>
        <View className="p-6">
          <Text className="text-primary font-bold tracking-widest text-xs uppercase mb-2">
            Editor's Choice
          </Text>
          <Text className="text-3xl font-bold mb-2 font-headline text-on-surface">
            Luna
          </Text>
          <Text className="text-on-surface-variant mb-6 leading-relaxed font-body">
            A gentle, senior calico seeking a quiet sunbeam to call her own.
            Perfect for a calm home environment.
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="bg-surface-container-highest px-3 py-1 rounded-md">
              <Text className="text-xs font-medium text-on-surface">
                Calico
              </Text>
            </View>
            <View className="bg-surface-container-highest px-3 py-1 rounded-md">
              <Text className="text-xs font-medium text-on-surface">
                8 Years
              </Text>
            </View>
            <View className="bg-surface-container-highest px-3 py-1 rounded-md">
              <Text className="text-xs font-medium text-on-surface">
                Indoor
              </Text>
            </View>
          </View>
          <TouchableOpacity className="self-start bg-primary px-8 py-3 rounded-full flex-row items-center justify-center">
            <Text className="text-on-primary font-bold text-base">
              Meet Luna
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Standard Card 1 (Cooper) */}
      <View className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <View className="h-64 relative">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVxiH-nRAOQaTxgJaRCO1A-TDjK3JO-mGmAXYJIhlAkGL2KaNZYvgNXDNBDtR4i5KIUT6X4ifNfsJ8qLaHCglKqoO1OLXY4IodSfnANtoTdB9BISP5ngVwerl0ASkjPxUSXQf2PUzIS68uCsSqr_t6Tnl5x_4CF8Jyw_I1IxmwhktdUHcqGQ0dBHuemqlfClBSLVFDL6W6m3LjZEVcHKlbT0n6z6AOIWf3f6kmlJaHRLGKfPsh9XPmlMybvguhkawPDpiiG48EocTl",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute top-4 right-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center">
            <MaterialIcons name="favorite-border" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xl font-bold font-headline text-on-surface">
              Cooper
            </Text>
            <Text className="text-secondary font-bold text-sm">Active</Text>
          </View>
          <Text className="text-on-surface-variant text-sm mb-4 font-body">
            Golden Retriever • 2 Years
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-tertiary-container/40 px-2 py-1 rounded">
              <Text className="text-on-tertiary-container text-[10px] font-bold">
                KIDS FRIENDLY
              </Text>
            </View>
            <View className="bg-secondary-container/40 px-2 py-1 rounded">
              <Text className="text-on-secondary-container text-[10px] font-bold">
                VACCINATED
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Standard Card 2 (Oliver) */}
      <View className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <View className="h-64 relative">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6LGXuQrGF4yIFzkfCaeyl_HnkiYpygOrQkRzT09SmnbEAxhlEDoH1urWc5CF-agiBXowu8jrr-gU6CYWpACLfTFfVotzWT7XNSD9JLOUXNUdOKvYzz9FMK_SqaJUAgabeOff8usAvRSGZ2cgCk91UyQ8KvXfmiDcJ86wsTCT67NYvX1gL5Zbq686ed2Da9l2JOtX2XhoGqDg6F1SgWcc9ARNWtBvEsMbStHPvHwXSzCIc1hNksscESEi8UXqiHILn0kwC48Cjr2EO",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute top-4 right-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center">
            <MaterialIcons name="favorite-border" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xl font-bold font-headline text-on-surface">
              Oliver
            </Text>
            <Text className="text-on-surface-variant font-bold text-sm">
              Quiet
            </Text>
          </View>
          <Text className="text-on-surface-variant text-sm mb-4 font-body">
            Bombay Cat • 4 Years
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-tertiary-container/30 px-2 py-1 rounded">
              <Text className="text-on-tertiary-container text-[10px] font-bold">
                INDEPENDENT
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Standard Card 3 (Bella) */}
      <View className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <View className="h-64 relative">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCe365P6bqUC1Dpcg9dlqTmNHB5fEcvLEAciauXfJs8lDJEGfU7cII3_iJaTgVEJb74wt9cFixWxEa5L6lzQbN1eRfHVFuxkKfvkKfJ8d0326vLdMW4m8bUD5Hw-HxO439Zgo4cLqaT9IlX0pjJGuFa9YLRN9rwfgc8t7jMtX03SjwGquyOff7TYXORykkre1lg-FicQ_Lxv4fIkaHmOiE44_CvFn5oCIp3pQ2uGPCqVmkoOZ-gsCmLEn4sWJPkz136ENkEdmBN6pBe",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute top-4 right-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center">
            <MaterialIcons name="favorite-border" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xl font-bold font-headline text-on-surface">
              Bella
            </Text>
            <Text className="text-secondary font-bold text-sm">Playful</Text>
          </View>
          <Text className="text-on-surface-variant text-sm mb-4 font-body">
            French Bulldog • 1 Year
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-tertiary-container/30 px-2 py-1 rounded">
              <Text className="text-on-tertiary-container text-[10px] font-bold">
                HIGH ENERGY
              </Text>
            </View>
            <View className="bg-secondary-container/30 px-2 py-1 rounded">
              <Text className="text-on-secondary-container text-[10px] font-bold">
                VACCINATED
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Standard Card 4 (Jasper) */}
      <View className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <View className="h-64 relative">
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6eHC1DXIEchE0XntvGFJeugqBoQN2iINHCzNUKVfMAmSiCu_FJZW6zdbL59tOnLcN9rK3fUVJ8sA3T5h0jjKC-ooGF7QYZ7OWpVSKsXGNxJW9Ux2lmklXP_J9X-i6W-qN36kv3uPNcVQJKmxtV1Xwi1GGj6MpLAGU_1wQMyHy5007gy_v7d4F6gQKJBN-CGBxApEdenulTFZwofV3GOoGpRSwQh-l9sqvWGz-gN3NfHNwJtFJ9H7-VJJ_3hoysCjQCsgQBkvAjBbU",
            }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute top-4 right-4 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center">
            <MaterialIcons name="favorite-border" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xl font-bold font-headline text-on-surface">
              Jasper
            </Text>
            <Text className="text-on-surface-variant font-bold text-sm">
              Small
            </Text>
          </View>
          <Text className="text-on-surface-variant text-sm mb-4 font-body">
            Hamster • 6 Months
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-secondary-container/30 px-2 py-1 rounded">
              <Text className="text-on-secondary-container text-[10px] font-bold">
                EASY CARE
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
